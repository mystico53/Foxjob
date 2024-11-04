// index.js
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

// Initialize Firebase Admin
admin.initializeApp();

// Import pipeline components - Fix is here: destructure pipelineSteps
const { createPipelineStep } = require('./pubsub/pipelineStep');
const { pipelineSteps } = require('./pubsub/pipelineConfig');  // 👈 Changed this line

// Get Firestore instance
const db = getFirestore();

// Import your non-pipeline functions
const { publishJobText } = require('./publishJobText');
const { saveRawPubSubMessage } = require('./pubsub/saveRawPubSubMessage');

// Add some debug logging
logger.info('Loaded pipeline steps:', Object.keys(pipelineSteps));

// Create pipeline functions from config
const pipelineFunctions = Object.entries(pipelineSteps).reduce((acc, [key, config]) => {
  
  try {
    acc[key] = createPipelineStep(config);
    
  } catch (error) {
    logger.error(`Failed to create pipeline function ${key}:`, error);
    throw error;
  }
  return acc;
}, {});
  
// Export all Cloud Functions
module.exports = {
  // Non-pipeline functions
  publishJobText,
  saveRawMessage: saveRawPubSubMessage,
  
  // Pipeline functions
  ...pipelineFunctions,
};