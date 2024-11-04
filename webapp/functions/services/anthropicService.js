const fetch = require('node-fetch');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');

const cleanJson = (text) => {
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
  
  try {
    JSON.parse(result);
    return result;
  } catch (error) {
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
    
    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: prompt }
      ],
    };

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      logger.error('API error:', responseData);
      return { error: true, message: 'API request failed', details: responseData };
    }

    if (responseData.content && responseData.content.length > 0 && responseData.content[0].type === 'text') {
      const rawText = responseData.content[0].text.trim();
      
      try {
        if (!rawText.startsWith('{') && !rawText.startsWith('[')) {
          return {
            error: false,
            extractedText: rawText
          };
        }
        
        const cleanedText = cleanJson(rawText);
        const parsedJson = JSON.parse(cleanedText);
        
        return { 
          error: false, 
          extractedText: JSON.stringify(parsedJson)
        };
      } catch (parseError) {
        return {
          error: false,
          extractedText: rawText
        };
      }
    }

    logger.error('Invalid API response structure');
    return { error: true, message: 'Invalid API response structure' };

  } catch (error) {
    logger.error('API call error:', error);
    return { error: true, message: error.message };
  }
}

module.exports = {
  callAnthropicAPI
};