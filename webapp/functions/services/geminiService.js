const { GoogleGenerativeAI } = require('@google/generative-ai');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');
require('dotenv').config();

// Retry configuration
const MAX_RETRIES = 3;
const MINUTE_IN_MS = 60 * 1000;
const RETRY_DELAYS = [
  1 * MINUTE_IN_MS,
  2 * MINUTE_IN_MS,
  3 * MINUTE_IN_MS
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff(operation, attemptNumber = 0) {
  try {
    return await operation();
  } catch (error) {
    // Handle both Gemini-specific and general rate limit errors
    const isRateLimit = error.status === 429 || 
                       error.message?.includes('rate') ||
                       error.message?.includes('quota');
    const isServerError = error.status >= 500;

    if (isRateLimit || isServerError) {
      if (attemptNumber >= MAX_RETRIES) {
        logger.error('Max retries reached:', error);
        throw error;
      }
      
      const delayMs = RETRY_DELAYS[attemptNumber];
      const delayMinutes = delayMs / MINUTE_IN_MS;
      logger.info(`Rate limited or server error. Retrying in ${delayMinutes} minute(s). Retries left: ${MAX_RETRIES - attemptNumber}`);
      
      await sleep(delayMs);
      return retryWithBackoff(operation, attemptNumber + 1);
    }
    
    throw error;
  }
}

async function callGeminiAPI(rawText, instruction, options = {}) {
  try {
    // Get API key with fallbacks
    const apiKey = process.env.GEMINI_API_KEY || 
                  functions.config().gemini?.api_key;
    
    if (!apiKey) {
      logger.error('Gemini API key not found');
      return { error: true, message: 'API key not configured' };
    }

    const prompt = `${instruction}\n\n${rawText}`;
    
    const operation = async () => {
      // Initialize Gemini with configurable options
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: options.model || "gemini-2.0-flash",
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxOutputTokens || 2048,
          ...options.generationConfig
        }
      });

      logger.info('Sending request to Gemini API', { 
        promptLength: prompt.length,
        model: options.model || "gemini-2.0-flash"
      });
      
      const result = await model.generateContent(prompt);
      
      if (!result.response) {
        throw new Error('Empty response from Gemini API');
      }

      // Log success but not the full response
      logger.info('Received response from Gemini API', {
        responseLength: result.response.text().length
      });

      return result;
    };

    const responseData = await retryWithBackoff(operation);
    
    const extractedText = responseData.response.text();
    logger.info('Content generated successfully');
    
    return {
      error: false,
      extractedText: extractedText.trim()
    };

  } catch (error) {
    logger.error('Error in Gemini API call:', {
      error: error.message,
      stack: error.stack,
      prompt: rawText.substring(0, 100) + '...' // Log only start of prompt
    });
    return { 
      error: true, 
      message: error.message 
    };
  }
}

module.exports = {
  callGeminiAPI,
  retryWithBackoff // Exported for testing purposes
};