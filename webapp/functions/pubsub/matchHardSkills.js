const functions = require('firebase-functions');
const admin = require('firebase-admin');
const logger = require("firebase-functions/logger");
require('dotenv').config();
const { callOpenAIAPI } = require('../services/openaiService');  // Import just the function we need
const { PubSub } = require('@google-cloud/pubsub');
const pubSubClient = new PubSub();

// Initialize
const db = admin.firestore();

// ===== Config =====
const CONFIG = {
  topics: {
    hardSkillsExtracted: 'hard-skills-extracted',
    hardSkillsMatched: 'hard-skills-matched'
  },
  collections: {
    users: 'users',
    jobs: 'jobs'
  },
  defaultValues: {
    placeholderResumeText: `
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
• Instigated and architected a “single source of truth” database system to store and operate all device related 
data. Reduced the number of activation and maintenance errors by 15% by unifying nine disparate databases 
and spreadsheets across manufacturing, customer success and field service teams. 
planpolitik, Germany, Berlin (the largest civic training company in Europe) Jan 2012 – Dec 2022 
Head of Department, Online Education Services 
• Enabled my company to scale its business model by digitizing their in-person workshops, creating a new market 
for civic education online. I developed a vision and a go-to-market strategy and built a department that doubled 
my company's overall revenue within six years. 
• Created Senaryon, Europe’s first SaaS platform for civic simulation games, by hiring and directing the company’s 
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
`
  },
  instructions: {
    skillMatching: `
    You are an insanely critical and skeptical CEO of the company that has one job to offer for the first time in 10 years. You're tasked with evaluating how well a resume matches a set of hard skills. Your task is to:
    1) For each of the given hard skills, critically analyze the candidate's hard skills. Provide a one-sentence assessment that references specific evidence from the resume, highlighting both strengths and gaps.
    2) Assign an individual score between 1 - 100 to each hard skill, be very critical. your companies future relies on it.
    3) Calculate a total score (1 - 100), giving a critical assessment on the qualifications meeting the requirements.
  
    4) Write a short summary (maximum 15 words) highlighting the biggest strength and weakness, using the format: "Your experience in [area] is [assessment], but [area] is [assessment]."
    
    Format your response as a JSON object with the following structure:
    {
      "hardSkillMatches": [
        {
          "hardSkill": "",
          "assessment": "",
          "score": 0
        },
        // Continue for all hardskills
      ],
      "totalScore": 0,
      "summary": ""
    }
  `
  }
};


// ===== Firestore Service =====
const firestoreService = {
  async getResumeText(googleId) {
    logger.info('Getting resume for user:', googleId);
    
    const userCollectionsRef = db.collection('users').doc(googleId).collection('UserCollections');
    const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
    const resumeSnapshot = await resumeQuery.get();

    if (resumeSnapshot.empty) {
      logger.warn(`No resume found for user ID: ${googleId}. Using placeholder resume.`);
      return CONFIG.defaultValues.placeholderResumeText;
    }

    const resumeDoc = resumeSnapshot.docs[0];
    return resumeDoc.data().extractedText;
  },

  async getJobDocument(googleId, docId) {
    const jobDocRef = this.getJobDocRef(googleId, docId);
    const jobDoc = await jobDocRef.get();

    if (!jobDoc.exists) {
      throw new Error(`No job document found for job ID: ${docId}`);
    }

    return {
      ref: jobDocRef,
      data: jobDoc.data()
    };
  },

  getJobDocRef(googleId, docId) {
    return db
      .collection('users')
      .doc(googleId)
      .collection('jobs')
      .doc(docId);
  },

  async updateSkillAssessment(docRef, skillAssessment) {
    await docRef.update({
      'SkillAssessment.Hardskills': skillAssessment,
      'generalData.processingStatus': 'processing'
    });
    logger.info('Updated SkillAssessment in Firestore:', skillAssessment);
  }
};

const pubSubService = {
  parseMessage(message) {
    if (!message.data) {
      throw new Error('No message data received');
    }
    const data = message.json;
    if (!data) {
      throw new Error('Invalid JSON in message data');
    }
    return data;
  },

  validateMessageData(data) {
    const { googleId, docId } = data;
    if (!googleId || !docId) {
      throw new Error('Missing required fields in message data');
    }
    return { googleId, docId };
  },

  async ensureTopicExists(topicName) {
    try {
      await pubSubClient.createTopic(topicName);
    } catch (err) {
      if (err.code !== 6) { // 6 = already exists
        throw err;
      }
    }
  },

  async publishMessage(topicName, message) {
    await this.ensureTopicExists(topicName);
    const messageId = await pubSubClient
      .topic(topicName)
      .publishMessage({
        data: Buffer.from(JSON.stringify(message)),
      });
    logger.info(`Message ${messageId} published to ${topicName}`);
    return messageId;
  }
};

