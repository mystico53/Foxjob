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
      // 1. Fetch raw job description from Firestore
      const rawDocPath = `users/${googleId}/jobs/${docId}/raw/document`;
      const docSnapshot = await db.doc(rawDocPath).get();

      if (!docSnapshot.exists) {
        logger.error(`Document not found: ${rawDocPath}`);
        return;
      }

      const rawData = docSnapshot.data();
      const rawJD = rawData.rawtext; // Assuming the raw text is stored in 'rawtext' field
      logger.info('Raw job description fetched from Firestore');

      // 2. Process text with Anthropic API (extract the job description)
      const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

      if (!apiKey) {
        logger.error('Anthropic API key not found');
        throw new Error('Anthropic API key not found');
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
        throw new Error(`Anthropic API Error: ${JSON.stringify(data)}`);
      }

      logger.info('Received response from Anthropic API');

      let extractedJD;
      if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
        extractedJD = data.content[0].text.trim();
        logger.info('Job description extracted successfully');
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new Error('Unexpected Anthropic API response structure');
      }

      // 3. Save extracted job description to Firestore
      const extractedPath = `users/${googleId}/jobs/${docId}/extracted/document`;
      const extractedRef = db.doc(extractedPath);
      await extractedRef.set({
        extractedJD: extractedJD,
        url: rawData.url, // Preserve the URL from the raw data
        timestamp: Firestore.FieldValue.serverTimestamp()
      });

      logger.info('Extracted job description saved to Firestore');

      // 4. Publish a new message to the "job-description-extracted" topic
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
      logger.error('Error in extractJobDescription:', error);
    }
  });