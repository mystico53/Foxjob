const fetch = require('node-fetch');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');

// Remove any quotes that aren't field name quotes
const cleanJson = (text) => {
  // Process line by line
  const lines = text.split('\n').map(line => {
    if (line.includes(':')) {
      const [beforeColon, ...afterColonParts] = line.split(':');
      const afterColon = afterColonParts.join(':');
      
      let cleanedValue = afterColon.trim();
      if (cleanedValue.startsWith('"')) {
        cleanedValue = cleanedValue.slice(1);
        if (cleanedValue.endsWith('",') || cleanedValue.endsWith('"')) {
          cleanedValue = cleanedValue.slice(0, -1);
        }
        // Remove ALL quotes inside the value
        cleanedValue = cleanedValue.replace(/["""]|"/g, '');
        // Add back JSON quotes
        cleanedValue = `"${cleanedValue}"`;
        if (afterColon.trim().endsWith(',')) {
          cleanedValue += ',';
        }
      }
      return `${beforeColon}:${cleanedValue}`;
    }
    return line;
  });
  
  return lines.join('\n');
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

    if (!anthropicResponse.ok) {
      logger.error('Anthropic API error response:', responseData);
      return { error: true, message: 'API request failed', details: responseData };
    }

    if (responseData.content && responseData.content.length > 0 && responseData.content[0].type === 'text') {
      const rawText = responseData.content[0].text.trim();
      
      try {
        // Check if it's even trying to be JSON
        if (!rawText.startsWith('{') && !rawText.startsWith('[')) {
          logger.info('Received non-JSON response, returning as-is:', {
            textPreview: rawText.substring(0, 100) + '...'
          });
          return {
            error: false,
            extractedText: rawText
          };
        }
        
        // Clean and parse JSON
        const cleanedText = cleanJson(rawText);
        const parsedJson = JSON.parse(cleanedText);
        
        return { 
          error: false, 
          extractedText: JSON.stringify(parsedJson)
        };
      } catch (parseError) {
        // If JSON parsing fails, return the raw text instead of error
        logger.info('JSON parsing failed, returning raw text:', {
          error: parseError.message,
          textPreview: rawText.substring(0, 100) + '...'
        });
        
        return {
          error: false,
          extractedText: rawText
        };
      }
    }

    logger.error('Invalid API response structure');
    return { error: true, message: 'Invalid API response structure' };

  } catch (error) {
    logger.error('Error in API call:', error);
    return { error: true, message: error.message };
  }
}

module.exports = {
  callAnthropicAPI
};