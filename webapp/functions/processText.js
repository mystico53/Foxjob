// functions/processText.js

const { onRequest } = require('firebase-functions/v2/https');
const fetch = require('node-fetch'); // Remove if using Node.js v18+
require('dotenv').config(); // For local development
const admin = require('firebase-admin');
const { saveUnprocessedText } = require('./helpers/saveUnprocessedText');
const { logger } = require('firebase-functions');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

async function saveProcessedData(googleId, processedData, url) {
  try {
    const db = admin.firestore();
    
    // Create a reference to the user's document
    const userRef = db.collection('users').doc(googleId);

    // Add the processed data to the user's 'processed' subcollection
    const processedRef = await userRef.collection('processed').add({
      ...processedData,
      url: url,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Document written with ID: ', processedRef.id);
    return processedRef.id;
  } catch (error) {
    console.error("Error writing to Firestore: ", error);
    throw error;
  }
}

exports.processText = onRequest(async (request, response) => {
  console.log('processText function called');

  // Handle CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    response.status(204).send('');
    return;
  }

  // Extract parameters from the request body
  const { text, url, instructions, googleId } = request.body;

  console.log('Received request with:', {
    textLength: text ? text.length : 0,
    url,
    instructionsProvided: !!instructions,
    googleId
  });

  if (!text || !url || !instructions || !googleId) {
    console.error('Missing required parameters');
    response.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  // Get the API key
  const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

  if (!apiKey) {
    console.error('Anthropic API key not found');
    response.status(500).json({ error: 'Server configuration error' });
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
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error('Anthropic API error response:', data);
      response.status(anthropicResponse.status).json({ error: data });
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

        // **Save the unprocessed text to Firestore**
        try {
          const result = await saveUnprocessedText({ googleId, processedDocId: firestoreDocId, rawText: text });
          logger.info('Unprocessed text saved with ID:', result.id);
        } catch (error) {
          logger.error('Failed to save unprocessed text:', error);
          // Depending on your requirements, you might choose to proceed or return an error
          // Here, we'll proceed
        }

        // Respond with the processed result and Firestore document ID
        response.json({ result: parsedResult, firestoreDocId });
      } catch (error) {
        console.error('Error parsing JSON or saving to Firestore:', error);
        response.status(500).json({ error: 'Error processing response or saving to database' });
      }
    } else {
      console.error('Unexpected Anthropic API response structure:', data);
      response.status(500).json({ error: 'Unexpected Anthropic API response structure' });
    }
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    response.status(500).json({ error: 'Internal server error' });
  }

  console.log('processText function completed');
});
