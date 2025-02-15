const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const { FieldValue } = require("firebase-admin/firestore");

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

// ===== Config =====
const CONFIG = {
  topics: {
    qualityExtractionRequests: 'quality-extraction-requests',
    qualitiesGathered: 'ten-qualities-gathered'
  },
  collections: {
    users: 'users',
    scrapedJobs: 'scrapedJobs'
  },
  defaultValues: {
    naText: 'na'
  },
  instructions: {
    qualitiesExtraction: `Using the 'Count, Context, and Criticality' method, analyze the job description to identify exactly 7 crucial qualities. For each quality, combine all information into a single, comprehensive description using this exact format:

Quality X: [Primary Skill/Requirement] | Criticality: [X/10] | Evidence: [Key quotes from text, can be more than one]

Rules:
1. Provide EXACTLY 7 qualities
2. Each quality must be in a single line/field
3. Include all components (Criticality, Evidence) for each quality
4. Number qualities from 1-7 based on importance
5. Use the pipe symbol (|) to separate different components
6. Ensure each quality description is complete in a single field

Evaluation weights:
- Criticality (40%): Must-have vs nice-to-have language
- Frequency (30%): Number of mentions and references
- Evidence (30%): Placement and emphasis in description

Present the analysis as 7 consecutive quality fields, each containing the complete information about one quality. No additional text or explanations should be included.`
  }
};

// ===== Firestore Service =====
const firestoreService = {
  getDocRef(userId, jobId) {
    return db.collection('users')
      .doc(userId)
      .collection('scrapedJobs')
      .doc(jobId);
  },

  async getJobDocument(docRef) {
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      logger.warn('404:', { path: docRef.path });
      throw new Error(`Document not found: ${docRef.path}`);
    }

    const data = snapshot.data();
    return data;
  },

  async updateJobQualities(docRef, qualities) {
    await docRef.update({
      qualities: qualities,
      'processing.status': 'analyzed',
      lastProcessed: FieldValue.serverTimestamp(),
    });
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
    const { userId, jobId } = data;
    if (!userId || !jobId) {
      throw new Error('Missing required fields in message data');
    }
    return { userId, jobId };
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
      const qualityNumber = `Q${index + 1}`;
      
      const components = line.split('|').map(s => s.trim());
      
      let primarySkill = '';
      let criticality = '';
      let evidence = '';
      
      components.forEach(component => {
        const [key, value] = component.split(':').map(s => s.trim());
        
        if (component.startsWith('Quality')) {
          primarySkill = value;
        } else if (component.toLowerCase().includes('criticality')) {
          criticality = value;
        } else if (component.toLowerCase().includes('evidence')) {
          evidence = value;
        }
      });

      qualities[qualityNumber] = {
        primarySkill,
        criticality,
        evidence,
      };
    });

    if (Object.keys(qualities).length === 0) {
      throw new Error('No valid qualities extracted from the response');
    }

    logger.info('Parsed qualities:', qualities);

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
    topic: CONFIG.topics.qualityExtractionRequests,
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
      
      const { userId, jobId } = pubSubService.validateMessageData(messageData);
      logger.info(`Processing qualities for userId: ${userId}, jobId: ${jobId}`);

      // Get Firestore document
      docRef = firestoreService.getDocRef(userId, jobId);
      const jobData = await firestoreService.getJobDocument(docRef);
      
      // Process job qualities
      const jobDescription = jobData.details?.description;
      if (!jobDescription) {
        throw new Error('Invalid job description for processing');
      }

      const apiResponse = await callAnthropicAPI(
        jobDescription,
        CONFIG.instructions.qualitiesExtraction
      );
      
      if (apiResponse.error) {
        throw new Error(`API Error: ${apiResponse.message}`);
      }

      const qualitiesText = apiResponse.extractedText;
      logger.info('Raw qualities text:', { qualitiesText });
      
      // Parse and validate qualities
      const qualities = qualitiesParser.parseQualities(qualitiesText);
      
      // Update Firestore
      await firestoreService.updateJobQualities(docRef, qualities);

      // Publish next message
      await pubSubService.publishMessage(
        CONFIG.topics.qualitiesGathered,
        { userId, jobId }
      );

    } catch (error) {
      await errorHandlers.handleProcessingError(error, docRef, { message });
    }
  });