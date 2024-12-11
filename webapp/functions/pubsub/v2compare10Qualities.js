const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const { logger } = require("firebase-functions");
const { PubSub } = require('@google-cloud/pubsub');
const { callAnthropicAPI } = require('../services/anthropicService');

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

// Config
const CONFIG = {
  topics: {
    qualitiesGathered: 'ten-qualities-gathered',
    qualitiesMatched: 'qualities-matches-added'
  },
  collections: {
    users: 'users'
  },
  instructions: {
    qualityMatching: `
    You are a highly skilled HR professional tasked with evaluating if a candidate's resume demonstrates the required job qualities.
    
    CRITICAL RESPONSE FORMAT:
    - Respond ONLY with a JSON object
    - Do not add any text before or after the JSON
    - Properly escape all quotes and special characters
    - No line breaks within strings
    - No trailing commas
    
    IMPORTANT: 
    - These are JOB REQUIREMENTS that you need to find evidence for in the candidate's resume
    - Each quality represents something the JOB NEEDS
    - If you find a match, only include the EXACT relevant text from the resume
    - If no match exists, return an empty string
    
    For each job requirement:
    1) Search the resume for EXACT TEXT that demonstrates this required skill/experience
    2) Only include direct quotes from the resume - do not add any analysis or interpretation
    3) If no matching text exists, return an empty string
    
    Your response MUST be a valid JSON object following this EXACT structure:
    {
      "qualityMatches": {
        "Q1": {
          "resumeText": "Direct quote from resume that matches this requirement, or empty string if no match"
        }
      }
    }
    `
  }
};

// Firestore Service
const firestoreService = {
  async getResumeText(googleId) {
    const userCollectionsRef = db.collection('users').doc(googleId).collection('UserCollections');
    const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
    const resumeSnapshot = await resumeQuery.get();

    if (resumeSnapshot.empty) {
      throw new Error(`No resume found for user ID: ${googleId}`);
    }

    const resumeDoc = resumeSnapshot.docs[0];
    return resumeDoc.data().extractedText;
  },

  getJobDocRef(googleId, docId) {
    return db.collection('users')
      .doc(googleId)
      .collection('jobs')
      .doc(docId);
  },

  async getJobDocument(docRef) {
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new Error(`Document not found: ${docRef.path}`);
    }
    return snapshot.data();
  },

  async updateQualityMatches(docRef, qualityMatches) {
    const batch = db.batch();
    
    Object.entries(qualityMatches).forEach(([qualityId, matchData]) => {
      const updateData = {};
      updateData[`qualities.${qualityId}.resumeText`] = matchData.resumeText || ''; // Convert undefined to empty string
      batch.update(docRef, updateData);
    });
  
    await batch.commit();
  }
};

// PubSub Service
const pubSubService = {
  parseMessage(message) {
    if (!message.data) {
      throw new Error('No message data received');
    }
    return message.json;
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

// Quality Processing Service
const qualityComparingService = {
  async compareQualities(resumeText, qualities) {
    const qualitiesString = Object.entries(qualities)
      .map(([id, quality]) => {
        return `
          ${id} (${quality.primarySkill})
          Required Experience: ${quality.evidence}
          Level Required: ${quality.level}
          Context: ${quality.context}
        `;
      }).join('\n');

    const instruction = `
      ${CONFIG.instructions.qualityMatching}
      
      Here are the qualities to match against the resume:
      ${qualitiesString}
    `;

    const result = await callAnthropicAPI(resumeText, instruction);
    
    if (!result || result.error) {
      throw new Error(result?.message || 'Error calling Anthropic API');
    }

    return JSON.parse(result.extractedText).qualityMatches;
  }
};

// Main Function
exports.compareQualities = onMessagePublished(
  { topic: CONFIG.topics.qualitiesGathered },
  async (event) => {
    try {
      // Parse message
      const decodedData = Buffer.from(event.data.message.data, 'base64').toString();
      const messageData = JSON.parse(decodedData);
      const { googleId, docId } = messageData;
      
      // Get resume and job data
      const resumeText = await firestoreService.getResumeText(googleId);
      const docRef = firestoreService.getJobDocRef(googleId, docId);
      const jobData = await firestoreService.getJobDocument(docRef);

      // Process qualities
      const qualities = jobData.qualities;
      const qualityMatches = await qualityComparingService.compareQualities(resumeText, qualities);

      // Update results
      await firestoreService.updateQualityMatches(docRef, qualityMatches);

      // Publish to next topic
      await pubSubService.publishMessage(
        CONFIG.topics.qualitiesMatched,
        { googleId, docId }
      );

      logger.info(`Successfully completed quality comparison for docId: ${docId}`);

    } catch (error) {
      logger.error('Processing Error:', error);
      throw error;
    }
  });