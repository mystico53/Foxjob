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
    jobDescriptionExtracted: 'job-description-extracted-v2',
    qualitiesGathered: '10-qualities-gathered'
  },
  collections: {
    users: 'users',
    jobs: 'jobs'
  },
  defaultValues: {
    naText: 'na'
  },
  instructions: {
    qualitiesExtraction: `Using the 'Count and Context' method, identify and list the 10 most crucial qualities for this position by analyzing:

Frequency: How often each qualities/skill appears throughout the description
Placement: Special attention to qualities mentioned in the opening paragraphs or job summary
Context: How the skill is discussed (e.g., 'essential,' 'required,' 'must-have' vs 'preferred' or 'nice-to-have')

Focus on industry-specific technical skills, experience, and qualifications rather than generic soft skills. Present each finding in this format:
Format each quality as "Quality X: Specific quality", where X is a number from 1 to 10. Ensure there are exactly 10 qualities. Provide only the list of 10 qualities, one per line, without any additional text or explanations.
List exactly 10 qualities, ordered by their apparent importance based on frequency and prominence in the text.`
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

  async updateJobQualities(docRef, qualities) {
    logger.info('Update:', { 
      path: docRef.path,
      fields: ['qualities']
    });

    await docRef.update({ qualities });
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

// ===== Qualities Parser =====
const qualitiesParser = {
  parseQualities(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const qualities = {};

    lines.forEach((line, index) => {
      if (!line.includes(':')) {
        logger.warn(`Malformed quality line: ${line}`);
        return;
      }
      
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      if (!value) {
        logger.warn(`Empty value for quality: ${key}`);
        return;
      }
      
      const fieldName = `quality${index + 1}`;
      qualities[fieldName] = value;
    });

    if (Object.keys(qualities).length === 0) {
      throw new Error('No valid qualities extracted from the response');
    }

    return qualities;
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
exports.extractJobQualities = onMessagePublished(
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
      logger.info(`Processing qualities for googleId: ${googleId}, docId: ${docId}`);

      // Get Firestore document
      docRef = firestoreService.getDocRef(googleId, docId);
      const jobData = await firestoreService.getJobDocument(docRef);
      
      // Process job qualities
      const extractedText = jobData.texts?.extractedText;
      if (!extractedText || extractedText === CONFIG.defaultValues.naText) {
        throw new Error('Invalid extracted text for processing');
      }

      const apiResponse = await callAnthropicAPI(
        extractedText,
        CONFIG.instructions.qualitiesExtraction
      );
      
      if (apiResponse.error) {
        throw new Error(`API Error: ${apiResponse.message}`);
      }

      const qualitiesText = apiResponse.extractedText;
      
      // Parse and validate qualities
      const qualities = qualitiesParser.parseQualities(qualitiesText);
      
      // Update Firestore
      await firestoreService.updateJobQualities(docRef, qualities);

      // Publish next message
      await pubSubService.publishMessage(
        CONFIG.topics.qualitiesGathered,
        { googleId, docId }
      );

    } catch (error) {
      await errorHandlers.handleProcessingError(error, docRef, { message });
    }
  });