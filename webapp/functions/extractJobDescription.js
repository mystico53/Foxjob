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
      // 1. Fetch extracted job description from Firestore
      const rawDocPath = `users/${googleId}/jobs/${docId}/raw/document`;
      const docSnapshot = await db.doc(rawDocPath).get();

      if (!docSnapshot.exists) {
        logger.error(`Document not found: ${rawDocPath}`);
        return;
      }

      const rawData = docSnapshot.data();
      const extractedJD = rawData.rawtext; // Assuming the raw text is stored in 'rawtext' field
      logger.info('Raw job description fetched from Firestore');

      // 2. Process text with Anthropic API (example: summarize the job description)
      const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

      if (!apiKey) {
        logger.error('Anthropic API key not found');
        throw new Error('Anthropic API key not found');
      }

      const instruction = "Summarize the key points of this job description in bullet points. Include the job title, main responsibilities, required qualifications, and any standout benefits or company information.";

      const prompt = `${instruction}\n\n${extractedJD}`;

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
          max_tokens: 1000,
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      });

      const data = await anthropicResponse.json();

      if (!anthropicResponse.ok) {
        logger.error('Anthropic API error response:', data);
        throw new Error(`Anthropic API Error: ${JSON.stringify(data)}`);
      }

      logger.info('Received response from Anthropic API');

      let summarizedJD;
      if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
        summarizedJD = data.content[0].text.trim();
        logger.info('Job description summarized successfully');
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new Error('Unexpected Anthropic API response structure');
      }

      // 3. Save extracted and summarized job description to Firestore
      const extractedPath = `users/${googleId}/jobs/${docId}/extracted/document`;
      const extractedRef = db.doc(extractedPath);
      await extractedRef.set({
        extractedJD: extractedJD,
        summarizedJD: summarizedJD,
        url: rawData.url, // Preserve the URL from the raw data
        timestamp: Firestore.FieldValue.serverTimestamp()
      });

      logger.info('Extracted and summarized job description saved to Firestore');

      // 4. Publish a new message to the "job-description-summarized" topic
      const newTopicName = 'job-description-extracted';
      
      // Ensure the new topic exists
      await pubSubClient.createTopic(newTopicName).catch((err) => {
        if (err.code === 6) {
          logger.info('Topic already exists');
        } else {
          throw err;
        }
      });

      // Prepare the new message
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
      logger.error('Error in processExtractedJobDescription:', error);
    }
  });