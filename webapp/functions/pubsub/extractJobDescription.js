const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const { callAnthropicAPI } = require('../services/anthropicService');

// Enhanced logging configuration
const enhancedLogger = {
  debug: (message, data = {}) => {
    logger.debug(`[JobExtractor] ${message}`, data);
  },
  info: (message, data = {}) => {
    logger.info(`[JobExtractor] ${message}`, data);
  },
  error: (message, error = null) => {
    logger.error(`[JobExtractor] ${message}`, error);
  }
};

// Configuration for the pipeline step
const stepConfig = {
  name: 'extract_job_description',
  instructions: "Extract and faithfully reproduce the entire job posting...", // your existing instructions
  inputPath: 'texts.rawText',
  outputPath: 'texts.extractedText',
  nextTopic: 'job-description-extracted',
  fallbackValue: 'na'
};

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

// Core operations object
const operations = {
  // Database operations
  async getJobDocument(googleId, docId) {
    const jobDocRef = db.collection('users').doc(googleId).collection('jobs').doc(docId);
    const docSnapshot = await jobDocRef.get();
    return { jobDocRef, docSnapshot };
  },

  async updateField(docRef, currentData, fieldPath, value) {
    const update = {};
    const pathParts = fieldPath.split('.');
    
    if (pathParts.length > 1) {
      // For nested fields, use dot notation directly
      update[fieldPath] = value;
    } else {
      // For top-level fields
      update[fieldPath] = value;
    }
    
    await docRef.update(update);
    enhancedLogger.info(`Updated ${fieldPath} successfully`);
  },

  // PubSub operations
  async publishNext(topicName, message) {
    try {
      // Create topic if it doesn't exist
      await pubSubClient.createTopic(topicName).catch(err => {
        if (err.code !== 6) throw err; // 6 = already exists
      });

      const messageId = await pubSubClient.topic(topicName).publishMessage({
        data: Buffer.from(JSON.stringify(message)),
      });
      enhancedLogger.info(`Published to ${topicName}, messageId: ${messageId}`);
    } catch (error) {
      enhancedLogger.error(`Failed to publish to ${topicName}:`, error);
      throw error;
    }
  }
};

// Additional validation helpers
const validators = {
  checkInputData: (inputData) => {
    if (!inputData || inputData === '') {
      throw new Error('Input data is empty or undefined');
    }
    if (typeof inputData !== 'string') {
      throw new Error(`Invalid input data type: ${typeof inputData}`);
    }
    return true;
  },
  
  checkAPIResponse: (response) => {
    if (!response) {
      throw new Error('API response is null or undefined');
    }
    if (response.error) {
      throw new Error(`API error: ${response.message}`);
    }
    return true;
  }
};

// Enhanced error handling wrapper
const withErrorHandling = async (operation, fallback) => {
  try {
    return await operation();
  } catch (error) {
    enhancedLogger.error('Operation failed', error);
    return fallback;
  }
};

// Main function
exports.extractJobDescription = functions.pubsub
  .topic('raw-text-stored')
  .onPublish(async (message) => {
    const startTime = Date.now();
    let debugInfo = {};

    try {
      const { googleId, docId } = message.json;
      debugInfo.metadata = { googleId, docId, startTime };
      
      enhancedLogger.info('Starting job extraction', debugInfo);

      // Validate input parameters
      if (!googleId || !docId) {
        throw new Error('Missing required parameters');
      }

      // Get document with error handling
      const { jobDocRef, docSnapshot } = await withErrorHandling(
        async () => await operations.getJobDocument(googleId, docId),
        { error: 'Failed to fetch document' }
      );

      debugInfo.documentExists = docSnapshot.exists;
      enhancedLogger.debug('Document fetch status', debugInfo);

      if (!docSnapshot.exists) {
        throw new Error(`Document not found: ${docId}`);
      }

      // Extract and validate input data
      const jobData = docSnapshot.data();
      const inputData = stepConfig.inputPath.split('.').reduce((obj, key) => obj?.[key], jobData);
      
      debugInfo.inputDataLength = inputData ? inputData.length : 0;
      enhancedLogger.debug('Input data stats', debugInfo);

      validators.checkInputData(inputData);

      // Call API with enhanced error handling
      const apiResult = await withErrorHandling(
        async () => {
          const result = await callAnthropicAPI(inputData, stepConfig.instructions);
          validators.checkAPIResponse(result);
          return result;
        },
        { error: true, message: 'API processing failed' }
      );

      debugInfo.apiResponseReceived = !!apiResult;
      enhancedLogger.debug('API response received', debugInfo);

      if (apiResult.error) {
        throw new Error(`API processing failed: ${apiResult.message}`);
      }

      // Update document
      await operations.updateField(jobDocRef, jobData, stepConfig.outputPath, apiResult.extractedText);
      
      // Trigger next step
      await operations.publishNext(stepConfig.nextTopic, { googleId, docId });

      const duration = Date.now() - startTime;
      enhancedLogger.info(`Completed successfully in ${duration}ms`, {
        ...debugInfo,
        duration,
        success: true
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      enhancedLogger.error('Processing failed', {
        ...debugInfo,
        error: error.message,
        duration,
        success: false
      });

      // Attempt to update with fallback value if we have document reference
      if (debugInfo.metadata) {
        const { googleId, docId } = debugInfo.metadata;
        const { jobDocRef } = await operations.getJobDocument(googleId, docId);
        await operations.updateField(jobDocRef, {}, stepConfig.outputPath, stepConfig.fallbackValue);
      }
    }
  });