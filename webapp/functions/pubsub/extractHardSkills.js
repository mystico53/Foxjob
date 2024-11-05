const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const { callAnthropicAPI } = require('../services/anthropicService');

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

// ===== Config =====
const CONFIG = {
  topics: {
    jobDescriptionExtracted: 'job-description-extracted',
    hardSkillsExtracted: 'hard-skills-extracted'
  },
  collections: {
    users: 'users',
    jobs: 'jobs'
  },
  defaultValues: {
    naText: 'na'
  },
  instructions: {
    hardSkillsExtraction: `Extract the 5 most important hard skills from this job description in descending order. Use the job description to analyze if each of these skills are *required* or *preferred*. As a reminder: Hard skills are job-specific abilities learned through formal education or training, such as programming, project management, and statistics. These skills are quantifiable, often certifiable, and can be tested or demonstrated. Do ***NOT*** include either softskills or domain expertise (you will do that in another step). Soft skills are interpersonal traits that affect how people work together, like communication and teamwork. Domain expertise is deep knowledge in a specific field that must be gained through experience.

Format your response as a JSON object with the following structure:

{
  "Hardskills": {
    "Skillname1": "most important hard skill: one short sentence description of this skill (required or preferred?)",
    "Skillname2": "second most important hard skill: one short sentence description of this skill (required or preferred?)",
    "Skillname3": "third most important hard skill: one short sentence description of this skill (required or preferred?)",
    "Skillname4": "fourth most important hard skill: one short sentence description of this skill (required or preferred?)",
    "Skillname5": "fifth most important hard skill: one short sentence description of this skill (required or preferred?)"
  }
}

The skill name should be a single word. The description should be one short sentence followed by whether it's required or preferred in parentheses.

Provide only the JSON response without any additional text or explanations.`
  }
};

// ===== Firestore Service =====
const firestoreService = {
  getDocRef(googleId, docId) {
    const path = `users/${googleId}/jobs/${docId}`;
    logger.info('DocRef:', { path });
    return db.collection('users')
      .doc(googleId)
      .collection('jobs')
      .doc(docId);
  },

  async getJobDocument(docRef) {
    logger.info('Get:', { path: docRef.path });
    
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      logger.warn('404:', { path: docRef.path });
      throw new Error(`Document not found: ${docRef.path}`);
    }

    const data = snapshot.data();
    logger.info('Found:', { 
      path: docRef.path,
      fields: Object.keys(data || {})
    });

    return data;
  },

  async updateHardSkills(docRef, hardSkills) {
    logger.info('Update:', { 
      path: docRef.path,
      fields: ['SkillAssessment.Hardskills']
    });

    await docRef.update({
      'SkillAssessment.Hardskills': hardSkills
    });

    logger.info('Updated:', { path: docRef.path });
  }
};

// ===== PubSub Service =====
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

// ===== Skills Parser =====
const skillsParser = {
  validateAnalysisResult(result) {
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid analysis result: not an object');
    }

    if (!result.Hardskills || typeof result.Hardskills !== 'object') {
      throw new Error('Hardskills field is missing or invalid in analysis result');
    }

    return result;
  },

  parseSkills(docId, analysisResult) {
    const hardSkills = {};

    Object.entries(analysisResult.Hardskills).forEach(([key, value], index) => {
      const skillNumber = `HS${index + 1}`;
      let skillName = key.trim();

      // Check if the key has a numerical prefix
      const match = key.match(/^\d+\.\s*(.+)$/);
      if (match && match[1]) {
        skillName = match[1].trim();
      }

      // Validate skillName and value
      if (!skillName) {
        logger.error(`Skill name is undefined or empty for key: "${key}"`);
        return;
      }

      if (typeof value !== 'string' || value.trim() === '') {
        logger.error(`Description is invalid for skill: "${skillName}"`);
        return;
      }

      if (!hardSkills[skillNumber]) {
        hardSkills[skillNumber] = {
          name: skillName,
          description: value.trim()
        };
      }
    });

    if (Object.keys(hardSkills).length === 0) {
      throw new Error('No valid skills were parsed from the analysis result');
    }

    return hardSkills;
  }
};

// ===== Error Handlers =====
const errorHandlers = {
  async handleProcessingError(error, docRef, context = {}) {
    logger.error('Processing Error:', error, context);
    throw error;
  },

  handleAndThrow(error, message) {
    logger.error(message, error);
    throw error;
  }
};

// ===== Main Function =====
exports.extractHardSkills = functions.pubsub
  .topic(CONFIG.topics.jobDescriptionExtracted)
  .onPublish(async (message) => {
    let docRef;
    try {
      // Parse and validate message
      const messageData = pubSubService.parseMessage(message);
      const { googleId, docId } = pubSubService.validateMessageData(messageData);
      logger.info(`Processing hard skills for googleId: ${googleId}, docId: ${docId}`);

      // Get Firestore document
      docRef = firestoreService.getDocRef(googleId, docId);
      const jobData = await firestoreService.getJobDocument(docRef);
      
      // Process hard skills
      const extractedText = jobData.texts?.extractedText;
      if (!extractedText || extractedText === CONFIG.defaultValues.naText) {
        throw new Error('Invalid extracted text for processing');
      }

      // Call Anthropic API
      const apiResponse = await callAnthropicAPI(
        extractedText,
        CONFIG.instructions.hardSkillsExtraction
      );
      
      if (apiResponse.error) {
        throw new Error(`API Error: ${apiResponse.message}`);
      }

      // Parse API response
      const analysisResult = JSON.parse(apiResponse.extractedText);
      skillsParser.validateAnalysisResult(analysisResult);
      
      // Parse and structure hard skills
      const hardSkills = skillsParser.parseSkills(docId, analysisResult);
      
      // Update Firestore
      await firestoreService.updateHardSkills(docRef, hardSkills);

      // Publish next message
      await pubSubService.publishMessage(
        CONFIG.topics.hardSkillsExtracted,
        { googleId, docId }
      );

    } catch (error) {
      await errorHandlers.handleProcessingError(error, docRef, { message });
    }
  });