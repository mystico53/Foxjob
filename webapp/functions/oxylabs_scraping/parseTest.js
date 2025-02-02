// parseTest.js

const admin = require('firebase-admin');
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { BLACKLIST, WHITELIST } = require('./patterns');  // <-- import dictionaries

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  initializeApp();
}

const db = admin.firestore();

// Which job to fetch
const JOB_POSITION = 2; 

// ===== Helper Functions for Black/White List =====
function isBlacklisted(text) {
  return BLACKLIST.some(pattern => pattern.test(text));
}

function isWhitelisted(text) {
  return WHITELIST.some(pattern => pattern.test(text));
}

// ===== Parsing Service =====
const parsingService = {
    cleanText(text) {
      if (!text) return '';
      
      // Replace HTML entities
      let cleaned = text.replace(/&#\d+;/g, "'");
      
      // Add newlines before and after section headings
      cleaned = cleaned.replace(/([A-Z][^.!?]+?):\s*/g, '\n\n$1:\n');
      
      // Replace bullet variations with a standard bullet and ensure newline
      cleaned = cleaned.replace(/[•●◆■\-\*]\s*/g, '\n• ');
      
      // Clean up excessive whitespace while preserving structure
      cleaned = cleaned
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      logger.debug('AFTER CLEANING:', cleaned);
      return cleaned;
    },
  
    splitIntoSentences(text) {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      logger.debug('SPLIT INTO LINES:', lines);
  
      const sentences = [];
      let currentBulletPoint = '';
  
      for (let line of lines) {
        logger.debug('PROCESSING LINE:', line);
        
        if (line.startsWith('•')) {
          if (currentBulletPoint) {
            logger.debug('ADDING BULLET POINT:', currentBulletPoint);
            sentences.push(currentBulletPoint);
          }
          currentBulletPoint = line.replace('• ', '').trim();
          logger.debug('STARTED NEW BULLET POINT:', currentBulletPoint);
          continue;
        }
  
        if (currentBulletPoint) {
          logger.debug('ADDING FINAL BULLET POINT:', currentBulletPoint);
          sentences.push(currentBulletPoint);
          currentBulletPoint = '';
        }
  
        const lineSentences = line
          .split(/(?<=[^A-Z].[.!?])\s+(?=[A-Z])/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        logger.debug('LINE SPLIT INTO SENTENCES:', lineSentences);
        sentences.push(...lineSentences);
      }
  
      if (currentBulletPoint) {
        logger.debug('ADDING LAST BULLET POINT:', currentBulletPoint);
        sentences.push(currentBulletPoint);
      }
  
      logger.debug('FINAL SENTENCES:', sentences);
      return sentences;
    },
  
    isValidContent(text) {
      const cleaned = text.trim();
      const isValid = cleaned.length >= 10 && 
                     cleaned.length <= 2000 && 
                     /[a-zA-Z]{3,}/.test(cleaned);
      
      logger.debug(`VALIDATING CONTENT [${isValid}]:`, text);
      return isValid;
    },
  
    extractJobComponents(description) {
      if (!description || !Array.isArray(description) || description.length === 0) {
        logger.info("No description found or description is empty array");
        return [];
      }
  
      const rawDescription = description[0] || '';
      logger.info("RAW DESCRIPTION:", rawDescription);
      
      const cleanedDesc = this.cleanText(rawDescription);
      logger.info("CLEANED JOB DESCRIPTION:", cleanedDesc);
  
      const sentences = this.splitIntoSentences(cleanedDesc);
      logger.info("TOTAL SENTENCES FOUND:", sentences.length);
      logger.info("STRUCTURED SENTENCES:", JSON.stringify(sentences, null, 2));
  
      const extractedLines = [];
      
      for (const sentence of sentences) {
  
        // 1) Check if blacklisted
        if (isBlacklisted(sentence)) {
          logger.debug("[BLACKLISTED] ->", sentence);
          continue;
        }
  
        // 2) Check if whitelisted
        if (!isWhitelisted(sentence)) {
          logger.debug("[NOT WHITELISTED] ->", sentence);
          continue;
        }
  
        // 3) Check basic validity
        if (!this.isValidContent(sentence)) {
          logger.debug("[INVALID CONTENT] ->", sentence);
          continue;
        }
  
        logger.debug("[WHITELISTED - ADDED] ->", sentence);
        extractedLines.push(sentence);
      }
  
      logger.info("PARSED LINES (FINAL):", JSON.stringify(extractedLines, null, 2));
      return extractedLines;
    }
  };

// ===== Firestore Service =====
const firestoreService = {
  async getJobAtPosition(userId, position) {
    try {
      const scrapedjobsRef = db.collection('users')
        .doc(userId)
        .collection('scrapedjobs');
      
      const jobSnapshot = await scrapedjobsRef
        .orderBy('createdAt')
        .offset(position - 1)
        .limit(1)
        .get();

      if (jobSnapshot.empty) {
        return null;
      }

      const job = jobSnapshot.docs[0];
      return {
        id: job.id,
        data: job.data()
      };
    } catch (error) {
      logger.error('Error in getJobAtPosition:', error);
      throw error;
    }
  }
};

// ===== Validation Service =====
const validationService = {
  validateUserId(userId) {
    if (!userId) {
      throw new Error('userId is required');
    }
  },

  validateJobData(jobData) {
    if (!jobData?.details?.description) {
      throw new Error('Job description not found in document');
    }
  }
};

// ===== Response Service =====
const responseService = {
  success(response, data) {
    response.status(200).send(data);
  },

  error(response, error) {
    const statusCode = this.getStatusCode(error);
    response.status(statusCode).send({
      error: error.message || 'Internal server error'
    });
  },

  getStatusCode(error) {
    if (error.message === 'userId is required') return 400;
    if (error.message === 'Job description not found in document') return 404;
    return 500;
  }
};

// ===== Main Function =====
exports.parseTest = onRequest(async (request, response) => {
  try {
    const { userId } = request.query;
    
    validationService.validateUserId(userId);
    const job = await firestoreService.getJobAtPosition(userId, JOB_POSITION);

    if (!job) {
      throw new Error(`No job found at position ${JOB_POSITION} for this user`);
    }

    validationService.validateJobData(job.data);

    const extractedLines = parsingService.extractJobComponents(
      job.data.details.description
    );

    // Log the final extracted lines
    logger.info('PARSED LINES (FINAL):', JSON.stringify(extractedLines, null, 2));

    responseService.success(response, {
      jobId: job.id,
      extractedLines
    });

  } catch (error) {
    logger.error('Error in parseTest:', error);
    responseService.error(response, error);
  }
});
