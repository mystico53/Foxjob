const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const { logger } = require("firebase-functions");
const { PubSub } = require('@google-cloud/pubsub');
const { callGeminiAPI } = require('../services/geminiService');
const { FieldValue } = require("firebase-admin/firestore");

// Initialize Firebase
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const pubSubClient = new PubSub();

const CONFIG = {
    topics: {
        outputTopic: 'basics-matched'
    },
    instructions: `
    You are a job matching expert. Given a job description and resume, provide:
    1. A match score from 0-100
    2. A brief explanation of the score

    Format your response as valid JSON like this:
    {
        "score": 75,
        "explanation": "Good match because..."
    }
    `
};

// Helper to get resume text
async function getResumeText(firebaseUid) {
    const resumeSnapshot = await db.collection('users')
        .doc(firebaseUid)
        .collection('UserCollections')
        .where('type', '==', 'Resume')
        .limit(1)
        .get();
    
    if (resumeSnapshot.empty) {
        throw new Error('No resume found');
    }
    
    const resumeText = resumeSnapshot.docs[0].data().extractedText;
    if (!resumeText) {
        throw new Error('Resume has no extracted text');
    }
    
    return resumeText;
}

// Helper to publish message
async function publishMessage(topicName, message) {
    try {
        // Check if topic exists first
        const [topics] = await pubSubClient.getTopics();
        const topicExists = topics.some(topic => 
            topic.name.endsWith(`/topics/${topicName}`)
        );

        if (!topicExists) {
            logger.info(`Topic ${topicName} does not exist, creating it...`);
            await pubSubClient.createTopic(topicName);
            logger.info(`Created topic: ${topicName}`);
        }

        const messageId = await pubSubClient
            .topic(topicName)
            .publishMessage({
                data: Buffer.from(JSON.stringify(message)),
            });
        logger.info(`Message ${messageId} published to ${topicName}`);
        return messageId;
    } catch (error) {
        logger.error(`Failed to publish to ${topicName}:`, error);
        // Don't throw, just log and continue
        return null;
    }
}

// Main function
exports.matchBasics = onMessagePublished(
    { topic: 'job-embedding-requests' },
    async (event) => {
        try {
            // Parse message
            const messageData = JSON.parse(
                Buffer.from(event.data.message.data, 'base64').toString()
            );
            const { firebaseUid, jobId } = messageData;
            
            logger.info('Starting basic match', { firebaseUid, jobId });

            // Get job description
            const jobDoc = await db.collection('users')
                .doc(firebaseUid)
                .collection('scrapedJobs')
                .doc(jobId)
                .get();

            if (!jobDoc.exists) {
                throw new Error('Job not found');
            }

            const jobDescription = jobDoc.data().details?.description;
            if (!jobDescription) {
                throw new Error('Job has no description');
            }

            // Get resume text
            const resumeText = await getResumeText(firebaseUid);

            // Call Gemini API
            const result = await callGeminiAPI(
                `Job Description: ${jobDescription}\n\nResume: ${resumeText}`,
                CONFIG.instructions,
                {
                    temperature: 0.1,
                    maxOutputTokens: 1024
                }
            );

            // Parse response carefully
            let response;
            try {
                // Try to extract JSON from the response
                const jsonStr = result.extractedText.replace(/```json\n?|\n?```/g, '').trim();
                const start = jsonStr.indexOf('{');
                const end = jsonStr.lastIndexOf('}') + 1;
                if (start === -1 || end === 0) throw new Error('No JSON object found in response');
                response = JSON.parse(jsonStr.slice(start, end));
            } catch (error) {
                logger.error('Failed to parse Gemini response:', { 
                    error: error.message,
                    rawResponse: result.extractedText
                });
                throw error;
            }

            // Store results
            await db.collection('users')
                .doc(firebaseUid)
                .collection('scrapedJobs')
                .doc(jobId)
                .set({
                    match: {
                        explanation: response.explanation,
                        matchScore: response.score,
                        timestamp: FieldValue.serverTimestamp()
                    }
                }, { merge: true });

            // Publish next message
            await publishMessage(CONFIG.topics.outputTopic, {
                firebaseUid,
                jobId
            });

            logger.info('Basic match completed', {
                firebaseUid,
                jobId,
                score: response.score
            });

        } catch (error) {
            logger.error('Match processing failed:', error);
            throw error;
        }
    }
);