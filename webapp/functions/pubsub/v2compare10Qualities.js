const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const { callAnthropicAPI } = require('../services/anthropicService');

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

// Config
const CONFIG = {
	topics: {
		qualitiesGathered: 'ten-qualities-gathered-DISABLED',
		qualitiesMatched: 'qualities-resumetext-added'
	},
	collections: {
		users: 'users'
	},
	instructions: {
		qualityMatching: `
    You are tasked with finding VERBATIM QUOTES from a candidate's resume that best demonstrate each required quality.

CRITICAL PROCESS - Follow these steps IN ORDER:

1. First scan the resume:
   - Confirm you see the resume text by showing the first 100 characters
   - Make a first pass to identify ALL potential quotes that could match ANY of the qualities
   - For each quote you find, note which qualities it could demonstrate

2. For each quality requirement:
   - Start with quotes that UNIQUELY demonstrate this quality
   - If a quote could match multiple qualities, explicitly decide which ONE quality it best demonstrates
   - Once you assign a quote to a quality, it CANNOT be used for any other quality
   - For each match you find, verify it appears EXACTLY in the resume text - copy/paste only
   - If no unused relevant quotes remain for a quality, return empty resumeText with explanation

3. For each quality, your response must be EXACTLY ONE of these:
   A) A verbatim quote that appears in the resume text, OR
   B) Empty resumeText ("") with explanation if no suitable unused quote exists

4. Double-check before responding:
   - Verify every quote appears WORD FOR WORD in the resume
   - Verify no quote is used more than once
   - Verify you never return requirement text as a quote
   - Verify each location field accurately describes where the quote was found

5. Never:
   - Return multiple matches for the same quality ID
   - Use the same quote for different qualities
   - Return text from the requirements as if it were a quote
   - Modify, rephrase, or clean up the resume text
   - Combine multiple parts of the resume into one quote
   - Standardize formatting or punctuation
   - Make up or generate text that isn't in the resume

Your response must follow this EXACT structure:
{
  "confirmation": "First 100 chars of resume I'm searching: [insert first 100 chars here]",
  "qualityMatches": {
    "Q1": {
      "resumeText": "EXACT quote from resume, preserving all formatting, spacing, and punctuation",
      "location": "Found in [specific section/line number]"
    }
  }
}

If you cannot find an unused quote for a quality:
{
  "qualityMatches": {
    "Q1": {
      "resumeText": "",
      "location": "No suitable match found because [specific reason - e.g. 'while the resume shows product management skills in educational software, it lacks specific ecommerce experience' or 'the strongest demonstration of agile methodology was already assigned to Q2']"
    }
  }
}

The resume text to search through is:
"""
{resumeText}
"""
    `
	}
};

const normalizeSpaces = (text) => {
	return text.replace(/\s+/g, ' ').trim();
};

// Firestore Service
const firestoreService = {
	async getResumeText(firebaseUid) {
		logger.info(`Starting getResumeText for firebaseUid: ${firebaseUid}`);

		const userCollectionsRef = db
			.collection('users')
			.doc(firebaseUid)
			.collection('UserCollections');
		logger.info(`Created reference to UserCollections: ${userCollectionsRef.path}`);

		const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
		logger.info('Executing resume query with type=="Resume"');

		const resumeSnapshot = await resumeQuery.get();
		logger.info(
			`Resume query completed. Empty? ${resumeSnapshot.empty}. Size: ${resumeSnapshot.size}`
		);

		if (resumeSnapshot.empty) {
			logger.error(
				`No resume found for user ID: ${firebaseUid}. Collection path: ${userCollectionsRef.path}`
			);
			throw new Error(`No resume found for user ID: ${firebaseUid}`);
		}

		const resumeDoc = resumeSnapshot.docs[0];
		const resumeData = resumeDoc.data();

		logger.info('Resume document data:', {
			id: resumeDoc.id,
			path: resumeDoc.ref.path,
			hasExtractedText: Boolean(resumeData.extractedText),
			extractedTextLength: resumeData.extractedText ? resumeData.extractedText.length : 0,
			documentFields: Object.keys(resumeData)
		});

		if (!resumeData.extractedText) {
			logger.error('Resume document found but extractedText is missing or empty', {
				documentId: resumeDoc.id,
				availableFields: Object.keys(resumeData)
			});
			throw new Error('Resume document found but extractedText is missing');
		}
		return normalizeSpaces(resumeData.extractedText);
	},

	getJobDocRef(firebaseUid, docId) {
		const docRef = db.collection('users').doc(firebaseUid).collection('jobs').doc(docId);

		logger.info(`Created job document reference: ${docRef.path}`);
		return docRef;
	},

	async getJobDocument(docRef) {
		logger.info(`Fetching job document from: ${docRef.path}`);

		const snapshot = await docRef.get();
		logger.info(`Job document fetch completed. Exists? ${snapshot.exists}`);

		if (!snapshot.exists) {
			logger.error(`Document not found at path: ${docRef.path}`);
			throw new Error(`Document not found: ${docRef.path}`);
		}

		const data = snapshot.data();
		logger.info('Job document data retrieved:', {
			hasQualities: Boolean(data.qualities),
			qualityCount: data.qualities ? Object.keys(data.qualities).length : 0,
			documentFields: Object.keys(data)
		});

		return data;
	},

	async updateQualityMatches(docRef, qualityMatches, resumeText) {
		logger.info(`Starting quality matches update for doc: ${docRef.path}`, {
			numberOfMatches: Object.keys(qualityMatches).length,
			resumeTextLength: resumeText.length
		});

		const batch = db.batch();
		const usedQuotes = new Set();

		// First, update the full resume text
		batch.update(docRef, {
			'qualities.resumeText': resumeText
		});

		// Then update individual quality matches
		Object.entries(qualityMatches).forEach(([qualityId, matchData]) => {
			logger.info(`Processing quality ${qualityId}:`, matchData);

			let resumeText = matchData?.resumeText || '';

			// Check for duplicates
			if (resumeText && usedQuotes.has(resumeText)) {
				logger.warn(`Duplicate quote found for quality ${qualityId}, setting to empty string`, {
					duplicateText: resumeText
				});
				resumeText = '';
			} else if (resumeText) {
				usedQuotes.add(resumeText);
			}

			const updateData = {};
			updateData[`qualities.${qualityId}.resumeText`] = resumeText;

			logger.info(`Adding batch update for quality ${qualityId}:`, {
				updatePath: `qualities.${qualityId}.resumeText`,
				resumeText: resumeText,
				textLength: resumeText.length
			});

			batch.update(docRef, updateData);
		});

		await batch.commit();
		logger.info('Quality matches batch update completed successfully');
	}
};

const parseAnthropicResponse = (extractedText) => {
	try {
		// Find the first '{' and last '}'
		const start = extractedText.indexOf('{');
		const end = extractedText.lastIndexOf('}') + 1;
		if (start === -1 || end === 0) {
			throw new Error('No JSON object found in response');
		}

		// Extract just the JSON portion
		const jsonStr = extractedText.slice(start, end);
		return JSON.parse(jsonStr);
	} catch (error) {
		logger.error('JSON parse error:', {
			error: error.message,
			extractedText: extractedText
		});
		throw error;
	}
};

// PubSub Service
const pubSubService = {
	parseMessage(message) {
		if (!message.data) {
			throw new Error('No message data received');
		}
		return message.json;
	},

	async ensureTopicExists(topicName) {
		try {
			await pubSubClient.createTopic(topicName);
		} catch (err) {
			if (err.code !== 6) {
				// 6 = already exists
				throw err;
			}
		}
	},

	async publishMessage(topicName, message) {
		await this.ensureTopicExists(topicName);
		const messageId = await pubSubClient.topic(topicName).publishMessage({
			data: Buffer.from(JSON.stringify(message))
		});
		logger.info(`Message ${messageId} published to ${topicName}`);
		return messageId;
	}
};

// Quality Processing Service
const qualityComparingService = {
	async compareQualities(resumeText, qualities) {
		const MAX_RETRIES = 3;
		const RETRY_DELAY = 1000;

		// Split qualities into two batches
		const qualityIds = Object.keys(qualities);
		const midpoint = Math.ceil(qualityIds.length / 2);

		const firstHalf = {};
		const secondHalf = {};

		qualityIds.forEach((id, index) => {
			if (index < midpoint) {
				firstHalf[id] = qualities[id];
			} else {
				secondHalf[id] = qualities[id];
			}
		});

		logger.info('Split qualities into two batches', {
			firstHalfIds: Object.keys(firstHalf),
			secondHalfIds: Object.keys(secondHalf)
		});

		let allMatches = {};

		// First API call (Q1-Q5)
		const formatQualities = (qualityBatch) => {
			return Object.entries(qualityBatch)
				.map(([id, quality]) => {
					const formatted = `
          ${id}:
          Primary Skill: ${quality.primarySkill}
          Required Experience: ${quality.evidence}
          ---`;
					logger.info(`Formatting quality ${id}:`, formatted);
					return formatted;
				})
				.join('\n');
		};

		const usedQuotes = new Set();

		const firstHalfString = formatQualities(firstHalf);
		logger.info('First half qualities being sent:', firstHalfString);

		const firstInstruction = `
      ${CONFIG.instructions.qualityMatching.replace('{resumeText}', resumeText)}
      
      Here are the first set of qualities to match against the resume:
      ${firstHalfString}
    `;

		let lastError;
		for (let i = 0; i < MAX_RETRIES; i++) {
			try {
				logger.info('Making first API call for qualities:', {
					qualities: Object.keys(firstHalf)
				});

				const result = await callAnthropicAPI(resumeText, firstInstruction);
				if (!result || result.error) {
					throw new Error(result?.message || 'Error calling Anthropic API');
				}

				logger.info('First batch raw response:', {
					attempt: i + 1,
					response: result.extractedText
				});

				try {
					const parsedResponse = parseAnthropicResponse(result.extractedText);
					logger.info('First batch parsed response:', {
						attempt: i + 1,
						parsedResponse
					});

					Object.values(parsedResponse.qualityMatches).forEach((match) => {
						if (match.resumeText) {
							usedQuotes.add(match.resumeText);
						}
					});

					allMatches = { ...allMatches, ...parsedResponse.qualityMatches };
					break;
				} catch (parseError) {
					logger.error('First batch parse error:', {
						attempt: i + 1,
						error: parseError.message,
						rawResponse: result.extractedText
					});
					throw parseError;
				}
			} catch (error) {
				lastError = error;
				logger.error('First batch API error:', {
					attempt: i + 1,
					error: error.message
				});
				if (i < MAX_RETRIES - 1) {
					await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (i + 1)));
				}
			}
		}

		if (lastError) {
			throw lastError;
		}

		// Second API call (Q6-Q10)
		const secondHalfString = formatQualities(secondHalf);

		const secondInstruction = `
      ${CONFIG.instructions.qualityMatching.replace('{resumeText}', resumeText)}

      IMPORTANT: These quotes have already been used and cannot be reused:
    ${Array.from(usedQuotes).join('\n')}
      
      Here are the second set of qualities to match against the resume:
      ${secondHalfString}
    `;

		lastError = null;
		for (let i = 0; i < MAX_RETRIES; i++) {
			try {
				logger.info('Making second API call for qualities:', {
					qualities: Object.keys(secondHalf)
				});

				const result = await callAnthropicAPI(resumeText, secondInstruction);
				if (!result || result.error) {
					throw new Error(result?.message || 'Error calling Anthropic API');
				}

				logger.info('Second batch raw response:', {
					attempt: i + 1,
					response: result.extractedText
				});

				try {
					const parsedResponse = JSON.parse(result.extractedText);
					logger.info('Second batch parsed response:', {
						attempt: i + 1,
						parsedResponse
					});
					// Merge results from second batch with first batch
					allMatches = { ...allMatches, ...parsedResponse.qualityMatches };
					break;
				} catch (parseError) {
					logger.error('Second batch parse error:', {
						attempt: i + 1,
						error: parseError.message,
						rawResponse: result.extractedText
					});
					throw parseError;
				}
			} catch (error) {
				lastError = error;
				logger.error('Second batch API error:', {
					attempt: i + 1,
					error: error.message
				});
				if (i < MAX_RETRIES - 1) {
					await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (i + 1)));
				}
			}
		}

		if (lastError) {
			throw lastError;
		}

		logger.info('Both batches completed successfully', {
			totalMatches: Object.keys(allMatches).length,
			matchedQualities: Object.keys(allMatches)
		});

		return allMatches;
	}
};

