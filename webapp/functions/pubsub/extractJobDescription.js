const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { Firestore } = require("firebase-admin/firestore");
const { PubSub } = require('@google-cloud/pubsub');
const { callAnthropicAPI } = require('.services/anthropic-service');

// Ensure Firestore instance is reused
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const pubSubClient = new PubSub();

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
      // Create document reference using googleId and docId
      const jobDocRef = db.collection('users').doc(googleId).collection('jobs').doc(docId);

      // Fetch job data from Firestore
      const docSnapshot = await jobDocRef.get();

      if (!docSnapshot.exists) {
        logger.error(`Document not found: ${jobDocRef.path}`);
        await populateWithNA(jobDocRef);
        return;
      }

      const jobData = docSnapshot.data();
      const rawJD = jobData.texts.rawText || "na"; // Use "na" if rawText is not available
      logger.info('Raw job description fetched from Firestore');

      if (rawJD === "na") {
        logger.warn('No raw text found for job');
        await populateWithNA(jobDocRef);
        return;
      }

      // Process text with Anthropic API using the new service
      const instruction = "Extract and faithfully reproduce the entire job posting, including all details about the position, company, and application process. Maintain the original structure, tone, and level of detail. Include the job title, location, salary (if provided), company overview, full list of responsibilities and qualifications (both required and preferred), unique aspects of the role or company, benefits, work environment details, and any specific instructions or encouragement for applicants. Preserve all original phrasing, formatting, and stylistic elements such as questions, exclamations, or creative language. Do not summarize, condense, or omit any information. The goal is to create an exact replica of the original job posting, ensuring all content and nuances are captured.";

      logger.info('Calling Anthropic API through service');
      
      const apiResult = await callAnthropicAPI(rawJD, instruction);

      if (apiResult.error) {
        logger.error('Error from Anthropic API service:', apiResult);
        await populateWithNA(jobDocRef);
        return;
      }

      logger.info('Received response from Anthropic API service');

      // Save extracted job description to Firestore
      await jobDocRef.update({
        texts: {
          ...jobData.texts, // Spread the existing texts object
          extractedText: apiResult.extractedText || "na",
        },
      });
      
      logger.info('Extracted job description saved to Firestore');

      const newTopicName = 'job-description-extracted';
      
      await pubSubClient.createTopic(newTopicName).catch((err) => {
        if (err.code === 6) {
          logger.info('Topic already exists');
        } else {
          throw err;
        }
      });

      const newMessage = {
        googleId: googleId,
        docId: docId
      };

      const newMessageId = await pubSubClient.topic(newTopicName).publishMessage({
        data: Buffer.from(JSON.stringify(newMessage)),
      });

      logger.info(`Message ${newMessageId} published to topic ${newTopicName}`);

    } catch (error) {
      logger.error('Error in extractJobDescription:', error);
      await populateWithNA(jobDocRef);
    }
  });

// Helper function to populate fields with "na"
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