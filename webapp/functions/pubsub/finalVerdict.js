const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const logger = require("firebase-functions/logger");
require('dotenv').config();
const { callAnthropicAPI } = require('../services/anthropicService');
const { PubSub } = require('@google-cloud/pubsub');
const pubSubClient = new PubSub();

const db = admin.firestore();

const CONFIG = {
  topics: {
    hardSkillsMatched: 'hard-skills-matched'
  },
  collections: {
    users: 'users',
    jobs: 'jobs'
  },
  instructions: {
    finalVerdict: `
    Based on the provided document data, create a structured assessment following these specific rules. 

    write a one sentence verdict with a very critical, final score that should give the applicant an idea of how succesful his application could be - be sober in your assesment, no empathy for the applicant.

    Required JSON Structure:
    {
      "verdict": {
        "keyStrengths": {
          "KEY1": "DESCRIPTION1",
          "KEY2": "DESCRIPTION2",
          "KEY3": "DESCRIPTION3"
        },
        "keyGaps": {
          "KEY1": "DESCRIPTION1",
          "KEY2": "DESCRIPTION2",
          "KEY3": "DESCRIPTION3"
        },
        "finalVerdict": "VERDICT",
        "confidenceScore": SCORE
      }
    }

    STRICT FORMAT RULES:
    1. Each KEY must be exactly two words that capture a core competency or skill area
    2. Each strength DESCRIPTION must:
       - Be maximum 5-6 words
       - Highlight specific evidence
    3. Each gap DESCRIPTION must:
       - Be maximum 5-6 words
       - Identify specific improvement areas
    4. Final verdict must be one clear, actionable sentence
    5. Confidence score must be 0-100

    Provide ONLY the JSON response with no additional text or explanation.
    `
  }
};

// ===== Tree Logging Service =====
const treeLogger = {
  traverseObject(obj, indent = '', excludePaths = []) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.entries(obj).forEach(([key, value], index, array) => {
      // Skip excluded paths
      if (key === 'texts') return;
      
      const isLast = index === array.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const childIndent = indent + (isLast ? '    ' : '│   ');
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        logger.info(`${indent}${prefix}${key}`);
        this.traverseObject(value, childIndent, excludePaths);
      } else {
        logger.info(`${indent}${prefix}${key}`);
      }
    });
  }
};

const services = {
  documentReader: {
    async getJobDocument(googleId, docId) {
      try {
        const jobDoc = await db
          .collection(CONFIG.collections.users)
          .doc(googleId)
          .collection(CONFIG.collections.jobs)
          .doc(docId)
          .get();

        if (!jobDoc.exists) {
          throw new Error('Job document not found');
        }

        const jobData = jobDoc.data();
        const fields = this.extractFields(jobData);
        
        return {
          path: `users/${googleId}/jobs/${docId}`,
          fields: fields,
          rawData: jobData
        };
      } catch (error) {
        throw error;
      }
    },

    extractFields(obj, prefix = '') {
      let fields = [];
    
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
    
        // Skip entire sections or specific fields
        if (
          key === 'generalData' || 
          key === 'texts' ||
          key === 'summarized' ||  // Skip entire summarized section
          (fieldPath === 'Score.totalScore') ||
          (fieldPath === 'Score.summary') ||
          (fieldPath.match(/Score\.Requirement\d+\.requirement/)) || // Skip requirement field in each Requirement
          (fieldPath.match(/SkillAssessment\.Hardskills\.HS\d+\.description/)) || // Skip description in each HS
          (fieldPath.match(/SkillAssessment\.DomainExpertise\.(assessment|importance|name|score|summary)/)) // Skip specific DomainExpertise fields
        ) {
          continue;
        }
    
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          fields = fields.concat(this.extractFields(value, fieldPath));
        } else {
          fields.push({
            path: fieldPath,
            value: value
          });
        }
      }
    
      return fields;
    }
  },

  api: {
    async getFinalVerdict(documentData) {
      const instruction = `
        ${CONFIG.instructions.finalVerdict}
        
        Document Data:
        Path: ${documentData.path}
        Fields:
        ${documentData.fields.map(field => 
          `${field.path}: ${field.value}`
        ).join('\n')}
      `;

      try {
        const result = await callAnthropicAPI(JSON.stringify(documentData), instruction);
        
        if (result.error) {
          throw new Error(result.message || 'API error');
        }

        try {
          return JSON.parse(result.extractedText);
        } catch (parseError) {
          throw new Error('Invalid JSON response');
        }

      } catch (error) {
        throw error;
      }
    }
  },

  firestore: {
    async updateVerdict(googleId, docId, verdict) {
      const jobDocRef = db
        .collection(CONFIG.collections.users)
        .doc(googleId)
        .collection(CONFIG.collections.jobs)
        .doc(docId);
  
      await jobDocRef.update({
        'verdict': verdict.verdict,
        'generalData.processingStatus': 'completed'
      });
    }
  }
};

