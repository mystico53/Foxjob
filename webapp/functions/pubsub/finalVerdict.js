const functions = require('firebase-functions');
const admin = require('firebase-admin');
const logger = require("firebase-functions/logger");
require('dotenv').config();

// Initialize
const db = admin.firestore();

// ===== Config =====
const CONFIG = {
  topics: {
    hardSkillsMatched: 'hard-skills-matched'
  }
};

// ===== Tree Logging Service =====
const treeLogger = {
  traverseObject(obj, indent = '') {
    if (!obj || typeof obj !== 'object') return;

    Object.entries(obj).forEach(([key, value], index, array) => {
      // Skip generalData and texts sections
      if (key === 'generalData' || key === 'texts') return;

      const isLast = index === array.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const childIndent = indent + (isLast ? '    ' : '│   ');

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        logger.info(`${indent}${prefix}${key}`);
        this.traverseObject(value, childIndent);
      } else {
        // For non-object values, include the value in the output
        const displayValue = value === null ? 'null' : value.toString();
        logger.info(`${indent}${prefix}${key}: ${displayValue}`);
      }
    });
  }
};

// ===== Log Jobs Function =====
exports.finalVerdict = functions.pubsub
  .topic(CONFIG.topics.hardSkillsMatched)
  .onPublish(async (message) => {
    try {
      const { googleId, docId } = message.json;

      logger.info('📂 Job Structure');
      logger.info(`users/${googleId}/jobs/${docId}`);

      // Get the specific job document
      const jobDoc = await db
        .collection('users')
        .doc(googleId)
        .collection('jobs')
        .doc(docId)
        .get();

      if (!jobDoc.exists) {
        logger.info('❌ Job document not found');
        return;
      }

      const jobData = jobDoc.data();
      treeLogger.traverseObject(jobData);

    } catch (error) {
      logger.error('Error:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });