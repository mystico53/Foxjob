const fetch = require('node-fetch');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');

async function countTokensWithAnthropicAPI(messages, apiKey) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'token-counting-2024-11-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: messages
      })
    });

    if (!response.ok) {
      logger.warn('Token counting failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.input_tokens;
  } catch (error) {
    logger.warn('Error counting tokens:', error);
    return null;
  }
}

async function callAnthropicAPI(rawText, instruction) {
  try {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;
    
    if (!apiKey) {
      logger.error('Anthropic API key not found');
      return { error: true, message: 'API key not configured' };
    }

    const prompt = `${instruction}\n\n${rawText}`;
    
    // Count tokens using Anthropic's API
    const messages = [{ role: 'user', content: prompt }];
    const inputTokenCount = await countTokensWithAnthropicAPI(messages, apiKey);
    if (inputTokenCount !== null) {
      logger.info(`Input token count: ${inputTokenCount}`);
    }

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
        messages: messages
      }),
    });

    const responseData = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      logger.error('Anthropic API error response:', responseData);
      return { error: true, message: 'API request failed', details: responseData };
    }

    if (responseData.content && responseData.content.length > 0 && responseData.content[0].type === 'text') {
      // Count output tokens using Anthropic's API
      const outputMessages = [{ role: 'assistant', content: responseData.content[0].text }];
      const outputTokenCount = await countTokensWithAnthropicAPI(outputMessages, apiKey);
      if (outputTokenCount !== null) {
        logger.info(`Output token count: ${outputTokenCount}`);
        logger.info(`Total tokens used: ${inputTokenCount + outputTokenCount}`);
      }
      
      // Keep original response structure
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