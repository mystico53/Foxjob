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

  const instruction = "Extract and faithfully reproduce the entire job posting, including all details about the position, company, and application process. Maintain the original structure, tone, and level of detail. Include the job title, location, salary (if provided), company overview, full list of responsibilities and qualifications (both required and preferred), unique aspects of the role or company, benefits, work environment details, and any specific instructions or encouragement for applicants. Preserve all original phrasing, formatting, and stylistic elements such as questions, exclamations, or creative language. Do not summarize, condense, or omit any information. The goal is to create an exact replica of the original job posting, ensuring all content and nuances are captured.";

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
        max_tokens:  4096,
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
