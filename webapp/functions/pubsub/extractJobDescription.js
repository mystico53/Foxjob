const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const { callAnthropicAPI } = require('../services/anthropicService');

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

exports.extractJobDescription = functions.pubsub
  .topic('raw-text-stored')
  .onPublish(async (message) => {
    // Safely parse the message data
    let messageData;
    try {
      // Check if message.data exists and decode it
      if (!message.data) {
        throw new Error('No message data received');
      }
      
      const decodedData = Buffer.from(message.data, 'base64').toString();
      messageData = JSON.parse(decodedData);
    } catch (error) {
      logger.error('Error parsing message data:', error);
      return;
    }

    const { googleId, docId } = messageData;
    logger.info(`Starting process for googleId: ${googleId}, docId: ${docId}`);

    if (!googleId || !docId) {
      logger.error('Missing required information in the Pub/Sub message');
      return;
    }

    let jobDocRef;
    try {
      jobDocRef = db.collection('users').doc(googleId).collection('jobs').doc(docId);
      const docSnapshot = await jobDocRef.get();

      if (!docSnapshot.exists) {
        logger.error(`Document not found: ${jobDocRef.path}`);
        await populateWithNA(jobDocRef);
        return;
      }

      const jobData = docSnapshot.data();
      const rawJD = jobData.texts?.rawText || "na";
      logger.info('Raw job description fetched from Firestore');

      // Call the API function
      const apiResult = await callAnthropicAPI(rawJD);
      
      if (apiResult.error) {
        logger.error('API call failed:', apiResult.message);
        await populateWithNA(jobDocRef);
        return;
      }

      // Save to Firestore with merge to preserve existing data
      await jobDocRef.set({
        texts: {
          ...jobData.texts,
          extractedText: apiResult.extractedText,
        },
      }, { merge: true });
      
      logger.info('Extracted job description saved to Firestore');

      // Publish to next topic
      const newTopicName = 'job-description-extracted';
      
      try {
        await pubSubClient.createTopic(newTopicName);
      } catch (err) {
        if (err.code === 6) {
          logger.info('Topic already exists');
        } else {
          throw err;
        }
      }

      const newMessage = {
        googleId,
        docId
      };

      const newMessageId = await pubSubClient.topic(newTopicName).publishMessage({
        data: Buffer.from(JSON.stringify(newMessage)),
      });

      logger.info(`Message ${newMessageId} published to topic ${newTopicName}`);

    } catch (error) {
      logger.error('Error in extractJobDescription:', error);
      if (jobDocRef) {
        await populateWithNA(jobDocRef);
      }
    }
  });

// Helper function
async function populateWithNA(docRef) {
  try {
    await docRef.set({
      texts: {
        extractedText: "na"
      }
    }, { merge: true });
    logger.info('Field populated with "na" due to error');
  } catch (error) {
    logger.error('Error populating field with "na":', error);
  }
}