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
    qualitiesMatched: 'qualities-resumetext-added'
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
    logger.info(`Starting getResumeText for googleId: ${googleId}`);
    
    const userCollectionsRef = db.collection('users').doc(googleId).collection('UserCollections');
    logger.info(`Created reference to UserCollections: ${userCollectionsRef.path}`);
    
    const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
    logger.info('Executing resume query with type=="Resume"');
    
    const resumeSnapshot = await resumeQuery.get();
    logger.info(`Resume query completed. Empty? ${resumeSnapshot.empty}. Size: ${resumeSnapshot.size}`);

    if (resumeSnapshot.empty) {
      logger.error(`No resume found for user ID: ${googleId}. Collection path: ${userCollectionsRef.path}`);
      throw new Error(`No resume found for user ID: ${googleId}`);
    }

    const resumeDoc = resumeSnapshot.docs[0];
    const resumeData = resumeDoc.data();
    
    logger.info('Resume document data:', {
      id: resumeDoc.id,
      path: resumeDoc.ref.path,
      hasExtractedText: Boolean(resumeData.extractedText),
      extractedTextLength: resumeData.extractedText ? resumeData.extractedText.length : 0,
      documentFields: Object.keys(resumeData)
    });

    if (!resumeData.extractedText) {
      logger.error('Resume document found but extractedText is missing or empty', {
        documentId: resumeDoc.id,
        availableFields: Object.keys(resumeData)
      });
      throw new Error('Resume document found but extractedText is missing');
    }

    return resumeData.extractedText;
  },

  getJobDocRef(googleId, docId) {
    const docRef = db.collection('users')
      .doc(googleId)
      .collection('jobs')
      .doc(docId);
    
    logger.info(`Created job document reference: ${docRef.path}`);
    return docRef;
  },

  async getJobDocument(docRef) {
    logger.info(`Fetching job document from: ${docRef.path}`);
    
    const snapshot = await docRef.get();
    logger.info(`Job document fetch completed. Exists? ${snapshot.exists}`);
    
    if (!snapshot.exists) {
      logger.error(`Document not found at path: ${docRef.path}`);
      throw new Error(`Document not found: ${docRef.path}`);
    }

    const data = snapshot.data();
    logger.info('Job document data retrieved:', {
      hasQualities: Boolean(data.qualities),
      qualityCount: data.qualities ? Object.keys(data.qualities).length : 0,
      documentFields: Object.keys(data)
    });

    return data;
  },

  async updateQualityMatches(docRef, qualityMatches, resumeText) {
    logger.info(`Starting quality matches update for doc: ${docRef.path}`, {
      numberOfMatches: Object.keys(qualityMatches).length,
      resumeTextLength: resumeText.length
    });
    
    const batch = db.batch();
    
    // First, update the full resume text
    batch.update(docRef, {
      'qualities.resumeText': resumeText
    });
    
    // Then update individual quality matches
    Object.entries(qualityMatches).forEach(([qualityId, matchData]) => {
      logger.info(`Processing quality ${qualityId}:`, matchData);
      
      // Handle the case where matchData is either a string or an object
      const resumeText = typeof matchData === 'string' ? matchData : (matchData?.resumeText || '');
      
      const updateData = {};
      updateData[`qualities.${qualityId}.resumeText`] = resumeText;
      
      logger.info(`Adding batch update for quality ${qualityId}:`, {
        updatePath: `qualities.${qualityId}.resumeText`,
        resumeText: resumeText,
        textLength: resumeText.length
      });
      
      batch.update(docRef, updateData);
    });
  
    await batch.commit();
    logger.info('Quality matches batch update completed successfully');
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
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
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

    let lastError;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const result = await callAnthropicAPI(resumeText, instruction);
        if (!result || result.error) {
          throw new Error(result?.message || 'Error calling Anthropic API');
        }
        
        // Log the raw response from the LLM
        logger.info('Raw LLM Response:', {
          attempt: i + 1,
          response: result.extractedText
        });

        // Try parsing the response and log any parsing errors
        try {
          const parsedResponse = JSON.parse(result.extractedText);
          logger.info('Parsed LLM Response:', {
            attempt: i + 1,
            parsedResponse
          });
          return parsedResponse.qualityMatches;
        } catch (parseError) {
          logger.error('JSON Parse Error:', {
            attempt: i + 1,
            error: parseError.message,
            rawResponse: result.extractedText
          });
          throw parseError;
        }
      } catch (error) {
        lastError = error;
        logger.error('API Call Error:', {
          attempt: i + 1,
          error: error.message
        });
        if (i < MAX_RETRIES - 1) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }
};

// Main Function
exports.compareQualities = onMessagePublished(
  { topic: CONFIG.topics.qualitiesGathered },
  async (event) => {
    try {
      logger.info('Starting compareQualities function');
      
      // Parse message
      const decodedData = Buffer.from(event.data.message.data, 'base64').toString();
      const messageData = JSON.parse(decodedData);
      const { googleId, docId } = messageData;
      
      logger.info('Parsed message data:', { googleId, docId });

      // Get resume and job data
      logger.info('Fetching resume text');
      const resumeText = await firestoreService.getResumeText(googleId);
      logger.info('Resume text retrieved', {
        length: resumeText.length,
        preview: resumeText.substring(0, 100) // First 100 chars for verification
      });

      const docRef = firestoreService.getJobDocRef(googleId, docId);
      const jobData = await firestoreService.getJobDocument(docRef);

      // Process qualities
      const qualities = jobData.qualities;
      logger.info('Processing qualities', {
        numberOfQualities: Object.keys(qualities).length
      });
      
      const qualityMatches = await qualityComparingService.compareQualities(resumeText, qualities);
      logger.info('Quality comparison completed', {
        numberOfMatches: Object.keys(qualityMatches).length
      });

      // Update results
      await firestoreService.updateQualityMatches(docRef, qualityMatches, resumeText);

      // Publish to next topic
      await pubSubService.publishMessage(
        CONFIG.topics.qualitiesMatched,
        { googleId, docId }
      );

      logger.info(`Successfully completed quality comparison for docId: ${docId}`);

    } catch (error) {
      logger.error('Processing Error:', {
        error: error.message,
        stack: error.stack,
        googleId: messageData?.googleId,
        docId: messageData?.docId
      });
      throw error;
    }
  });