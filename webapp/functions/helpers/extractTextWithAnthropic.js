// functions/helpers/extractTextWithAnthropic.js

const fetch = require('node-fetch'); // Remove if using Node.js v18+
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');

// Ensure Firebase Admin is initialized elsewhere to avoid multiple initializations
// Do not call admin.initializeApp() here

async function extractTextWithAnthropic(rawText) {
  const apiKey = process.env.ANTHROPIC_API_KEY || admin.config().anthropic.api_key;

  if (!apiKey) {
    logger.error('Anthropic API key not found');
    throw new Error('Anthropic API key not found');
  }

  const instruction = "Extract and reproduce the complete job description and company information from the given text, maintaining its original level of detail and verbosity. Include all information provided, such as job title and type, salary range, company name and background, detailed job responsibilities, required and preferred qualifications, company culture and work environment, benefits and perks, and application instructions or calls to action. Do not summarize, condense, or omit any parts of the description. Preserve all specific phrases, requirements, unique selling points, and creative language used to describe the position and company. Include any questions, exclamations, or engaging language used in the original text. The goal is to produce an output that captures all the content and nuances of the original job posting, ensuring no details are lost in the extraction process.";

  const prompt = `${instruction}\n\n${rawText}`;

  try {
    logger.info('Preparing to call Anthropic API');

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      logger.error('Anthropic API error response:', data);
      throw new Error(`Anthropic API Error: ${JSON.stringify(data)}`);
    }

    logger.info('Received response from Anthropic API');

    if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
      const content = data.content[0].text.trim();
      logger.info('Extracted Job Description:', content);
      return content;
    } else {
      logger.error('Unexpected Anthropic API response structure:', data);
      throw new Error('Unexpected Anthropic API response structure');
    }
  } catch (error) {
    logger.error('Error calling Anthropic API:', error);
    throw error;
  }
}

module.exports = { extractTextWithAnthropic };
