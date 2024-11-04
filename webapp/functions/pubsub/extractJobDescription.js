const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const { callAnthropicAPI } = require('../services/anthropicService');

// Initialize Firebase Admin SDK and Pub/Sub client outside the function to avoid multiple initializations
const db = admin.firestore();
const pubSubClient = new PubSub();

// Factory function to create pipeline step
const createPipelineStep = (config) => {
  // Validate config
  const requiredFields = ['name', 'instructions', 'inputPath', 'outputPath', 'triggerTopic', 'nextTopic', 'fallbackValue'];
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Missing required config field: ${field}`);
    }
  }

  // Core operations wrapper
  const operations = {
    // Database operations
    async getDocument(googleId, docId, collections = ['users', 'jobs']) {
      let ref = db;
      for (let i = 0; i < collections.length; i++) {
        const collection = collections[i];
        const docIdToUse = (i === 0) ? googleId : (i === collections.length - 1) ? docId : null;
        ref = ref.collection(collection);
        if (docIdToUse) {
          ref = ref.doc(docIdToUse);
        }
      }
      const docSnapshot = await ref.get();
      return { docRef: ref, docSnapshot };
    },

    async updateField(docRef, currentData, fieldPath, value) {
      const update = {};
      update[fieldPath] = value;
      await docRef.update(update);
      logger.info(`Updated ${fieldPath} successfully`);
    },

    // PubSub operations
    async publishNext(topicName, message) {
      try {
        const topic = pubSubClient.topic(topicName);
        const [exists] = await topic.exists();
        if (!exists) {
          await pubSubClient.createTopic(topicName);
        }

        const messageId = await topic.publishMessage({
          data: Buffer.from(JSON.stringify(message)),
        });
        logger.info(`Published to ${topicName}, messageId: ${messageId}`);
      } catch (error) {
        logger.error(`Failed to publish to ${topicName}:`, error);
        throw error;
      }
    },
  };

  // Return the cloud function
  return functions.pubsub
    .topic(config.triggerTopic)
    .onPublish(async (message) => {
      const { googleId, docId } = message.json;
      const startTime = Date.now();

      logger.info(`Starting ${config.name} for googleId: ${googleId}, docId: ${docId}`);

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
        const inputData = config.inputPath.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : null, docData);

        if (!inputData) {
          logger.error('Input data not found');
          await operations.updateField(docRef, {}, config.outputPath, config.fallbackValue);
          return;
        }

        // Process with API
        const apiResult = await callAnthropicAPI(inputData, config.instructions);

        if (apiResult.error) {
          throw new Error(`API error: ${apiResult.message}`);
        }

        // Update result
        await operations.updateField(docRef, docData, config.outputPath, apiResult.extractedText);

        // Trigger next step
        await operations.publishNext(config.nextTopic, { googleId, docId });

        logger.info(`Completed ${config.name} in ${Date.now() - startTime}ms`);

      } catch (error) {
        logger.error(`Error in ${config.name}:`, error);
        if (docRef) {
          await operations.updateField(docRef, {}, config.outputPath, config.fallbackValue);
        }
      }
    });
};

// Example usage for job description extraction
exports.extractJobDescription = createPipelineStep({
  name: 'extract_job_description',
  instructions: "Extract and faithfully reproduce the entire job posting, including all details about the position, company, and application process. Maintain the original structure, tone, and level of detail. Include the job title, location, salary (if provided), company overview, full list of responsibilities and qualifications (both required and preferred), unique aspects of the role or company, benefits, work environment details, and any specific instructions or encouragement for applicants. Preserve all original phrasing, formatting, and stylistic elements such as questions, exclamations, or creative language. Do not summarize, condense, or omit any information. The goal is to create an exact replica of the original job posting, ensuring all content and nuances are captured.",
  inputPath: 'texts.rawText',
  outputPath: 'texts.extractedText',
  triggerTopic: 'raw-text-stored',
  nextTopic: 'job-description-extracted',
  fallbackValue: 'na',
  collections: ['users', 'jobs'], // optional, defaults to ['users', 'jobs']
});

// Example usage for a different pipeline step
exports.anotherPipelineStep = createPipelineStep({
  name: 'extract_all_skills_needed',
  instructions: "List all skills needed for this job in a neutral and comprehensive way. If there is a structure of mandatory/required and or preferred/minimum, etc. keep these.",
  inputPath: 'texts.extractedText',
  outputPath: 'needed.skills',
  triggerTopic: 'job-description-extracted',
  nextTopic: 'different-next-topic',
  fallbackValue: 'na',
  collections: ['users', 'jobs'],
});
