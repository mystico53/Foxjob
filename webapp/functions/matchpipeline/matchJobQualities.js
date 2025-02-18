const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const { logger } = require("firebase-functions");
const { PubSub } = require('@google-cloud/pubsub');
const { callGeminiAPI } = require('../services/geminiService');

// Initialize Firebase
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const pubSubClient = new PubSub();

// Config - with simplified prompt that preserves format
const CONFIG = {
    topics: {
      qualitiesGathered: 'ten-qualities-gathered',
      qualitiesMatched: 'qualities-resumetext-added'
    },
    instructions: `
      Act as an expert technical recruiter evaluating how well a candidate's resume matches specific job requirements.
  
  GUIDELINES:
  1. Match resume experiences to qualities based on RELEVANCE FIRST, then experience significance:
     - The experience must actually demonstrate the specific quality being matched
     - Don't match general achievements to specific qualities unless they clearly demonstrate the skill
     - Read the "Evidence" text carefully to understand what each quality actually requires
  
  2. Prioritize qualities by criticality score:
     - Assign your strongest, most relevant matches to the highest criticality qualities first
     - Only after high-criticality qualities have strong matches, move to lower criticality ones
     - A high-criticality quality with a weak match is better than leaving it empty
  
  3. When selecting text:
     - Use EXACT QUOTES from the resume that specifically demonstrate the required skill
     - Each significant quote can only be used for ONE quality - choose the best fit
     - If truly no match exists, leave resumeText empty
     - SELECT TEXT THAT SPECIFICALLY DEMONSTRATES THE QUALITY, not just impressive achievements
  
  Your response must be valid JSON matching this exact format:
  {
    "qualityMatches": {
      "Q1": {
        "resumeText": "EXACT QUOTE from resume that specifically demonstrates this quality"
      },
      "Q2": {
        "resumeText": ""
      }
    }
  }
  
  The resume text:
  """
  {resumeText}
  """
  
  Qualities to match:
  {formattedQualities}
    `
  };

// Helper functions
const normalizeSpaces = text => text.replace(/\s+/g, ' ').trim();

const parseGeminiResponse = extractedText => {
  try {
    const start = extractedText.indexOf('{');
    const end = extractedText.lastIndexOf('}') + 1;
    if (start === -1 || end === 0) throw new Error('No JSON object found in response');
    return JSON.parse(extractedText.slice(start, end));
  } catch (error) {
    logger.error('JSON parse error:', { error: error.message });
    throw error;
  }
};

// Main Function
exports.matchJobQualities = onMessagePublished(
  { topic: CONFIG.topics.qualitiesGathered },
  async (event) => {
    let messageData;
    try {
      // Parse message
      const decodedData = Buffer.from(event.data.message.data, 'base64').toString();
      messageData = JSON.parse(decodedData);
      const { firebaseUid, jobId } = messageData;
      logger.info('Processing job qualities', { firebaseUid, jobId });

      // Get resume text
      const userRef = db.collection('users').doc(firebaseUid);
      const resumeSnapshot = await userRef
        .collection('UserCollections')
        .where('type', '==', 'Resume')
        .limit(1)
        .get();
        
      if (resumeSnapshot.empty) {
        throw new Error(`No resume found for user: ${firebaseUid}`);
      }
      
      const resumeText = normalizeSpaces(resumeSnapshot.docs[0].data().extractedText || '');
      if (!resumeText) {
        throw new Error('Resume has no extracted text');
      }
      
      // Get job document
      const jobRef = userRef.collection('scrapedJobs').doc(jobId);
      const jobDoc = await jobRef.get();
      
      if (!jobDoc.exists) {
        throw new Error(`Job document not found: ${jobId}`);
      }
      
      const jobData = jobDoc.data();
      const qualities = jobData.qualities || {};
      
      // Format qualities for API - using the existing format
      const formattedQualities = Object.entries(qualities)
        .map(([id, quality]) => `
* ${id}
* criticality: "${quality.criticality || ''}"
* evidence: "${quality.evidence || ''}"
* primarySkill: "${quality.primarySkill || ''}"
* resumeText: [FIND STRONG MATCH HERE]`)
        .join('\n');
      
      // Call Gemini API
      const instruction = CONFIG.instructions
        .replace('{resumeText}', resumeText)
        .replace('{formattedQualities}', formattedQualities);
      
      // API call with retry
      let result;
      for (let i = 0; i < 3; i++) {
        try {
          result = await callGeminiAPI(
            resumeText,
            instruction,
            {
              model: 'gemini-2.0-flash',  // Using flash model for faster response
              // Optional parameters if needed
              // temperature: 0.3,  
              // maxOutputTokens: 2048
            }
          );
          if (result && !result.error) break;
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        } catch (error) {
          logger.warn(`API attempt ${i+1} failed:`, { error: error.message });
          if (i === 2) throw error;
        }
      }
      
      // Parse response
      const parsedResponse = parseGeminiResponse(result.extractedText);
      const qualityMatches = parsedResponse.qualityMatches || {};
      
      // Update with batch
      const batch = db.batch();
      
      // Add full resume text
      batch.update(jobRef, { 'qualities.resumeText': resumeText });
      
      // Check for duplicate quotes
      const usedQuotes = new Set();
      Object.entries(qualityMatches).forEach(([qualityId, matchData]) => {
        let quoteText = matchData?.resumeText || '';
        
        if (quoteText && usedQuotes.has(quoteText)) {
          logger.warn(`Duplicate quote found for ${qualityId}, removing`);
          quoteText = '';
        } else if (quoteText) {
          usedQuotes.add(quoteText);
        }
        
        batch.update(jobRef, {
          [`qualities.${qualityId}.resumeText`]: quoteText
        });
      });
      
      await batch.commit();
      
      // Publish next message
      await pubSubClient.topic(CONFIG.topics.qualitiesMatched)
        .publishMessage({
          data: Buffer.from(JSON.stringify({ firebaseUid, jobId }))
        });
        
      logger.info('Quality matching completed successfully', { jobId, matchCount: Object.keys(qualityMatches).length });
      
    } catch (error) {
      logger.error('Processing failed:', {
        error: error.message,
        firebaseUid: messageData?.firebaseUid,
        jobId: messageData?.jobId
      });
      throw error;
    }
  }
);