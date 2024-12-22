const { onMessagePublished } = require("firebase-functions/v2/pubsub");
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

---
`
  },
  instructions: {
    skillMatching: `
    
    You are an insanely critical and skeptical CEO evaluating how well a candidate's resume matches required hard skills. Follow these steps IN ORDER:

    1. First scan the resume:
       - Confirm you see the resume by showing first 100 characters
       - Make a first pass to identify ALL potential evidence for ANY hard skills
       - For each piece of evidence, note which hard skill(s) it could demonstrate
       - Consider both direct matches and relevant transferable experience

    2. For each hard skill requirement:
       - Find VERBATIM quotes that demonstrate this skill
       - Once a quote is used for one skill, it CANNOT be reused
       - Only use text that appears EXACTLY in the resume
       - Look for both direct evidence and strongly related experience
       - Double-check each quote exists word-for-word in resume

    3. Critical Scoring:
       For EACH individual skill (Score 0-100):
       - Score 90-100: Multiple strong verbatim quotes proving direct experience
       - Score 70-89: One strong verbatim quote showing direct experience
       - Score 50-69: Strong related experience that could transfer
       - Score 30-49: Some relevant experience but needs development
       - Score 1-29: Minimal relevant experience found
       - Score 0: Only if skill is explicitly contradicted or totally absent

       For the TOTAL score (Must be 0-100):
       - Calculate as the WEIGHTED AVERAGE of individual scores
       - Total score MUST be between 0 and 100
       - Do NOT sum individual scores
       - Formula: (sum of all scores) / (number of skills)

    4. Assessment Rules:
       - Each assessment must cite specific resume evidence
       - Consider both direct skills and relevant transferable experience
       - Never rewrite or clean up quotes
       - Never combine multiple resume parts into one quote
       - Credit relevant adjacent experience when direct experience is missing

    IMPORTANT: The totalScore in the output MUST be a single number between 0 and 100, calculated as the average of individual scores.

    Format your response EXACTLY as:
    {
      "hardSkillMatches": [
        {
          "hardSkill": "",
          "assessment": "",
          "score": <number between 0 and 100>
        }
      ],
      "totalScore": <single number between 0 and 100>,
      "summary": ""
    }

    The resume text to search through is:
    """
    {resumeText}
    """
  `
  }
};


// ===== Firestore Service =====
const firestoreService = {
  async getResumeText(firebaseUid) {
    logger.info('Getting resume for user:', firebaseUid);
    
    const userCollectionsRef = db.collection('users').doc(firebaseUid).collection('UserCollections');
    const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
    const resumeSnapshot = await resumeQuery.get();

    if (resumeSnapshot.empty) {
      logger.warn(`No resume found for user ID: ${firebaseUid}. Using placeholder resume.`);
      return CONFIG.defaultValues.placeholderResumeText;
    }

    const resumeDoc = resumeSnapshot.docs[0];
    return resumeDoc.data().extractedText;
  },

  async getJobDocument(firebaseUid, docId) {
    const jobDocRef = this.getJobDocRef(firebaseUid, docId);
    const jobDoc = await jobDocRef.get();

    if (!jobDoc.exists) {
      throw new Error(`No job document found for job ID: ${docId}`);
    }

    return {
      ref: jobDocRef,
      data: jobDoc.data()
    };
  },

  getJobDocRef(firebaseUid, docId) {
    return db
      .collection('users')
      .doc(firebaseUid)
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
    const { firebaseUid, docId } = data;
    if (!firebaseUid || !docId) {
      throw new Error('Missing required fields in message data');
    }
    return { firebaseUid, docId };
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
    if (!parsedContent || typeof parsedContent !== 'object') {
      throw new Error('Invalid content format provided for score validation');
    }
    
    if (!Array.isArray(parsedContent.hardSkillMatches)) {
      throw new Error('Missing hardSkillMatches array');
    }
    
    parsedContent.hardSkillMatches.forEach((match, index) => {
      if (typeof match.score !== 'number') {
        throw new Error(`Invalid score type at index ${index}: ${typeof match.score}`);
      }
      
      if (match.score < 0 || match.score > 100) {
        throw new Error(`Score out of range at index ${index}: ${match.score}`);
      }
    });
    
    if (typeof parsedContent.totalScore !== 'number') {
      throw new Error(`Invalid total score type: ${typeof parsedContent.totalScore}`);
    }
    
    if (parsedContent.totalScore < 0 || parsedContent.totalScore > 100) {
      throw new Error(`Total score out of range: ${parsedContent.totalScore}`);
    }
  },

  formatSkillAssessment(matchResult, originalHardSkills) {
    try {
      // Ensure we're working with an object
      const parsedResult = typeof matchResult === 'string' ? 
        JSON.parse(matchResult) : matchResult;

      // Validate the basic structure
      if (!parsedResult || !Array.isArray(parsedResult.hardSkillMatches)) {
        throw new Error('Invalid match result structure');
      }

      const skillAssessment = {};

      // Map the results to the expected format
      parsedResult.hardSkillMatches.forEach((match, index) => {
        const skillNumber = `HS${index + 1}`;
        
        // Ensure the original skill exists
        if (!originalHardSkills[skillNumber]) {
          throw new Error(`Missing original skill for ${skillNumber}`);
        }

        skillAssessment[skillNumber] = {
          name: originalHardSkills[skillNumber].name,
          description: originalHardSkills[skillNumber].description,
          assessment: match.assessment || '',
          score: Number(match.score) || 0
        };
      });

      // Add the summary scores
      skillAssessment.hardSkillScore = {
        totalScore: Number(parsedResult.totalScore) || 0,
        summary: parsedResult.summary || ''
      };

      return skillAssessment;
    } catch (error) {
      logger.error('Error formatting skill assessment:', error);
      throw new Error(`Failed to format skill assessment: ${error.message}`);
    }
  }
};


// ===== Skills Matching Service =====
const skillsMatchingService = {
  async matchSkills(resumeText, hardSkills) {
    const hardSkillsString = hardSkills
      .map((skill, index) => `Hard Skill ${index + 1}: ${skill.hardSkill}`)
      .join('\n');

    // Replace the placeholder with actual resume text
    const filledPrompt = CONFIG.instructions.skillMatching.replace('{resumeText}', resumeText);

    const instruction = `
      ${filledPrompt}
      These are the Hard Skills I mentioned:
      ${hardSkillsString}
      Now go:
    `;

    try {
      const result = await callOpenAIAPI(resumeText, instruction);
      
      if (result.error) {
        throw new Error(result.message || 'Error calling OpenAI API');
      }

      // First, ensure we have the expected structure
      if (!result || !result.extractedText) {
        throw new Error('Invalid response structure from OpenAI API');
      }

      // Add debug logging to see the raw response
      logger.debug('Raw OpenAI response:', result.extractedText);

      // Handle both string and object responses
      let parsedContent;
      try {
        // If it's a string, attempt to parse it
        if (typeof result.extractedText === 'string') {
          // Trim any whitespace and remove any BOM characters
          const cleanText = result.extractedText.trim().replace(/^\uFEFF/, '');
          
          // Check if the string starts and ends with curly braces
          if (!cleanText.startsWith('{') || !cleanText.endsWith('}')) {
            throw new Error('Response is not in valid JSON format');
          }
          
          parsedContent = JSON.parse(cleanText);
        } else {
          // If it's already an object, use it directly
          parsedContent = result.extractedText;
        }
      } catch (parseError) {
        logger.error('Failed to parse OpenAI response:', result.extractedText);
        logger.error('Parse error:', parseError);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

      // Validate the parsed content structure
      if (!parsedContent || !Array.isArray(parsedContent.hardSkillMatches)) {
        logger.error('Invalid response structure:', parsedContent);
        throw new Error('Invalid response structure: missing hardSkillMatches array');
      }

      // Validate scores
      skillsProcessor.validateScores(parsedContent);
      
      logger.info('Successfully parsed and validated content:', parsedContent);
      return parsedContent;

    } catch (error) {
      logger.error('Error in matchSkills:', error);
      throw new Error(`Skills matching failed: ${error.message}`);
    }
  }
};

// ===== Main Function =====
exports.matchHardSkills = onMessagePublished(
  { topic: CONFIG.topics.hardSkillsExtracted },
  async (event) => {
    try {
      const messageData = (() => {
        try {
          if (!event?.data?.message?.data) {
            throw new Error('Invalid message format received');
          }
          const decodedData = Buffer.from(event.data.message.data, 'base64').toString();
          return JSON.parse(decodedData);
        } catch (error) {
          logger.error('Error parsing message data:', error);
          throw error;
        }
      })();
      const { firebaseUid, docId } = pubSubService.validateMessageData(messageData);

      logger.info(`Processing skills match for firebaseUid: ${firebaseUid}, docId: ${docId}`);

      // Get resume and job data
      const resumeText = await firestoreService.getResumeText(firebaseUid);
      const { ref: jobDocRef, data: jobData } = await firestoreService.getJobDocument(firebaseUid, docId);

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
        { firebaseUid, docId }
      );

      logger.info(`Successfully completed skills matching for docId: ${docId}`);

    } catch (error) {
      logger.error('Processing Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });