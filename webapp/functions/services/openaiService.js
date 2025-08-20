const { OpenAI } = require('openai');
const { logger } = require('firebase-functions');
const functions = require('firebase-functions');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

// Configuration
const CONFIG = {
	model: 'gpt-4o-mini'
};

// Retry configuration
const MAX_RETRIES = 3;
const MINUTE_IN_MS = 60 * 1000;
const RETRY_DELAYS = [
	1 * MINUTE_IN_MS, // 1 minute
	2 * MINUTE_IN_MS, // 2 minutes
	3 * MINUTE_IN_MS // 3 minutes
];

async function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
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
			logger.info(
				`Rate limited. Retrying in ${delayMinutes} minute(s). Retries left: ${MAX_RETRIES - attemptNumber}`
			);

			await sleep(delayMs);
			return retryWithBackoff(operation, attemptNumber + 1);
		}

		throw error;
	}
}

// Schema Definition
const getResponseSchema = () => {
	return z.object({
		hardSkillMatches: z.array(
			z.object({
				hardSkill: z.string(),
				assessment: z.string(),
				score: z.number()
			})
		),
		totalScore: z.number(),
		summary: z.string()
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

		const operation = async () => {
			const completion = await openai.beta.chat.completions.parse({
				model: CONFIG.model,
				messages: [
					{
						role: 'system',
						content: 'You are an expert at structured data extraction.'
					},
					{ role: 'user', content: instruction }
				],
				response_format: zodResponseFormat(getResponseSchema(), 'skill_matching')
			});

			if (!completion.choices || completion.choices.length === 0) {
				const error = new Error('Invalid API response structure');
				error.response = completion;
				throw error;
			}

			return completion;
		};

		const completion = await retryWithBackoff(operation);
		const parsedContent = completion.choices[0].message.parsed;

		// Validate scores are within range
		validateScores(parsedContent);

		logger.info('Successfully parsed and validated content');
		return {
			error: false,
			extractedText: parsedContent
		};
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
