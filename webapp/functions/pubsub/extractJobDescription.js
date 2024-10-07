const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { logger } = require('firebase-functions');
const { Firestore } = require("firebase-admin/firestore");
const { PubSub } = require('@google-cloud/pubsub');

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

      // Process text with Anthropic API (extract the job description)
      const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

      if (!apiKey) {
        logger.error('Anthropic API key not found');
        await populateWithNA(jobDocRef);
        return;
      }

      const instruction = "Extract and faithfully reproduce the entire job posting, including all details about the position, company, and application process. Maintain the original structure, tone, and level of detail. Include the job title, location, salary (if provided), company overview, full list of responsibilities and qualifications (both required and preferred), unique aspects of the role or company, benefits, work environment details, and any specific instructions or encouragement for applicants. Preserve all original phrasing, formatting, and stylistic elements such as questions, exclamations, or creative language. Do not summarize, condense, or omit any information. The goal is to create an exact replica of the original job posting, ensuring all content and nuances are captured.";

      const prompt = `${instruction}\n\n${rawJD}`;

      logger.info('Calling Anthropic API');

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4096,
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      });

      const data = await anthropicResponse.json();

      if (!anthropicResponse.ok) {
        logger.error('Anthropic API error response:', data);
        await populateWithNA(jobDocRef);
        return;
      }

      logger.info('Received response from Anthropic API');

      let extractedJD;
      if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
        extractedJD = data.content[0].text.trim();
        logger.info('Job description extracted successfully');
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        extractedJD = "na";
      }

      // Save extracted job description to Firestore
      await jobDocRef.update({
        texts: {
          ...jobData.texts, // Spread the existing texts object
          extractedText: extractedJD || "na",
        },
      });
      
      logger.info('Extracted job description saved to Firestore');

      // Publish a new message to the "job-description-extracted" topic
      const newTopicName = 'job-description-extracted';
      
      // Ensure the new topic exists
      await pubSubClient.createTopic(newTopicName).catch((err) => {
        if (err.code === 6) {
          logger.info('Topic already exists');
        } else {
          throw err;
        }
      });

      // Prepare the new message (only including googleId and docId)
      const newMessage = {
        googleId: googleId,
        docId: docId
      };

      // Publish the new message
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
      extracted: "na"
    });
    logger.info('Field populated with "na" due to error');
  } catch (error) {
    logger.error('Error populating field with "na":', error);
  }
}