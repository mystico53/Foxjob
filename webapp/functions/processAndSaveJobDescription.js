const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { logger } = require('firebase-functions');
const { Firestore } = require("firebase-admin/firestore");

// Ensure Firestore instance is reused
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

exports.processAndSaveJobDescription = functions.pubsub
  .topic('raw-text-stored')
  .onPublish(async (message) => {
    const messageData = message.json;
    const { docRef, googleId } = messageData;

    logger.info(`Starting process for googleId: ${googleId}, docRef: ${docRef}`);

    if (!docRef || !googleId) {
      logger.error('Missing docRef or googleId in the Pub/Sub message');
      return;
    }

    try {
      // 1. Fetch raw text from Firestore
      const docSnapshot = await db.doc(docRef).get();

      if (!docSnapshot.exists) {
        logger.error(`Document not found: ${docRef}`);
        return;
      }

      const rawText = docSnapshot.data().rawtext;
      logger.info('Raw text fetched from Firestore');

      // 2. Process text with Anthropic API
      const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

      if (!apiKey) {
        logger.error('Anthropic API key not found');
        throw new Error('Anthropic API key not found');
      }

      const instruction = "Extract and faithfully reproduce the entire job posting, including all details about the position, company, and application process. Maintain the original structure, tone, and level of detail. Include the job title, location, salary (if provided), company overview, full list of responsibilities and qualifications (both required and preferred), unique aspects of the role or company, benefits, work environment details, and any specific instructions or encouragement for applicants. Preserve all original phrasing, formatting, and stylistic elements such as questions, exclamations, or creative language. Do not summarize, condense, or omit any information. The goal is to create an exact replica of the original job posting, ensuring all content and nuances are captured.";

      const prompt = `${instruction}\n\n${rawText}`;

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

      let extractedText;
      if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
        extractedText = data.content[0].text.trim();
        logger.info('Job description extracted successfully');
      } else {
        logger.error('Unexpected Anthropic API response structure:', data);
        throw new Error('Unexpected Anthropic API response structure');
      }

      // 3. Save extracted text to Firestore
      const extractedRef = db.doc(`${docRef}/extracted/response`);
      await extractedRef.set({
        extractedJD: extractedText,
        timestamp: Firestore.FieldValue.serverTimestamp()
      });

      logger.info('Extracted job description saved to Firestore');

    } catch (error) {
      logger.error('Error in processAndSaveJobDescription:', error);
    }
  });