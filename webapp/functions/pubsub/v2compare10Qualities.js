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
    You are tasked with finding VERBATIM QUOTES from a candidate's resume. You will be given the EXACT resume text to search through.

    CRITICAL INSTRUCTIONS:
    1. First, confirm you see the resume text by showing the first 100 characters
    2. For each requirement, you must:
       - Search through ONLY the provided resume text
       - Copy/paste ONLY text that appears WORD FOR WORD in the resume
       - Include the FULL relevant sentence or bullet point from the resume
       - For each match, note which line number or section it was found in
       - If no match is found, explain why in the location field
    3. Never modify, rephrase, or clean up the resume text
    4. Never combine multiple parts of the resume into one quote
    5. Never standardize formatting or punctuation
    6. Never invent or generate text that isn't in the resume
    7. Your response must ONLY contain the JSON object - no additional text before or after

    The resume text to search through is:
    """
    {resumeText}
    """

    Your response MUST be ONLY a valid JSON object following this EXACT structure:
    {
      "confirmation": "First 100 chars of resume I'm searching: [insert first 100 chars here]",
      "qualityMatches": {
        "Q1": {
          "resumeText": "EXACT quote from resume, preserving all original formatting, spacing, and punctuation",
          "location": "Found in [section/line number]"
        }
      }
    }

    If you cannot find an exact quote, include the reason in the location field:
    {
      "qualityMatches": {
        "Q1": {
          "resumeText": "",
          "location": "No exact match found because [specific reason - e.g. 'resume focuses on product management rather than sales leadership']"
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

const parseAnthropicResponse = (extractedText) => {
  try {
    // Find the first '{' and last '}'
    const start = extractedText.indexOf('{');
    const end = extractedText.lastIndexOf('}') + 1;
    if (start === -1 || end === 0) {
      throw new Error('No JSON object found in response');
    }
    
    // Extract just the JSON portion
    const jsonStr = extractedText.slice(start, end);
    return JSON.parse(jsonStr);
  } catch (error) {
    logger.error('JSON parse error:', {
      error: error.message,
      extractedText: extractedText
    });
    throw error;
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
    const RETRY_DELAY = 1000;
    
    // Split qualities into two batches
    const qualityIds = Object.keys(qualities);
    const midpoint = Math.ceil(qualityIds.length / 2);
    
    const firstHalf = {};
    const secondHalf = {};
    
    qualityIds.forEach((id, index) => {
      if (index < midpoint) {
        firstHalf[id] = qualities[id];
      } else {
        secondHalf[id] = qualities[id];
      }
    });

    logger.info('Split qualities into two batches', {
      firstHalfIds: Object.keys(firstHalf),
      secondHalfIds: Object.keys(secondHalf)
    });

    let allMatches = {};

    // First API call (Q1-Q5)
    const formatQualities = (qualityBatch) => {
      return Object.entries(qualityBatch)
        .map(([id, quality]) => {
          const formatted = `
          ${id}:
          Primary Skill: ${quality.primarySkill}
          Required Experience: ${quality.evidence}
          Level Required: ${quality.level}
          Context: ${quality.context}
          ---`;
          logger.info(`Formatting quality ${id}:`, formatted);
          return formatted;
        }).join('\n');
    };

    const firstHalfString = formatQualities(firstHalf);
    logger.info('First half qualities being sent:', firstHalfString);

      const firstInstruction = `
      ${CONFIG.instructions.qualityMatching.replace('{resumeText}', resumeText)}
      
      Here are the first set of qualities to match against the resume:
      ${firstHalfString}
    `;

    let lastError;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        logger.info('Making first API call for qualities:', {
          qualities: Object.keys(firstHalf)
        });
        
        const result = await callAnthropicAPI(resumeText, firstInstruction);
        if (!result || result.error) {
          throw new Error(result?.message || 'Error calling Anthropic API');
        }
        
        logger.info('First batch raw response:', {
          attempt: i + 1,
          response: result.extractedText
        });

        try {
          const parsedResponse = parseAnthropicResponse(result.extractedText);
          logger.info('First batch parsed response:', {
            attempt: i + 1,
            parsedResponse
          });
          allMatches = { ...allMatches, ...parsedResponse.qualityMatches };
          break;
        } catch (parseError) {
          logger.error('First batch parse error:', {
            attempt: i + 1,
            error: parseError.message,
            rawResponse: result.extractedText
          });
          throw parseError;
        }
      } catch (error) {
        lastError = error;
        logger.error('First batch API error:', {
          attempt: i + 1,
          error: error.message
        });
        if (i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        }
      }
    }
    
    if (lastError) {
      throw lastError;
    }

    // Second API call (Q6-Q10)
    const secondHalfString = formatQualities(secondHalf);

    const secondInstruction = `
      ${CONFIG.instructions.qualityMatching.replace('{resumeText}', resumeText)}
      
      Here are the second set of qualities to match against the resume:
      ${secondHalfString}
    `;

    lastError = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        logger.info('Making second API call for qualities:', {
          qualities: Object.keys(secondHalf)
        });
        
        const result = await callAnthropicAPI(resumeText, secondInstruction);
        if (!result || result.error) {
          throw new Error(result?.message || 'Error calling Anthropic API');
        }
        
        logger.info('Second batch raw response:', {
          attempt: i + 1,
          response: result.extractedText
        });

        try {
          const parsedResponse = JSON.parse(result.extractedText);
          logger.info('Second batch parsed response:', {
            attempt: i + 1,
            parsedResponse
          });
          // Merge results from second batch with first batch
          allMatches = { ...allMatches, ...parsedResponse.qualityMatches };
          break;
        } catch (parseError) {
          logger.error('Second batch parse error:', {
            attempt: i + 1,
            error: parseError.message,
            rawResponse: result.extractedText
          });
          throw parseError;
        }
      } catch (error) {
        lastError = error;
        logger.error('Second batch API error:', {
          attempt: i + 1,
          error: error.message
        });
        if (i < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        }
      }
    }
    
    if (lastError) {
      throw lastError;
    }

    logger.info('Both batches completed successfully', {
      totalMatches: Object.keys(allMatches).length,
      matchedQualities: Object.keys(allMatches)
    });
    
    return allMatches;
  }
};

// Main Function
exports.compareQualities = onMessagePublished(
  { topic: CONFIG.topics.qualitiesGathered },
  async (event) => {
    let messageData; // Moved declaration outside try block
    try {
      logger.info('Starting compareQualities function');
      
      // Parse message
      const decodedData = Buffer.from(event.data.message.data, 'base64').toString();
      messageData = JSON.parse(decodedData); // Removed 'const'
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
        googleId: messageData?.googleId,  // Now messageData will be accessible
        docId: messageData?.docId
      });
      throw error;
    }
  });