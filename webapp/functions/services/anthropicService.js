const fetch = require('node-fetch');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');

async function callAnthropicAPI(rawText, instruction) {
  try {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;
    
    if (!apiKey) {
      logger.error('Anthropic API key not found');
      return { error: true, message: 'API key not configured' };
    }

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

    const responseData = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      logger.error('Anthropic API error response:', responseData);
      return { error: true, message: 'API request failed', details: responseData };
    }

    if (responseData.content && responseData.content.length > 0 && responseData.content[0].type === 'text') {
      logger.info('Job description extracted successfully');
      return { 
        error: false, 
        extractedText: responseData.content[0].text.trim() 
      };
    } else {
      logger.error('Invalid API response structure:', responseData);
      return { error: true, message: 'Invalid API response structure' };
    }

  } catch (error) {
    logger.error('Error in API call:', error);
    return { error: true, message: error.message };
  }
}

module.exports = {
  callAnthropicAPI
};