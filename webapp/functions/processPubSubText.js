const { onRequest } = require('firebase-functions/v2/https');
const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const fetch = require('node-fetch'); // Remove if using Node.js v18+
require('dotenv').config(); // For local development
const admin = require('firebase-admin');
const { saveExtractedJDText } = require('./helpers/saveExtractedJDText');
const { logger } = require('firebase-functions');
const { Firestore } = require("firebase-admin/firestore");
const config = require('./config');

if (!admin.apps.length) {
  admin.initializeApp();
  const db = admin.firestore();

  // Initialize Firestore emulator only once
  if (config.pubsub.useEmulator) {
    console.log('Connecting to Firestore emulator');
    db.settings({
      host: 'localhost:8080', // Default Firestore emulator port
      ssl: false,
    });
  }
}

// Ensure Firestore instance is reused
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function saveProcessedData(googleId, processedData, url) {
  try {
    // Create a reference to the user's document
    const userRef = db.collection('users').doc(googleId);

    // Add the processed data to the user's 'processed' subcollection
    const processedRef = await userRef.collection('processed').add({
      ...processedData,
      url: url,
      timestamp: Firestore.FieldValue.serverTimestamp()
    });

    console.log('Document written with ID: ', processedRef.id);
    return processedRef.id;
  } catch (error) {
    console.error("Error writing to Firestore: ", error);
    throw error;
  }
}

exports.processPubSubText = onMessagePublished('job-text-submitted', async (event) => {
  console.log('processText function called');
  console.log('Current environment:', config.node_env);

  const pubSubMessage = event.data.message.data
    ? JSON.parse(Buffer.from(event.data.message.data, 'base64').toString())
    : null;

  if (!pubSubMessage) {
    console.error('No valid message received from Pub/Sub');
    return;
  }

  // Extract parameters from the Pub/Sub message
  const { text, url, instructions, googleId } = pubSubMessage;

  console.log('Received message with:', {
    textLength: text ? text.length : 0,
    url,
    instructionsProvided: !!instructions,
    googleId,
  });

  if (!text || !url || !instructions || !googleId) {
    console.error('Missing required parameters');
    return;
  }

  // Get the API key
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('Anthropic API key not found');
    return;
  }

  try {
    // Prepare the prompt for the Anthropic API
    const prompt = instructions.prompt.replace("{TEXT}", text + `\n\nURL: ${url}\nGoogle ID: ${googleId}`);
    console.log('Prepared prompt:', prompt);

    // Call the Anthropic API
    console.log('Calling Anthropic API');
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: instructions.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error('Anthropic API error response:', data);
      return;
    }

    console.log('Received response from Anthropic API');

    // Parse the JSON response from the Anthropic API
    if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
      const content = data.content[0].text.trim();
      console.log('Raw content from Anthropic:', content);
      try {
        const jsonContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsedResult = JSON.parse(jsonContent);
        console.log('Successfully parsed JSON result');

        // Save the processed data to Firestore
        const firestoreDocId = await saveProcessedData(googleId, parsedResult, url);
        console.log('Data saved to Firestore with ID:', firestoreDocId);

        // Save the extractedJDText text to Firestore
        try {
          const result = await saveExtractedJDText({ googleId, processedDocId: firestoreDocId, rawText: text });
          logger.info('extractedJDText text saved with ID:', result.id);
        } catch (error) {
          logger.error('Failed to save extractedJDText text:', error);
        }

        console.log('Processing completed successfully');
      } catch (error) {
        console.error('Error parsing JSON or saving to Firestore:', error);
      }
    } else {
      console.error('Unexpected Anthropic API response structure:', data);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }

  console.log('processText function completed');
});