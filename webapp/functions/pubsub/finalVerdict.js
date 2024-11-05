const functions = require('firebase-functions');
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

    write a one sentence verdict with a final score that should give the applicant an idea of how succesful his application could be, be realistic.

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

        if (key === 'generalData' || key === 'texts') continue;

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

exports.finalVerdict = functions.pubsub
  .topic(CONFIG.topics.hardSkillsMatched)
  .onPublish(async (message) => {
    try {
      const messageData = message.json;
      const { googleId, docId } = messageData;

      const documentData = await services.documentReader.getJobDocument(googleId, docId);
      const parsedVerdict = await services.api.getFinalVerdict(documentData);
      await services.firestore.updateVerdict(googleId, docId, parsedVerdict);

      return parsedVerdict;

    } catch (error) {
      throw new functions.https.HttpsError('internal', error.message);
    }
  });