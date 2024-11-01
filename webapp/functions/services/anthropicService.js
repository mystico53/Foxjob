const fetch = require('node-fetch');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');
const { z } = require('zod');

// Simplified approach: just clean the text before JSON parsing
const sanitizeJsonText = (text) => {
  return text.replace(/(?<=:\s*)"([^"]*)"(?=\s*[,}])/g, (match, p1) => {
    return `"${p1.replace(/"/g, "'")}"`;
  });
};

async function callAnthropicAPI(rawText, instructions) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;
    
    if (!apiKey) {
      logger.error('Anthropic API key not found');
      return { error: true, message: 'API key not configured' };
    }

    const prompt = `${instructions}\n\n${rawText}`;
    
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
      const rawText = responseData.content[0].text.trim();
      
      try {
        // Sanitize text before parsing
        const sanitizedText = sanitizeJsonText(rawText);
        const parsedJson = JSON.parse(sanitizedText);
        
        logger.info('JSON response processed successfully:', {
          fullText: JSON.stringify(parsedJson),
          textLength: rawText.length,
          contentTypes: responseData.content.map(c => c.type)
        });
        
        return { 
          error: false, 
          extractedText: JSON.stringify(parsedJson)
        };
      } catch (parseError) {
        // If it's not JSON or can't be sanitized, return as-is
        logger.info('Returning raw text response:', {
          fullText: rawText,
          textLength: rawText.length,
          contentTypes: responseData.content.map(c => c.type)
        });
        
        return {
          error: false,
          extractedText: rawText
        };
      }
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