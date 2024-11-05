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
    rawTextStored: 'raw-text-stored',
    jobDescriptionExtracted: 'job-description-extracted'
  },
  collections: {
    users: 'users',
    jobs: 'jobs'
  },
  defaultValues: {
    naText: 'na'
  },
  instructions: {
    jobExtraction: "Extract and faithfully reproduce the entire job posting, including all details about the position, company, and application process. Maintain the original structure, tone, and level of detail. Include the job title, location, salary (if provided), company overview, full list of responsibilities and qualifications (both required and preferred), unique aspects of the role or company, benefits, work environment details, and any specific instructions or encouragement for applicants. Preserve all original phrasing, formatting, and stylistic elements such as questions, exclamations, or creative language. Do not summarize, condense, or omit any information. The goal is to create an exact replica of the original job posting, ensuring all content and nuances are captured."
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

  async updateJobDocument(docRef, extractedText, existingTexts = {}) {
    logger.info('Update:', { 
      path: docRef.path,
      fields: ['texts', 'extractedText']
    });

    await docRef.set({
      texts: {
        ...existingTexts,
        extractedText,
      },
    }, { merge: true });

    logger.info('Updated:', { path: docRef.path });
  },

  async handleError(docRef) {
    logger.warn('Error:', { path: docRef.path });
    await this.updateJobDocument(docRef, CONFIG.defaultValues.naText);
    logger.info('Recovered:', { path: docRef.path });
  }
};

// ===== PubSub Service =====
const pubSubService = {
  parseMessage(message) {
    if (!message.data) {
      throw new Error('No message data received');
    }
    const decodedData = Buffer.from(message.data, 'base64').toString();
    return JSON.parse(decodedData);
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

// ===== API Service =====
const apiService = {
  async processJobDescription(rawText, instruction) {
    if (!rawText || rawText === "na") {
      throw new Error('Invalid raw text for processing');
    }
    const result = await callAnthropicAPI(rawText, instruction);
    if (result.error) {
      throw new Error(`API Error: ${result.message}`);
    }
    return result.extractedText;
  }
};

// ===== Error Handlers =====
const errorHandlers = {
  async handleProcessingError(error, docRef, context = {}) {
    logger.error('Processing Error:', error, context);
    if (docRef) {
      await firestoreService.handleError(docRef);
    }
  },

  handleAndThrow(error, message) {
    logger.error(message, error);
    throw error;
  }
};

// ===== Main Function =====
exports.extractJobDescription = functions.pubsub
  .topic(CONFIG.topics.rawTextStored)
  .onPublish(async (message) => {
    let docRef;
    try {
      // Parse and validate message
      const messageData = pubSubService.parseMessage(message);
      const { googleId, docId } = pubSubService.validateMessageData(messageData);
      logger.info(`Processing job for googleId: ${googleId}, docId: ${docId}`);

      // Get Firestore document
      docRef = firestoreService.getDocRef(googleId, docId);
      const jobData = await firestoreService.getJobDocument(docRef);
      
      // Process job description
      const rawJD = jobData.texts?.rawText || "na";
      const extractedText = await apiService.processJobDescription(
        rawJD, 
        CONFIG.instructions.jobExtraction
      );
      
      // Update Firestore
      await firestoreService.updateJobDocument(docRef, extractedText, jobData.texts);

      // Publish next message
      await pubSubService.publishMessage(
        CONFIG.topics.jobDescriptionExtracted,
        { googleId, docId }
      );

    } catch (error) {
      await errorHandlers.handleProcessingError(error, docRef, { message });
    }
  });