exports.finalVerdict = onMessagePublished(
  { topic: CONFIG.topics.hardSkillsMatched },
  async (event) => {
    try {
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
      const { googleId, docId } = messageData;

      // Get reference to the job document
      const jobDocRef = db
        .collection(CONFIG.collections.users)
        .doc(googleId)
        .collection(CONFIG.collections.jobs)
        .doc(docId);

      // Process the document
      const documentData = await services.documentReader.getJobDocument(googleId, docId);
      const parsedVerdict = await services.api.getFinalVerdict(documentData);
      await services.firestore.updateVerdict(googleId, docId, parsedVerdict);

      // After everything is processed and written, get the final state
      const finalJobDoc = await jobDocRef.get();

      if (!finalJobDoc.exists) {
        logger.info('❌ Job document not found');
        throw new Error('Job document not found');
      }

      // Log the final structure
      logger.info('📂 Final Job Structure After Processing');
      logger.info(`users/${googleId}/jobs/${docId}`);
      treeLogger.traverseObject(finalJobDoc.data());

      // Calculate and log accumulated score
      const calculateAccumulatedScore = (docData) => {
        const scores = {
          requirementScore: docData.Score?.totalScore || 0,
          domainScore: docData.SkillAssessment?.DomainExpertise?.score || 0,
          hardSkillScore: docData.SkillAssessment?.Hardskills?.hardSkillScore?.totalScore || 0,
          verdictScore: docData.verdict?.confidenceScore || 0
        };

        logger.info('🎯 Score Breakdown:');
        logger.info(`├── Requirements Score: ${scores.requirementScore}`);
        logger.info(`├── Domain Expertise Score: ${scores.domainScore}`);
        logger.info(`├── Hard Skills Score: ${scores.hardSkillScore}`);
        logger.info(`└── Verdict Confidence Score: ${scores.verdictScore}`);

        const accumulatedScore = Math.round(
          (scores.requirementScore + 
          scores.domainScore + 
          scores.hardSkillScore + 
          scores.verdictScore) / 4
        );

        logger.info(`📊 Accumulated Score: ${accumulatedScore}`);
        
        return {
          scores,
          accumulatedScore
        };
      };

      const { scores, accumulatedScore } = calculateAccumulatedScore(finalJobDoc.data());

      // Save all scores and update processing status
      await jobDocRef.update({
        'AccumulatedScores': {
          requirementScore: scores.requirementScore,
          domainScore: scores.domainScore,
          hardSkillScore: scores.hardSkillScore,
          verdictScore: scores.verdictScore,
          accumulatedScore: accumulatedScore
        },
        'generalData.processingStatus': 'processed'
      });

      logger.info(`Processing status updated to "processed" in generalData for job ID: ${docId}, user ID: ${googleId}`);
        
      return parsedVerdict;

    } catch (error) {
      logger.error('Error:', error);
      throw new Error(`Internal error: ${error.message}`);
    }
  });