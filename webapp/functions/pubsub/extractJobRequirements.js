const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

// ===== Config =====
const CONFIG = {
  topics: {
    jobDescriptionExtracted: 'job-description-extracted',
    requirementsGathered: 'requirements-gathered'
  },
  collections: {
    users: 'users',
    jobs: 'jobs'
  },
  defaultValues: {
    naText: 'na'
  },
  instructions: {
    requirementsExtraction: `Extract the 6 most needed key requirements for this job, dont choose basic, trivial skills (e.g. stakeholder management, find industry and job specific stuff), this should include experience in the industry, education, job specifics, skills. Format each requirement as "Requirement X: Specific requirement", where X is a number from 1 to 6. Ensure there are exactly 6 requirements.

Provide only the list of 6 requirements, one per line, without any additional text or explanations.`
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

  async updateJobRequirements(docRef, requirements) {
    logger.info('Update:', { 
      path: docRef.path,
      fields: ['requirements']
    });

    await docRef.update({ requirements });
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

// ===== Anthropic Service =====
const { callAnthropicAPI } = require('../services/anthropicService');

// ===== Requirements Parser =====
const requirementsParser = {
  parseRequirements(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const requirements = {};

    lines.forEach((line, index) => {
      if (!line.includes(':')) {
        logger.warn(`Malformed requirement line: ${line}`);
        return;
      }
      
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      if (!value) {
        logger.warn(`Empty value for requirement: ${key}`);
        return;
      }
      
      const fieldName = `requirement${index + 1}`;
      requirements[fieldName] = value;
    });

    if (Object.keys(requirements).length === 0) {
      throw new Error('No valid requirements extracted from the response');
    }

    return requirements;
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
exports.extractJobRequirements = onMessagePublished(
  {
    topic: CONFIG.topics.jobDescriptionExtracted,
  },
  async (event) => {
    let docRef;
    const message = event.data;
    try {
      // Parse and validate message
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
      const { googleId, docId } = pubSubService.validateMessageData(messageData);
      logger.info(`Processing requirements for googleId: ${googleId}, docId: ${docId}`);

      // Get Firestore document
      docRef = firestoreService.getDocRef(googleId, docId);
      const jobData = await firestoreService.getJobDocument(docRef);
      
      // Process job requirements
      const extractedText = jobData.texts?.extractedText;
      if (!extractedText || extractedText === CONFIG.defaultValues.naText) {
        throw new Error('Invalid extracted text for processing');
      }

      const apiResponse = await callAnthropicAPI(
        extractedText,
        CONFIG.instructions.requirementsExtraction
      );
      
      if (apiResponse.error) {
        throw new Error(`API Error: ${apiResponse.message}`);
      }

      const requirementsText = apiResponse.extractedText;
      
      // Parse and validate requirements
      const requirements = requirementsParser.parseRequirements(requirementsText);
      
      // Update Firestore
      await firestoreService.updateJobRequirements(docRef, requirements);

      // Publish next message
      await pubSubService.publishMessage(
        CONFIG.topics.requirementsGathered,
        { googleId, docId }
      );

    } catch (error) {
      await errorHandlers.handleProcessingError(error, docRef, { message });
    }
  });