// Main Function
exports.compareQualities = onMessagePublished(
	{ topic: CONFIG.topics.qualitiesGathered },
	async (event) => {
		let messageData; // Moved declaration outside try block
		try {
			logger.info('Starting compareQualities function');

			// Parse message
			const decodedData = Buffer.from(event.data.message.data, 'base64').toString();
			messageData = JSON.parse(decodedData); // Removed 'const'
			const { firebaseUid, docId } = messageData;

			logger.info('Parsed message data:', { firebaseUid, docId });

			// Get resume and job data
			logger.info('Fetching resume text');
			const resumeText = await firestoreService.getResumeText(firebaseUid);
			logger.info('Resume text retrieved', {
				length: resumeText.length,
				preview: resumeText.substring(0, 100) // First 100 chars for verification
			});

			const docRef = firestoreService.getJobDocRef(firebaseUid, docId);
			const jobData = await firestoreService.getJobDocument(docRef);

			// Process qualities
			const qualities = jobData.qualities;
			logger.info('Processing qualities', {
				numberOfQualities: Object.keys(qualities).length
			});

			const qualityMatches = await qualityComparingService.compareQualities(resumeText, qualities);
			logger.info('Quality comparison completed', {
				numberOfMatches: Object.keys(qualityMatches).length
			});

			// Update results
			await firestoreService.updateQualityMatches(docRef, qualityMatches, resumeText);

			// Publish to next topic
			await pubSubService.publishMessage(CONFIG.topics.qualitiesMatched, { firebaseUid, docId });

			logger.info(`Successfully completed quality comparison for docId: ${docId}`);
		} catch (error) {
			logger.error('Processing Error:', {
				error: error.message,
				stack: error.stack,
				firebaseUid: messageData?.firebaseUid, // Now messageData will be accessible
				docId: messageData?.docId
			});
			throw error;
		}
	}
);
