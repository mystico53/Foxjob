const { OpenAI } = require('openai');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

// Configuration
const CONFIG = {
  model: 'gpt-4o-mini'
};

// Schema Definition
const getResponseSchema = () => {
  return z.object({
    hardSkillMatches: z.array(
      z.object({
        hardSkill: z.string(),
        assessment: z.string(),
        score: z.number(),
      })
    ),
    totalScore: z.number(),
    summary: z.string(),
  });
};

async function callOpenAIAPI(rawText, instruction) {
  try {
    // Get API key
    const apiKey = process.env.OPENAI_API_KEY || functions.config().openai.api_key;
    
    if (!apiKey) {
      logger.error('OpenAI API key not found');
      return { error: true, message: 'API key not configured' };
    }

    logger.info('Calling OpenAI API');
    const openai = new OpenAI({ apiKey });

    const completion = await openai.beta.chat.completions.parse({
      model: CONFIG.model,
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at structured data extraction.' 
        },
        { role: 'user', content: instruction }
      ],
      response_format: zodResponseFormat(
        getResponseSchema(),
        "skill_matching"
      ),
    });

    if (completion.choices && completion.choices.length > 0) {
      const parsedContent = completion.choices[0].message.parsed;
      
      // Validate scores are within range
      validateScores(parsedContent);
      
      logger.info('Successfully parsed and validated content');
      return { 
        error: false, 
        extractedText: parsedContent 
      };
    } else {
      logger.error('Invalid API response structure:', completion);
      return { error: true, message: 'Invalid API response structure' };
    }

  } catch (error) {
    logger.error('Error in API call:', error);
    return { 
      error: true, 
      message: error.message,
      details: error.response?.data || error 
    };
  }
}

function validateScores(parsedContent) {
  parsedContent.hardSkillMatches.forEach((match, index) => {
    if (match.score < 0 || match.score > 100) {
      throw new Error(`Score out of range for skill ${index + 1}: ${match.score}`);
    }
  });
  
  if (parsedContent.totalScore < 0 || parsedContent.totalScore > 100) {
    throw new Error(`Total score out of range: ${parsedContent.totalScore}`);
  }
}

module.exports = {
  callOpenAIAPI
};