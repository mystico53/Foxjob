const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const { defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const { callAnthropicAPI } = require('../services/anthropicService');
require('dotenv').config();

// Initialize
const db = admin.firestore();
const pubSubClient = new PubSub();

// ===== Config =====
const CONFIG = {
	topics: {
		rawTextStored: 'raw-text-stored',
		jobDescriptionExtracted: 'job-description-extracted-v2'
	},
	collections: {
		users: 'users',
		jobs: 'jobs'
	},
	defaultValues: {
		naText: 'na'
	},
	instructions: {
		jobExtraction:
			'Extract and faithfully reproduce the entire job posting, including all details about the position, company, and application process. Maintain the original structure, tone, and level of detail. Include the job title, location, salary (if provided), company overview, full list of responsibilities and qualifications (both required and preferred), unique aspects of the role or company, benefits, work environment details, and any specific instructions or encouragement for applicants. Preserve all original phrasing, formatting, and stylistic elements such as questions, exclamations, or creative language. Do not summarize, condense, or omit any information. The goal is to create an exact replica of the original job posting, ensuring all content and nuances are captured.'
	}
};

// ===== Firestore Service =====
const firestoreService = {
	getDocRef(firebaseUid, docId) {
		const path = `users/${firebaseUid}/jobs/${docId}`;

		return db.collection('users').doc(firebaseUid).collection('jobs').doc(docId);
	},

	async getJobDocument(docRef) {
		const snapshot = await docRef.get();
		if (!snapshot.exists) {
			logger.warn('404:', { path: docRef.path });
			throw new Error(`Document not found: ${docRef.path}`);
		}

		const data = snapshot.data();

		return data;
	},

	async updateJobDocument(docRef, extractedText, existingTexts = {}) {
		await docRef.set(
			{
				texts: {
					...existingTexts,
					extractedText
				}
			},
			{ merge: true }
		);
	},

	async handleError(docRef) {
		logger.warn('Error:', { path: docRef.path });
		await this.updateJobDocument(docRef, CONFIG.defaultValues.naText);
	}
};

// ===== PubSub Service =====
const pubSubService = {
	parseMessage(event) {
		// Check if we have the expected event structure
		if (!event?.data?.message?.data) {
			throw new Error('Invalid message format received');
		}

		// Decode the base64 data from the message
		const decodedData = Buffer.from(event.data.message.data, 'base64').toString();

		try {
			return JSON.parse(decodedData);
		} catch (error) {
			throw new Error(`Failed to parse message data: ${error.message}`);
		}
	},

	validateMessageData(data) {
		const { firebaseUid, docId } = data;
		if (!firebaseUid || !docId) {
			throw new Error('Missing required fields in message data');
		}
		return { firebaseUid, docId };
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

// ===== API Service =====
const apiService = {
	async processJobDescription(rawText, instruction) {
		if (!rawText || rawText === 'na') {
			throw new Error('Invalid raw text for processing');
		}
		const result = await callAnthropicAPI(rawText, instruction);
		if (result.error) {
			throw new Error(`API Error: ${result.message}`);
		}
		return result.extractedText;
	}
};

// ===== Error Handlers =====
const errorHandlers = {
	async handleProcessingError(error, docRef, context = {}) {
		logger.error('Processing Error:', error, context);
		if (docRef) {
			await firestoreService.handleError(docRef);
		}
	},

	handleAndThrow(error, message) {
		logger.error(message, error);
		throw error;
	}
};

// ===== Main Function =====
exports.extractJobDescription = onMessagePublished(
	{
		topic: CONFIG.topics.rawTextStored
	},
	async (event) => {
		let docRef;
		try {
			// Parse and validate message
			const messageData = pubSubService.parseMessage(event);
			const { firebaseUid, docId } = pubSubService.validateMessageData(messageData);
			logger.info(`Processing job for firebaseUid : ${firebaseUid}, docId: ${docId}`);

			// Rest of your function remains the same...
			docRef = firestoreService.getDocRef(firebaseUid, docId);
			const jobData = await firestoreService.getJobDocument(docRef);

			const rawJD = jobData.texts?.rawText || 'na';
			const extractedText = await apiService.processJobDescription(
				rawJD,
				CONFIG.instructions.jobExtraction
			);

			await firestoreService.updateJobDocument(docRef, extractedText, jobData.texts);

			await pubSubService.publishMessage(CONFIG.topics.jobDescriptionExtracted, {
				firebaseUid,
				docId
			});
		} catch (error) {
			await errorHandlers.handleProcessingError(error, docRef, { event });
		}
	}
);
