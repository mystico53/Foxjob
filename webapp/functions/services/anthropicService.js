const fetch = require('node-fetch');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');

const cleanJson = (text) => {
  // First try parsing as-is
  try {
    JSON.parse(text);
    return text;
  } catch (e) {
    // If parsing fails, proceed with cleaning
  }

  // Process line by line
  const lines = text.split('\n').map(line => {
    if (line.includes(':')) {
      const [beforeColon, ...afterColonParts] = line.split(':');
      const afterColon = afterColonParts.join(':');
      
      let cleanedValue = afterColon.trim();
      
      // Handle string values
      if (cleanedValue.startsWith('"')) {
        // Remove start/end quotes
        cleanedValue = cleanedValue.slice(1);
        if (cleanedValue.endsWith('",') || cleanedValue.endsWith('"')) {
          cleanedValue = cleanedValue.slice(0, -1);
        }
        
        // Clean up quotes and wrap properly
        cleanedValue = cleanedValue
          .replace(/(?<!\\)"/g, '\\"')  // Escape unescaped quotes
          .replace(/[""]|'/g, '"');     // Replace smart quotes
        
        cleanedValue = `"${cleanedValue}"`;
        if (afterColon.trim().endsWith(',')) {
          cleanedValue += ',';
        }
      }
      
      return `${beforeColon.trim()}:${cleanedValue}`;
    }
    return line;
  });
  
  const result = lines.join('\n');
  
  // Final validation
  try {
    JSON.parse(result);
    return result;
  } catch (error) {
    logger.warn('JSON cleaning resulted in invalid JSON, returning original');
    return text;
  }
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
        // Check if it's trying to be JSON
        if (!rawText.startsWith('{') && !rawText.startsWith('[')) {
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
        logger.warn('JSON parsing failed, returning raw text:', {
          error: parseError.message
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