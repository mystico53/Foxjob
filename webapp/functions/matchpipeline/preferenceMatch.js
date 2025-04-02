const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const { logger } = require("firebase-functions");
const { callGeminiAPI } = require('../services/geminiService');
const { FieldValue } = require("firebase-admin/firestore");

// Initialize Firebase
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const CONFIG = {
    instructions: `
    You are a job preference analyzer. Your task is to assess how well a job description aligns with a user's stated preferences.
    
    Given:
    1. A job description
    2. A user's work preferences
    
    Analyze how well the job matches the user's preferences. Generate a score from 0-30 based on the following:
    - 0-10: Job doesn't align with preferences
    - 11-20: Job somewhat aligns with preferences
    - 21-30: Job strongly aligns with preferences
    
    Return ONLY a JSON object with the format:
    {
      "score": number,
      "explanation": "A single, concise sentence explaining why this score was given"
    }
    `
};

// Helper to get user preferences
async function getUserPreferences(firebaseUid) {
    const prefsDoc = await db.collection('users')
        .doc(firebaseUid)
        .collection('UserCollections')
        .doc('work_preferences')
        .get();
    
    if (!prefsDoc.exists) {
        return null; // No preferences set
    }
    
    return prefsDoc.data().preferences;
}

// Main function
exports.preferenceMatch = onMessagePublished(
    { topic: 'basics-matched', timeoutSeconds: 540 },
    
    async (event) => {
        try {
            // Parse message
            const messageData = JSON.parse(
                Buffer.from(event.data.message.data, 'base64').toString()
            );
            const { firebaseUid, jobId } = messageData;
            
            logger.info('Starting preference matching', { firebaseUid, jobId });

            // Get job document
            const jobDoc = await db.collection('users')
                .doc(firebaseUid)
                .collection('scrapedJobs')
                .doc(jobId)
                .get();

            if (!jobDoc.exists) {
                throw new Error('Job not found');
            }

            const jobData = jobDoc.data();
            
            // Get job description
            const jobDescription = jobData.details?.description;
            if (!jobDescription) {
                throw new Error('Job has no description');
            }

            // Get user preferences
            const preferences = await getUserPreferences(firebaseUid);
            if (!preferences) {
                logger.info('No preferences found, skipping', { firebaseUid });
                return; // Exit early if no preferences
            }

            // Call Gemini API
            const result = await callGeminiAPI(
                `Job Description: ${jobDescription}\n\n` +
                `User Preferences: ${preferences}`,
                CONFIG.instructions,
                {
                    temperature: 0.3
                }
            );

            // Parse response
            let response;
            try {
                const jsonStr = result.extractedText.replace(/```json\n?|\n?```/g, '').trim();
                const start = jsonStr.indexOf('{');
                const end = jsonStr.lastIndexOf('}') + 1;
                if (start === -1 || end === 0) throw new Error('No JSON object found in response');
                response = JSON.parse(jsonStr.slice(start, end));
            } catch (error) {
                logger.error('Failed to parse Gemini response:', error);
                throw error;
            }

            // Update job document with preference score
            await db.collection('users')
                .doc(firebaseUid)
                .collection('scrapedJobs')
                .doc(jobId)
                .set({
                    match: {
                        preferenceScore: {
                            score: response.score,
                            explanation: response.explanation,
                            timestamp: FieldValue.serverTimestamp()
                        }
                    }
                }, { merge: true });

            logger.info('Preference matching completed', { 
                firebaseUid, 
                jobId,
                score: response.score,
                explanation: response.explanation
            });

        } catch (error) {
            logger.error('Preference matching failed:', error);
            throw error;
        }
    }
);