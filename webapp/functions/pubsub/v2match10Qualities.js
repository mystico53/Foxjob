const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const { logger } = require("firebase-functions");
const { PubSub } = require('@google-cloud/pubsub');
const { callAnthropicAPI } = require('../services/anthropicService');

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

// ===== Config =====
const CONFIG = {
  topics: {
    qualitiesGathered: 'ten-qualities-gathered-DISABLED',
    qualitiesMatched: 'qualities-matches-added'
  },
  collections: {
    users: 'users'
  },
  instructions: {
    qualityMatching: `
    You are a highly skilled HR professional tasked with finding evidence in a candidate's resume that matches specific job qualities.
    
    IMPORTANT: Your response MUST be a valid JSON object. The quality IDs in your response must match EXACTLY with the IDs provided, with no modifications or added text.
    
    For each quality provided:
    1) Analyze the resume to find relevant experience that demonstrates this quality
    2) Provide a detailed explanation of how the experience matches the quality
    3) Include specific metrics and examples from the resume where possible
    4) If no direct match is found, identify relevant transferable experience
    
    Your response MUST follow this EXACT JSON structure with NO MODIFICATIONS to the quality IDs:
    {
      "qualityMatches": {
        "Q1": {
          "resumeMatch": "Your detailed explanation here"
        }
      }
    }
    
    CRITICAL FORMAT RULES:
    - Use the exact quality ID as provided (e.g., "Q1" not "Q1: Sales Leadership")
    - Ensure all strings are properly escaped
    - No trailing commas
    - No line breaks within the resumeMatch strings
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
      throw new Error(`No resume found for user ID: ${googleId}`);
    }

    const resumeDoc = resumeSnapshot.docs[0];
    return resumeDoc.data().extractedText;
  },

  getJobDocRef(googleId, docId) {
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

  async updateQualityMatches(docRef, qualityMatches) {
    logger.info('Update:', { 
      path: docRef.path,
      fields: ['qualities']
    });

    // Create a batch to update all qualities
    const batch = db.batch();

    // Update each quality with its resume match
    Object.entries(qualityMatches).forEach(([qualityId, matchData]) => {
      const updateData = {};
      updateData[`qualities.${qualityId}.resumeMatch`] = matchData.resumeMatch;
      batch.update(docRef, updateData);
    });

    await batch.commit();
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

// ===== Quality Processor =====
const qualityProcessor = {
  extractQualities(jobData) {
    const qualities = jobData.qualities;
    
    if (!qualities || Object.keys(qualities).length === 0) {
      throw new Error('No qualities found');
    }

    // Return the qualities directly as they're already in the correct format
    return qualities;
  },

  validateMatchResults(matchResult) {
    if (!matchResult || typeof matchResult !== 'object') {
      throw new Error('Invalid match result format');
    }

    if (!matchResult.qualityMatches) {
      throw new Error('Missing qualityMatches in result');
    }

    Object.entries(matchResult.qualityMatches).forEach(([qualityId, match]) => {
      if (!match.resumeMatch || typeof match.resumeMatch !== 'string') {
        throw new Error(`Invalid resumeMatch for quality ${qualityId}`);
      }
    });
  }
};

// ===== Quality Matching Service =====
const qualityMatchingService = {
  async matchQualities(resumeText, qualities) {
    // Format qualities for the prompt
    const qualitiesString = Object.entries(qualities)
      .map(([id, quality]) => `
        ${id} (${quality.primarySkill})
        Context: ${quality.context}
        Evidence Required: "${quality.evidence}"
        Criticality: ${quality.criticality}
        Level Required: ${quality.level}
        Success Metrics: ${quality.successMetrics}
      `).join('\n');

    const instruction = `
      ${CONFIG.instructions.qualityMatching}
      
      Here are the qualities to match against the resume:
      ${qualitiesString}
    `;

    try {
      const result = await callAnthropicAPI(resumeText, instruction);
      
      if (!result || result.error) {
        throw new Error(result?.message || 'Error calling Anthropic API');
      }

      logger.debug('Raw API Response:', {
        resultType: typeof result,
        extractedTextType: typeof result?.extractedText,
        extractedTextPreview: result?.extractedText?.substring(0, 100)
      });

      // Clean and parse the response
      let parsedContent;
      try {
        let cleanedText = result.extractedText;
        if (typeof cleanedText === 'string') {
          // Remove any BOM characters
          cleanedText = cleanedText.replace(/^\uFEFF/, '');
          // Normalize newlines
          cleanedText = cleanedText.replace(/\r\n/g, '\n');
          // Remove any extra whitespace
          cleanedText = cleanedText.trim();
          // Handle potential line breaks within the content
          cleanedText = cleanedText.replace(/\n\s*/g, ' ');
          
          logger.debug('Cleaned text:', {
            length: cleanedText.length,
            preview: cleanedText.substring(0, 100)
          });
          
          parsedContent = JSON.parse(cleanedText);
        } else {
          parsedContent = result.extractedText;
        }
      } catch (parseError) {
        logger.error('Error parsing API response:', {
          error: parseError,
          responsePreview: result.extractedText?.substring(0, 200)
        });
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

      // Validate the response structure
      if (!parsedContent?.qualityMatches) {
        throw new Error('Response missing qualityMatches object');
      }

      // Ensure quality IDs match exactly
      const validQualityIds = new Set(Object.keys(qualities));
      const responseQualityIds = new Set(Object.keys(parsedContent.qualityMatches));
      
      if (!this.areSetsEqual(validQualityIds, responseQualityIds)) {
        logger.error('Quality ID mismatch:', {
          expected: Array.from(validQualityIds),
          received: Array.from(responseQualityIds)
        });
        throw new Error('Response contains mismatched quality IDs');
      }

      return parsedContent.qualityMatches;

    } catch (error) {
      logger.error('Error in matchQualities:', error);
      throw new Error(`Quality matching failed: ${error.message}`);
    }
  },

  areSetsEqual(set1, set2) {
    if (set1.size !== set2.size) return false;
    return Array.from(set1).every(value => set2.has(value));
  }
};

// ===== Error Handlers =====
const errorHandlers = {
  async handleProcessingError(error, docRef, context = {}) {
    logger.error('Processing Error:', error, context);
    throw error;
  }
};

// ===== Main Function =====
exports.matchQualities = onMessagePublished(
  { topic: CONFIG.topics.qualitiesGathered },
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
      logger.info(`Processing quality matches for googleId: ${googleId}, docId: ${docId}`);

      // Get resume and job data
      const resumeText = await firestoreService.getResumeText(googleId);
      docRef = firestoreService.getJobDocRef(googleId, docId);
      const jobData = await firestoreService.getJobDocument(docRef);

      // Process qualities
      const qualities = qualityProcessor.extractQualities(jobData);
      const matchResult = await qualityMatchingService.matchQualities(resumeText, qualities);

      // Update results
      await firestoreService.updateQualityMatches(docRef, matchResult);

      // Publish to next topic
      await pubSubService.publishMessage(
        CONFIG.topics.qualitiesMatched,
        { googleId, docId }
      );

      logger.info(`Successfully completed quality matching for docId: ${docId}`);

    } catch (error) {
      await errorHandlers.handleProcessingError(error, docRef, { message });
    }
  });