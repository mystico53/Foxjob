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

  // Get the 'text', 'url', and 'instructions' from the request body
  const { text, url, instructions } = request.body;

  if (!text || !url || !instructions) {
    response.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  // Get the API key
  const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

  try {
    // Prepare the prompt
    const prompt = instructions.prompt.replace("{TEXT}", text + `\n\nURL: ${url}`);

    // Call the Anthropic API
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

    // Parse the JSON response
    if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
      const content = data.content[0].text.trim();
      try {
        const jsonContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsedResult = JSON.parse(jsonContent);
        response.json({ result: parsedResult });
      } catch (error) {
        console.error('Error parsing JSON:', error);
        response.status(500).json({ error: 'Error parsing Anthropic response' });
      }
    } else {
      response.status(500).json({ error: 'Unexpected Anthropic API response structure' });
    }
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
});