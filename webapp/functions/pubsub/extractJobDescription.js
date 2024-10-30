const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const { callAnthropicAPI } = require('../services/anthropicService');

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

// Firestore helper functions
async function getJobDocument(googleId, docId) {
  const jobDocRef = db.collection('users').doc(googleId).collection('jobs').doc(docId);
  const docSnapshot = await jobDocRef.get();
  return { jobDocRef, docSnapshot };
}

async function updateJobDescription(docRef, jobData, extractedText) {
  await docRef.update({
    texts: {
      ...jobData.texts,
      extractedText,
    },
  });
  logger.info('Extracted job description saved to Firestore');
}

async function populateWithNA(docRef) {
  try {
    await docRef.update({
      texts: {
        extractedText: "na"
      }
    });
    logger.info('Field populated with "na" due to error');
  } catch (error) {
    logger.error('Error populating field with "na":', error);
  }
}

// PubSub helper functions
async function createTopicIfNotExists(topicName) {
  try {
    await pubSubClient.createTopic(topicName);
  } catch (err) {
    if (err.code === 6) {
      logger.info('Topic already exists');
    } else {
      throw err;
    }
  }
}

async function publishToPubSub(topicName, message) {
  await createTopicIfNotExists(topicName);
  const messageId = await pubSubClient.topic(topicName).publishMessage({
    data: Buffer.from(JSON.stringify(message)),
  });
  logger.info(`Message ${messageId} published to topic ${topicName}`);
  return messageId;
}

// Main function
exports.extractJobDescription = functions.pubsub
  .topic('raw-text-stored')
  .onPublish(async (message) => {
    const messageData = message.json;
    const { googleId, docId } = messageData;

    logger.info(`Starting process for googleId: ${googleId}, docId: ${docId}`);

    if (!googleId || !docId) {
      logger.error('Missing required information in the Pub/Sub message');
      return;
    }

    try {
      // Get job document
      const { jobDocRef, docSnapshot } = await getJobDocument(googleId, docId);

      if (!docSnapshot.exists) {
        logger.error(`Document not found: ${jobDocRef.path}`);
        await populateWithNA(jobDocRef);
        return;
      }

      const jobData = docSnapshot.data();
      const rawJD = jobData.texts.rawText || "na";
      logger.info('Raw job description fetched from Firestore');

      // Process with Anthropic API
      const apiResult = await callAnthropicAPI(rawJD);
      
      if (apiResult.error) {
        logger.error('API call failed:', apiResult.message);
        await populateWithNA(jobDocRef);
        return;
      }

      // Update Firestore
      await updateJobDescription(jobDocRef, jobData, apiResult.extractedText);

      // Publish to next topic
      await publishToPubSub('job-description-extracted', { googleId, docId });

    } catch (error) {
      logger.error('Error in extractJobDescription:', error);
      const { jobDocRef } = await getJobDocument(googleId, docId);
      await populateWithNA(jobDocRef);
    }
  });