const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const { callAnthropicAPI } = require('../services/anthropicService');

// Configuration for the pipeline step
const stepConfig = {
  name: 'extract_job_description',
  instructions: "Extract and faithfully reproduce the entire job posting, including all details about the position, company, and application process. Maintain the original structure, tone, and level of detail. Include the job title, location, salary (if provided), company overview, full list of responsibilities and qualifications (both required and preferred), unique aspects of the role or company, benefits, work environment details, and any specific instructions or encouragement for applicants. Preserve all original phrasing, formatting, and stylistic elements such as questions, exclamations, or creative language. Do not summarize, condense, or omit any information. The goal is to create an exact replica of the original job posting, ensuring all content and nuances are captured.", // your existing instructions
  inputPath: 'texts.rawText',
  outputPath: 'texts.extractedText',
  triggerTopic: 'raw-text-stored',
  nextTopic: 'job-description-extracted',
  fallbackValue: 'na'
};

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

// Core operations wrapper
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
      update[fieldPath] = value;
    } else {
      update[fieldPath] = value;
    }
    
    await docRef.update(update);
    logger.info(`Updated ${fieldPath} successfully`);
  },

  // PubSub operations
  async publishNext(topicName, message) {
    try {
      await pubSubClient.createTopic(topicName).catch(err => {
        if (err.code !== 6) throw err; // 6 = already exists
      });

      const messageId = await pubSubClient.topic(topicName).publishMessage({
        data: Buffer.from(JSON.stringify(message)),
      });
      logger.info(`Published to ${topicName}, messageId: ${messageId}`);
    } catch (error) {
      logger.error(`Failed to publish to ${topicName}:`, error);
      throw error;
    }
  }
};

// Main function
exports.extractJobDescription = functions.pubsub
  .topic(stepConfig.triggerTopic)
  .onPublish(async (message) => {
    const { googleId, docId } = message.json;
    const startTime = Date.now();

    logger.info(`Starting ${stepConfig.name} for googleId: ${googleId}, docId: ${docId}`);

    if (!googleId || !docId) {
      logger.error('Missing required information');
      return;
    }

    try {
      // Get document
      const { jobDocRef, docSnapshot } = await operations.getJobDocument(googleId, docId);
      
      if (!docSnapshot.exists) {
        logger.error(`Document not found: ${docId}`);
        await operations.updateField(jobDocRef, {}, stepConfig.outputPath, stepConfig.fallbackValue);
        return;
      }

      // Get job data and input text
      const jobData = docSnapshot.data();
      const inputData = stepConfig.inputPath.split('.').reduce((obj, key) => obj?.[key], jobData);
      
      if (!inputData) {
        logger.error('Input data not found');
        await operations.updateField(jobDocRef, {}, stepConfig.outputPath, stepConfig.fallbackValue);
        return;
      }

      // Process with API
      const apiResult = await callAnthropicAPI(inputData, stepConfig.instructions);
      
      if (apiResult.error) {
        throw new Error(`API error: ${apiResult.message}`);
      }

      // Update result
      await operations.updateField(jobDocRef, jobData, stepConfig.outputPath, apiResult.extractedText);

      // Trigger next step
      await operations.publishNext(stepConfig.nextTopic, { googleId, docId });

      logger.info(`Completed ${stepConfig.name} in ${Date.now() - startTime}ms`);

    } catch (error) {
      logger.error(`Error in ${stepConfig.name}:`, error);
      const { jobDocRef } = await operations.getJobDocument(googleId, docId);
      await operations.updateField(jobDocRef, {}, stepConfig.outputPath, stepConfig.fallbackValue);
    }
  });