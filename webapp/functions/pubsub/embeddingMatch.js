const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { OpenAI } = require('openai');
const { z } = require('zod');

// Initialize
const db = admin.firestore();

// ===== Config =====
const CONFIG = {
    topics: {
      jobDescriptionExtracted: 'job-description-extracted',
      matchingCompleted: 'matching-completed'
    },
    matching: {
      similarityThreshold: 0.75,
      embeddingModel: 'text-embedding-ada-002'
    }
  };

// ===== Schema Definition =====
const matchResultSchema = z.object({
    score: z.number(),
    timestamp: z.date(),
    matchDetails: z.object({
      similarityScore: z.number(),
      keySkillMatches: z.array(z.string()),
      recommendations: z.string()
    })
  });
// ===== Firestore Service =====
const firestoreService = {
    async getResumeText(googleId) {
        try {
          // Retrieve the user's resume
          const userCollectionsRef = db.collection('users').doc(googleId).collection('UserCollections');
          const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
          const resumeSnapshot = await resumeQuery.get();
    
          let resumeText;
          if (resumeSnapshot.empty) {
            logger.warn(`No resume found for user ID: ${googleId}. Using placeholder resume.`);
            resumeText = placeholderResumeText;
          } else {
            const resumeDoc = resumeSnapshot.docs[0];
            resumeText = resumeDoc.data().extractedText;
          }
    
          return resumeText;
        } catch (error) {
          logger.error('Error getting resume:', error);
          throw error;
        }
      },

  async getJobText(googleId, docId) {
    try {
      const jobDoc = await db.collection('users')
        .doc(googleId)
        .collection('jobs')
        .doc(docId)
        .get();

      if (!jobDoc.exists) {
        throw new Error(`Job document not found: ${docId}`);
      }

      const jobData = jobDoc.data();
      
      if (!jobData.texts?.extractedText) {
        throw new Error('Job exists but no extracted text found');
      }

      return jobData.texts.extractedText;
    } catch (error) {
      logger.error('Error getting job text:', error);
      throw error;
    }
  },

  async saveMatchResult(googleId, docId, matchResult) {
    try {
      await db.collection('users')
        .doc(googleId)
        .collection('jobs')
        .doc(docId)
        .set({
          embedding: {
            score: matchResult.score,
            details: matchResult.matchDetails
          }
        }, { merge: true });
      
      logger.info('Embedding result saved:', { 
        googleId,
        docId,
        score: matchResult.score,
        path: `users/${googleId}/jobs/${docId}/embedding`
      });
    } catch (error) {
      logger.error('Error saving embedding result:', error);
      throw error;
    }
  }
};

// ===== Embedding Service =====
const embeddingService = {
  openai: null,

  initialize() {
    const apiKey = process.env.OPENAI_API_KEY || functions.config().openai.api_key;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    this.openai = new OpenAI({ apiKey });
  },

  async getEmbedding(text) {
    if (!this.openai) this.initialize();

    const response = await this.openai.embeddings.create({
      model: CONFIG.matching.embeddingModel,
      input: this.preprocessText(text),
    });

    return response.data[0].embedding;
  },

  preprocessText(text) {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  },

  calculateSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
};

// ===== Matching Service =====
const matchingService = {
  async processMatch(jobText, resumeText) {
    try {
      // Get embeddings
      const [jobEmbedding, resumeEmbedding] = await Promise.all([
        embeddingService.getEmbedding(jobText),
        embeddingService.getEmbedding(resumeText)
      ]);

      // Calculate similarity
      const similarityScore = embeddingService.calculateSimilarity(
        jobEmbedding, 
        resumeEmbedding
      );

      // Normalize to 0-100 scale
      const score = Math.round(similarityScore * 100);

      return matchResultSchema.parse({
        score,
        timestamp: new Date(),
        matchDetails: {
          similarityScore,
          keySkillMatches: [], // Could be enhanced with skill extraction
          recommendations: this.generateRecommendations(score)
        }
      });
    } catch (error) {
      logger.error('Error processing match:', error);
      throw error;
    }
  },

  generateRecommendations(score) {
    if (score > 85) return "Strong match! Consider applying immediately.";
    if (score > 70) return "Good match. Review specific requirements before applying.";
    return "Consider enhancing resume to better match job requirements.";
  }
};

