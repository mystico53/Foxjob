// pubsub/pipelineStep.js

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { PubSub } = require('@google-cloud/pubsub');
const logger = require('firebase-functions/logger');
const { operations } = require('../services/operations');

// Import your API service modules
const { callAnthropicAPI } = require('../services/anthropicService');
const { callOpenAIAPI } = require('../services/openaiService');


const pubSubClient = new PubSub();

const createPipelineStep = (config) => {
  // Validate config
  const requiredFields = [
    'name',
    'instructions',
    'inputPath',
    'outputPath',
    'triggerTopic',
    'nextTopic',
    'fallbackValue',
    'api', // Add 'api' to required fields
  ];
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required config field: ${field}`);
    }
  }

  // Return the cloud function
  return functions.pubsub.onMessagePublished(config.triggerTopic, async (event) => {
    const message = event.data;
    const { googleId, docId } = JSON.parse(Buffer.from(message.message.data, 'base64').toString());

    const startTime = Date.now();

    logger.info(`PIpeline: Starting ${config.name} for googleId: ${googleId}, docId: ${docId}`);

    if (!googleId || !docId) {
      logger.error('Missing required information');
      return;
    }

    let docRef;
    try {
      // Get document
      const result = await operations.getDocument(googleId, docId, config.collections);
      docRef = result.docRef;
      const docSnapshot = result.docSnapshot;

      if (!docSnapshot.exists) {
        logger.error(`Document not found: ${docId}`);
        await operations.updateField(docRef, {}, config.outputPath, config.fallbackValue);
        return;
      }

      // Get input data
      const docData = docSnapshot.data();
      const inputData = config.inputPath
        .split('.')
        .reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : null), docData);

      if (!inputData) {
        logger.error('Input data not found at path:', config.inputPath);
        await operations.updateField(docRef, {}, config.outputPath, config.fallbackValue);
        return;
      }

      // Process with the specified API
      let apiResult;
      if (config.api === 'anthropic') {
        apiResult = await callAnthropicAPI(inputData, config.instructions);
        } else if (config.api === 'openai') {
        apiResult = await callOpenAIAPI(inputData, config.instructions);
      } else {
        throw new Error(`Unsupported API specified in config: ${config.api}`);
      }

      if (apiResult.error) {
        throw new Error(`API error: ${apiResult.message}`);
      }

      // Update result
      await operations.updateField(docRef, docData, config.outputPath, apiResult.extractedText);

      // Trigger next step if nextTopic is set
      if (config.nextTopic) {
        await operations.publishNext(pubSubClient, config.nextTopic, { googleId, docId });
      }

      logger.info(`Completed ${config.name} in ${Date.now() - startTime}ms`);
    } catch (error) {
      logger.error(`Error in ${config.name}:`, error);
      if (docRef) {
        await operations.updateField(docRef, {}, config.outputPath, config.fallbackValue);
      }
    }
  });
};

module.exports = { createPipelineStep };
