const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onRequest } = require("firebase-functions/v2/https");

const { createPipelineStep } = require('./pubsub/pipelineStep');
const pipelineSteps = require('./pubsub/pipelineConfig');
const logger = require('firebase-functions/logger');


// Get Firestore instance
const db = getFirestore();

// Import your non-pipeline functions
const { publishJobText } = require('./publishJobText');
const { saveRawPubSubMessage } = require('./pubsub/saveRawPubSubMessage');

// Create pipeline functions from config
const pipelineFunctions = Object.entries(pipelineSteps).reduce((acc, [key, config]) => {
    acc[key] = createPipelineStep(config);
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