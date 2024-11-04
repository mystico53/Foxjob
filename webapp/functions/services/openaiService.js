// functions/services/openaiService.js

const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');
require('dotenv').config();
const OpenAI = require('openai');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

// Initialize OpenAI API client
const openai = new OpenAI();

async function callOpenAIAPI(inputText, instructions) {
  try {
    // Construct the prompt
    const promptContent = `${instructions}\n\n${inputText}`;

    // Define a generic Zod schema for the expected response
    const ResponseSchema = z.object({
      extractedText: z.string(),
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Adjust the model as per your access
      messages: [
        { role: "system", content: "You are an assistant that extracts text based on instructions." },
        { role: "user", content: promptContent },
      ],
      response_format: zodResponseFormat(ResponseSchema, "text_extraction"),
    });

    const parsedContent = completion.choices[0].message.parsed;

    return { extractedText: parsedContent.extractedText, error: false };
  } catch (error) {
    logger.error('Error in OpenAI API call:', error);
    return { error: true, message: error.message };
  }
}

module.exports = { callOpenAIAPI };
