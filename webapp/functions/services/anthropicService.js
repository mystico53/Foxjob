const fetch = require('node-fetch');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');

async function callAnthropicAPI(rawText, instructions) {
  try {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;
    
    if (!apiKey) {
      logger.error('Anthropic API key not found');
      return { error: true, message: 'API key not configured' };
    }

    const prompt = `${instructions}\n\n${rawText}`;
    
    // Log the request details (excluding sensitive data)
    logger.info('Anthropic API Request:', {
      model: 'claude-3-haiku-20240307',
      instructionsPreview: instructions.substring(0, 100) + '...',
      rawTextPreview: rawText.substring(0, 100) + '...',
      promptLength: prompt.length
    });

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

    // Log full response data
    logger.info('Full Anthropic API Response:', {
      status: anthropicResponse.status,
      headers: Object.fromEntries(anthropicResponse.headers.entries()),
      body: responseData
    });

    if (!anthropicResponse.ok) {
      logger.error('Anthropic API error response:', responseData);
      return { error: true, message: 'API request failed', details: responseData };
    }

    if (responseData.content && responseData.content.length > 0 && responseData.content[0].type === 'text') {
      // Log successful extraction with full text
      logger.info('Job description extracted successfully:', {
        fullText: responseData.content[0].text,
        textLength: responseData.content[0].text.length,
        contentTypes: responseData.content.map(c => c.type)
      });
      
      return { 
        error: false, 
        extractedText: responseData.content[0].text.trim() 
      };
    } else {
      logger.error('Invalid API response structure:', {
        responseData,
        content: responseData.content,
        contentTypes: responseData.content?.map(c => c.type)
      });
      return { error: true, message: 'Invalid API response structure' };
    }

  } catch (error) {
    logger.error('Error in API call:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    return { error: true, message: error.message };
  }
}

module.exports = {
  callAnthropicAPI
};