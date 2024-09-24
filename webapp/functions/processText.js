// processText.js

const functions = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
const fetch = require('node-fetch'); // Remove if using Node.js v18+
require('dotenv').config(); // For local development

exports.processText = onRequest(async (request, response) => {
  // Handle CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  // Get the 'text' from the request body
  const { text } = request.body;

  if (!text) {
    response.status(400).json({ error: 'No text provided' });
    return;
  }

  // Get the API key
  const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

  try {
    // Call the Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey, // Use the apiKey variable here
        'anthropic-version': '2023-06-01', // Required version header
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620', // Use the appropriate model name
        max_tokens: 200,
        messages: [
          { role: 'user', content: text }
        ],
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      // Log and return the error from Anthropic API
      console.error('Anthropic API error response:', data);
      response.status(anthropicResponse.status).json({ error: data });
      return;
    }

    // Send the assistant's reply back to the client
    response.json({
      result: data.content[0].text,
    });
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
});
