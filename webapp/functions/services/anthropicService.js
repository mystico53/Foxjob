const fetch = require('node-fetch');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');
require('dotenv').config();

// Retry configuration
const MAX_RETRIES = 3;
const MINUTE_IN_MS = 60 * 1000;
const RETRY_DELAYS = [
  1 * MINUTE_IN_MS, // 1 minute
  2 * MINUTE_IN_MS, // 2 minutes
  3 * MINUTE_IN_MS  // 3 minutes
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff(operation, attemptNumber = 0) {
  try {
    return await operation();
  } catch (error) {
    if (error.response?.status === 429 || error.response?.status >= 500) {
      if (attemptNumber >= MAX_RETRIES) {
        throw error;
      }
      
      const delayMs = RETRY_DELAYS[attemptNumber];
      const delayMinutes = delayMs / MINUTE_IN_MS;
      logger.info(`Rate limited. Retrying in ${delayMinutes} minute(s). Retries left: ${MAX_RETRIES - attemptNumber}`);
      
      await sleep(delayMs);
      return retryWithBackoff(operation, attemptNumber + 1);
    }
    
    throw error;
  }
}

async function countTokensWithAnthropicAPI(messages, apiKey) {
  try {
    const operation = async () => {
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
        const errorText = await response.text();
        logger.warn('Token counting failed:', errorText);
        const error = new Error('Token counting failed');
        error.response = response;
        throw error;
      }

      const data = await response.json();
      return data.input_tokens;
    };

    return await retryWithBackoff(operation);
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

    const operation = async () => {
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

      if (!anthropicResponse.ok) {
        const errorData = await anthropicResponse.json();
        logger.error('Anthropic API error response:', errorData);
        const error = new Error('API request failed');
        error.response = anthropicResponse;
        throw error;
      }

      return await anthropicResponse.json();
    };

    const responseData = await retryWithBackoff(operation);

    if (responseData.content && responseData.content.length > 0 && responseData.content[0].type === 'text') {
      // Count output tokens using Anthropic's API
      const outputMessages = [{ role: 'assistant', content: responseData.content[0].text }];
      const outputTokenCount = await countTokensWithAnthropicAPI(outputMessages, apiKey);
      if (outputTokenCount !== null) {
        logger.info(`Output token count: ${outputTokenCount}`);
        logger.info(`Total tokens used: ${inputTokenCount + outputTokenCount}`);
      }
      
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