// ===== Main Function =====
exports.embeddingMatch = functions.pubsub
  .topic(CONFIG.topics.jobDescriptionExtracted)
  .onPublish(async (message) => {
    try {
      // Parse message data
      const decodedData = Buffer.from(message.data, 'base64').toString();
      const { googleId, docId } = JSON.parse(decodedData);
      
      logger.info('Starting match processing', { googleId, docId });

      // Get texts
      const [jobText, resumeText] = await Promise.all([
        firestoreService.getJobText(googleId, docId),
        firestoreService.getResumeText(googleId)
      ]);

      // Process match
      const matchResult = await matchingService.processMatch(jobText, resumeText);

      // Save results
      await firestoreService.saveMatchResult(googleId, docId, matchResult);

      logger.info('Match processing completed', {
        googleId,
        docId,
        score: matchResult.score
      });

    } catch (error) {
      logger.error('Error in match processing:', error, {
        messageData: message.data,
      });
      throw error; // Allow Cloud Functions to handle retry
    }
  });

  const placeholderResumeText = `
---
Los Angeles | www.konkaiser.com | Greencard-Holder | konkaiser@gmail.com | LinkedIn | (925) 860 3801  
Summary 
Senior Product Manager with ten years of experience conceiving, building, and scaling three award-winning 
educational software products from 0 to 100,000+ paying students. I hired and managed three cross-functional 
teams with up to 15 reports on a day-to-day basis. 
Experience 
Freewire Technologies, USA, CA, Oakland (IoT SaaS-Platform for EV Charging) Jan 2023 – Jan 2024 
Senior Product Manager 
• Increased the Net Promoter Score of our SaaS platform by 15 percentage points (as measured in customer 
surveys), cutting its clickstream complexity by 60%, by facilitating a design thinking process with Customer 
Success and Sales Teams, directing enginnering teams in Mexico and India to ensure quality in the UI overhaul.  
• Accelerated feature release intervals from bi-annual to monthly by implementing agile JIRA workflows for 40 
engineers and five PMs, and developed and facilitated five multiplayer Figjam workshops with them and the VP 
of Software to ensure acceptance and adoption. 
• Instigated and architected a "single source of truth" database system to store and operate all device related 
data. Reduced the number of activation and maintenance errors by 15% by unifying nine disparate databases 
and spreadsheets across manufacturing, customer success and field service teams. 
planpolitik, Germany, Berlin (the largest civic training company in Europe) Jan 2012 – Dec 2022 
Head of Department, Online Education Services 
• Enabled my company to scale its business model by digitizing their in-person workshops, creating a new market 
for civic education online. I developed a vision and a go-to-market strategy and built a department that doubled 
my company's overall revenue within six years. 
• Created Senaryon, Europe's first SaaS platform for civic simulation games, by hiring and directing the company's 
first Software Engineer and Product Designer to develop and test an MVP within three months, selling the engine 
to 50+ governmental bodies, 2,500+ schools, and 250+ universities, reaching 50,000 students. 
• Initiated, built, and launched two novel educational software products (EU-Lab, Junait) by hiring and directing 
three cross-functional teams (Software Engineering, UX/UI, Instructional Design, Customer Support) through all 
steps of the development cycle, growing them from 0 to 25,000+ users. 
Senior Product Manager 
• Increased students' learning outcomes by 35% through collaborating closely with UX Researchers at the 
University of Göttingen (Germany) and UX Designers at the University of Arts Berlin (Germany). 
• Reached 40,000 additional users by pivoting from universities to high schools, introducing a mobile-friendly 
design system, real-time grading system and shorter game formats. 
Teacher, Presenter, Thought Leader 
• Created 10+ training formats and facilitated them with more than 30,000 students in-person, visiting 300+ 
schools and 50+ universities in eight countries. 
• Spoke at 30 national and international conferences and published four (1, 2, 3, 4) peer-reviewed articles on 
challenges and success factors for online collaboration. 
Education 
• MA (2011, GPA: 3.7) and BA (2008, GPA: 4.0) Politcal Science at the Free University of Berlin, Germany. 
• Harvard Computer Science 50 (Certificate), proficient in SQL Data Analysis, Backend Modeling and APIs as well as 
Frontend Frameworks and Wireframing. 
Extracurriculars 
• Won two international and four national awards for creating innovative education technology (such as the 
Games4Change Award, New York, $10,000 for first place amongst 190 submissions, and the United Nations 
PeaceApp-Award, Cyprus, $5,000 for first place amongst 100 submissions). 
---
`;