// ===== Skills Processor =====
const skillsProcessor = {
  extractHardSkillsArray(hardSkills) {
    if (!hardSkills || Object.keys(hardSkills).length === 0) {
      throw new Error('No hard skills found');
    }

    return Object.entries(hardSkills).map(([key, skill]) => ({
      key: key,
      hardSkill: `${skill.name}: ${skill.description}`
    }));
  },

  formatSkillAssessment(matchResult, originalHardSkills) {
    try {
      const parsedResult = typeof matchResult === 'string' ? 
        JSON.parse(matchResult) : matchResult;

      const skillAssessment = {};

      parsedResult.hardSkillMatches.forEach((match, index) => {
        const skillNumber = `HS${index + 1}`;
        
        skillAssessment[skillNumber] = {
          name: originalHardSkills[skillNumber].name,
          description: originalHardSkills[skillNumber].description,
          assessment: match.assessment,
          score: match.score
        };
      });

      skillAssessment.hardSkillScore = {
        totalScore: parsedResult.totalScore,
        summary: parsedResult.summary
      };

      return skillAssessment;
    } catch (error) {
      logger.error('Error formatting skill assessment:', error);
      throw new Error('Failed to format skill assessment: ' + error.message);
    }
  },

  validateScores(parsedContent) {
    if (typeof parsedContent === 'string') {
      parsedContent = JSON.parse(parsedContent);
    }
    
    parsedContent.hardSkillMatches.forEach((match) => {
      if (match.score < 0 || match.score > 100) {
        throw new Error(`Score out of range: ${match.score}`);
      }
    });
    
    if (parsedContent.totalScore < 0 || parsedContent.totalScore > 100) {
      throw new Error(`Total score out of range: ${parsedContent.totalScore}`);
    }
  }
};


// ===== Skills Matching Service =====
const skillsMatchingService = {
  async matchSkills(resumeText, hardSkills) {
    const hardSkillsString = hardSkills
      .map((skill, index) => `Hard Skill ${index + 1}: ${skill.hardSkill}`)
      .join('\n');

    const instruction = `
      ${CONFIG.instructions.skillMatching}
      These are the Hard Skills I mentioned:
      ${hardSkillsString}
      Now go:
    `;

    try {
      const result = await callOpenAIAPI(resumeText, instruction);
      
      if (result.error) {
        throw new Error(result.message || 'Error calling OpenAI API');
      }

      // The response might already be an object or a JSON string
      let parsedContent;
      if (typeof result.extractedText === 'string') {
        try {
          parsedContent = JSON.parse(result.extractedText);
        } catch (parseError) {
          logger.error('Failed to parse response as JSON:', result.extractedText);
          throw new Error('Invalid JSON response: ' + parseError.message);
        }
      } else {
        // If it's already an object, use it directly
        parsedContent = result.extractedText;
      }

      // Validate the parsed content structure
      if (!parsedContent || !Array.isArray(parsedContent.hardSkillMatches)) {
        logger.error('Invalid response structure:', parsedContent);
        throw new Error('Invalid response structure: missing hardSkillMatches array');
      }

      skillsProcessor.validateScores(parsedContent);
      
      logger.info('Parsed content:', parsedContent);
      return parsedContent;

    } catch (error) {
      logger.error('Error in matchSkills:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error matching skills',
        { message: error.message }
      );
    }
  }
};

// ===== Main Function =====
exports.matchHardSkills = functions.pubsub
  .topic(CONFIG.topics.hardSkillsExtracted)
  .onPublish(async (message) => {
    try {
      // Parse message using pubSubService instead of manual parsing
      const messageData = pubSubService.parseMessage(message);
      const { googleId, docId } = pubSubService.validateMessageData(messageData);

      logger.info(`Processing skills match for googleId: ${googleId}, docId: ${docId}`);

      // Get resume and job data
      const resumeText = await firestoreService.getResumeText(googleId);
      const { ref: jobDocRef, data: jobData } = await firestoreService.getJobDocument(googleId, docId);

      // Process hard skills
      const hardSkillsArray = skillsProcessor.extractHardSkillsArray(jobData.SkillAssessment?.Hardskills);
      const matchResult = await skillsMatchingService.matchSkills(resumeText, hardSkillsArray);

      // Format and update results
      const skillAssessment = skillsProcessor.formatSkillAssessment(
        matchResult,
        jobData.SkillAssessment.Hardskills
      );
      
      await firestoreService.updateSkillAssessment(jobDocRef, skillAssessment);

      // Publish to next topic using pubSubService
      await pubSubService.publishMessage(
        CONFIG.topics.hardSkillsMatched,
        { googleId, docId }
      );

      logger.info(`Successfully completed skills matching for docId: ${docId}`);

    } catch (error) {
      logger.error('Processing Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });