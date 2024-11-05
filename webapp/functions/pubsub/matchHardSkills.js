const functions = require('firebase-functions');
const admin = require('firebase-admin');
const logger = require("firebase-functions/logger");
require('dotenv').config();
const OpenAI = require('openai');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

// Initialize
const openai = new OpenAI();
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
  openai: {
    model: "gpt-4o-mini"
  },
  defaultValues: {
    placeholderResumeText: `
---
Los Angeles | www.konkaiser.com | Greencard-Holder | konkaiser@gmail.com | LinkedIn | (925) 860 3801  
[... Resume content truncated for brevity ...]
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

// ===== OpenAI Service =====
const openAiService = {
  validateApiKey() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }
    return apiKey;
  },

  getHardSkillMatchingSchema() {
    return z.object({
      hardSkillMatches: z.array(
        z.object({
          hardSkill: z.string(),
          assessment: z.string(),
          score: z.number(),
        })
      ),
      totalScore: z.number(),
      summary: z.string(),
    });
  },

  async matchSkills(resumeText, hardSkills) {
    this.validateApiKey();

    const hardSkillsString = hardSkills
      .map((skill, index) => `Hard Skill ${index + 1}: ${skill.hardSkill}`)
      .join('\n');

    const promptContent = `
      ${CONFIG.instructions.skillMatching}
      These are the Hard Skills I mentioned:
      ${hardSkillsString}
      These are the qualifications:
      ${resumeText}
      Now go:
    `;

    try {
      const completion = await openai.beta.chat.completions.parse({
        model: CONFIG.openai.model,
        messages: [
          { role: "system", content: "You are an expert at structured data extraction." },
          { role: "user", content: promptContent },
        ],
        response_format: zodResponseFormat(
          this.getHardSkillMatchingSchema(),
          "hard_skill_matching"
        ),
      });

      const parsedContent = completion.choices[0].message.parsed;
      this.validateScores(parsedContent);
      
      logger.info('Parsed content:', parsedContent);
      return parsedContent;

    } catch (error) {
      logger.error('Error calling OpenAI API:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error calling OpenAI API',
        { message: error.message }
      );
    }
  },

  validateScores(parsedContent) {
    parsedContent.hardSkillMatches.forEach((match) => {
      if (match.score < 0 || match.score > 100) {
        throw new Error(`Score out of range: ${match.score}`);
      }
    });
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
    const skillAssessment = {};

    matchResult.hardSkillMatches.forEach((match, index) => {
      const skillNumber = `HS${index + 1}`;
      
      skillAssessment[skillNumber] = {
        name: originalHardSkills[skillNumber].name,
        description: originalHardSkills[skillNumber].description,
        assessment: match.assessment,
        score: match.score
      };
    });

    skillAssessment.hardSkillScore = {
      totalScore: matchResult.totalScore,
      summary: matchResult.summary
    };

    return skillAssessment;
  }
};

// ===== Error Handlers =====
const errorHandlers = {
  handleProcessingError(error, context = {}) {
    logger.error('Processing Error:', error, context);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    } else {
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
};

// ===== Main Function =====
exports.matchHardSkills = functions.pubsub
  .topic(CONFIG.topics.hardSkillsExtracted)
  .onPublish(async (message) => {
    try {
      // Parse message
      const messageData = message.data ? 
        JSON.parse(Buffer.from(message.data, 'base64').toString()) :
        {};

      const { googleId, docId } = messageData;
      if (!docId || !googleId) {
        throw new Error('Missing docId or googleId');
      }

      logger.info(`Processing skills match for googleId: ${googleId}, docId: ${docId}`);

      // Get resume and job data
      const resumeText = await firestoreService.getResumeText(googleId);
      const { ref: jobDocRef, data: jobData } = await firestoreService.getJobDocument(googleId, docId);

      // Process hard skills
      const hardSkillsArray = skillsProcessor.extractHardSkillsArray(jobData.SkillAssessment?.Hardskills);
      const matchResult = await openAiService.matchSkills(resumeText, hardSkillsArray);

      // Format and update results
      const skillAssessment = skillsProcessor.formatSkillAssessment(
        matchResult,
        jobData.SkillAssessment.Hardskills
      );
      
      await firestoreService.updateSkillAssessment(jobDocRef, skillAssessment);

    } catch (error) {
      errorHandlers.handleProcessingError(error, { message });
    }
  });