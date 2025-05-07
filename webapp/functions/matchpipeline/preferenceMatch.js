const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const admin = require('firebase-admin');
const { logger } = require("firebase-functions");
const { callGeminiAPI } = require('../services/geminiService');
const { FieldValue } = require("firebase-admin/firestore");
const { PubSub } = require('@google-cloud/pubsub');

// Initialize Firebase
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const pubSubClient = new PubSub();

const CONFIG = {
    instructions: `
    You are a friendly job preference analyzer, helping the user see how well a job matches their stated preferences. Your task is to check how well any job description aligns with what the user is looking for.

    Given:
    1. A job description (could be ANY type of job - from corporate roles to trades, service jobs, healthcare, education, etc.)
    2. The user's work preferences (which might include industry, schedule, environment, autonomy level, pay structure, physical demands, etc.)

    Analyze how the job aligns with the user's preferences. Give it a score from 0-100 with these strict scoring rules:
    - 0-25: Very poor fit. Contains multiple items from the "avoid" list or has major mismatches.
    - 26-50: Poor fit. Contains at least one item from the "avoid" list or has significant mismatches.
    - 51-75: Moderate fit. Mostly aligns with preferences but has some drawbacks or missing elements.
    - 76-100: Strong fit. Clearly aligns with multiple key preferences and contains no items from the "avoid" list.

    Important Scoring Rules:
    - If the job contains ANY item from the "avoid" list, the score MUST be 50 or lower.
    - If the job contains TWO OR MORE items from the "avoid" list, the score MUST be 25 or lower.
    - Never assume interests not explicitly mentioned in the preferences. Only give credit for explicit matches.
    - Default to lower scores when uncertain about alignment.

    Return ONLY a JSON object like this:
    {
      "score": number, // Score between 0 and 100
      "explanation": "A single, short, direct sentence explaining the score by focusing on how specific job details match or clash with the stated preferences. Keep it casual, easy to scan, and aim for a slightly positive tone without being over the top."
    }

    Examples of good explanations across various job types:

    **Example 1 (Carpenter - High Match, Score: 85):**
    - User Prefs: Likes outdoor work, variety of projects, small teams; Dislikes corporate environment, repetitive tasks.
    - Job Desc: Small construction company, custom home builds, 4-person team, different project each month.
    - **Explanation:** "This small construction company offers exactly the project variety and small team atmosphere you're looking for, with the bonus of custom work that should keep things from getting repetitive."

    **Example 2 (Retail - Major Mismatch, Score: 20):**
    - User Prefs: Likes flexible hours, creative work; Dislikes fixed schedules, standing all day.
    - Job Desc: Department store cashier, fixed shifts, required to stand entire shift.
    - **Explanation:** "This position combines two significant drawbacks for you - the rigid shift schedule and requirement to stand all day directly clash with what you're looking for in a job."

    **Example 3 (Office - Single Mismatch, Score: 42):**
    - User Prefs: Prefers remote work, flexible hours, creative tasks; Dislikes micromanagement.
    - Job Desc: In-office admin role, flexible hours, mentions "regular check-ins with supervisor".
    - **Explanation:** "While the flexible hours are a plus, the in-office requirement goes against your preference for remote work, and the regular check-ins might suggest more oversight than you'd prefer."

    **Example 4 (Healthcare - Mixed, Score: 63):**
    - User Prefs: Likes helping people, stable hours, career advancement; Dislikes night shifts.
    - Job Desc: Nursing assistant, daytime shifts, mentions advancement opportunities, some weekend work.
    - **Explanation:** "The daytime shifts and advancement opportunities align well with what you want, though the required weekend work might be a slight drawback to consider."

    **Example 5 (Hospitality - Good fit, Score: 78):**
    - User Prefs: Enjoys customer interaction, fast-paced environment, tips/commission; Dislikes monotonous tasks.
    - Job Desc: Server at busy restaurant, mentions "great tips" and "every day is different".
    - **Explanation:** "This server position seems to hit all your key points - customer interaction, fast pace, potential for good tips, and enough variety to keep you engaged from day to day."
    `
};

// Helper to get user preferences - UPDATED VERSION
// Updated helper to get user preferences with new structure
async function getUserPreferences(firebaseUid) {
    try {
        const documentPath = `users/${firebaseUid}/UserCollections/work_preferences`;
        
        logger.info('Attempting to get work preferences document', { firebaseUid });
        logger.info('Attempting to get work preferences document', { 
            firebaseUid,
            documentPath 
        });
        
        const prefsDoc = await db.collection('users')
            .doc(firebaseUid)
            .collection('UserCollections')
            .doc('work_preferences')
            .get();
        
        if (!prefsDoc.exists) {
            logger.info('Work preferences document not found at path', { documentPath });
            
            // Try a document list to see what documents actually exist
            const snapshot = await db.collection('users')
                .doc(firebaseUid)
                .collection('UserCollections')
                .limit(10)
                .get();
                
            if (snapshot.empty) {
                logger.info('No documents found in UserCollections collection');
            } else {
                logger.info('Found documents in UserCollections:', {
                    documentIds: snapshot.docs.map(doc => doc.id)
                });
            }
            
            return null;
        }
        
        const prefsData = prefsDoc.data();
        logger.info('Found work preferences document with data', { 
            firebaseUid, 
            fields: Object.keys(prefsData),
            hasPreferences: !!prefsData.preferences,
            hasAvoidance: !!prefsData.avoidance,
            status: prefsData.status || 'none'
        });
        
        // Check if we have non-empty preferences
        const hasValidPreferences = prefsData.preferences && 
            typeof prefsData.preferences === 'string' && 
            prefsData.preferences.trim() !== '';
            
        const hasValidAvoidance = prefsData.avoidance && 
            typeof prefsData.avoidance === 'string' && 
            prefsData.avoidance.trim() !== '';
        
        if (!hasValidPreferences && !hasValidAvoidance) {
            logger.info('No valid preferences found in work preferences', { firebaseUid });
            return null;
        }
        
        // Format the preferences
        const formattedPreferences = [];
        
        if (hasValidPreferences) {
            formattedPreferences.push(`What I'm looking for:\n${prefsData.preferences.trim()}`);
            logger.info('Added preferences to formatted preferences', { firebaseUid });
        }
        
        if (hasValidAvoidance) {
            formattedPreferences.push(`What I want to avoid:\n${prefsData.avoidance.trim()}`);
            logger.info('Added avoidance to formatted preferences', { firebaseUid });
        }
        
        const result = formattedPreferences.join('\n\n');
        logger.info('Successfully formatted user preferences', { 
            firebaseUid, 
            sectionCount: formattedPreferences.length,
            preferencesLength: result.length,
            preferencesStart: result.substring(0, 50)
        });
        
        return result;
    } catch (error) {
        logger.error('Error getting user preferences', { 
            firebaseUid, 
            error: error.message,
            stack: error.stack 
        });
        return null;
    }
}

// Helper function to adjust final score based on preference score
async function adjustFinalScore(firebaseUid, jobId) {
    try {
        // Get the job document
        const jobDoc = await db.collection('users')
            .doc(firebaseUid)
            .collection('scrapedJobs')
            .doc(jobId)
            .get();
        
        if (!jobDoc.exists) {
            logger.info('Job not found for score adjustment', { firebaseUid, jobId });
            return false;
        }
        
        const jobData = jobDoc.data();
        
        // Check if both match data and preference score exist
        if (!jobData.match || !jobData.match.final_score || 
            !jobData.match.preferenceScore || !jobData.match.preferenceScore.score) {
            logger.info('Missing required scores for adjustment', { 
                firebaseUid, 
                jobId,
                hasMatch: !!jobData.match,
                hasFinalScore: !!(jobData.match && jobData.match.final_score),
                hasPreferenceScore: !!(jobData.match && jobData.match.preferenceScore && jobData.match.preferenceScore.score)
            });
            return false;
        }
        
        // Get the scores
        const originalScore = jobData.match.final_score;
        const preferenceScore = jobData.match.preferenceScore.score;
        
        // Calculate adjustment: (difference between pref score and 100) / 2
        const adjustment = (100 - preferenceScore) / 2;
        
        // Calculate new final score
        const adjustedScore = Math.max(0, Math.min(100, originalScore - adjustment));
        
        // Round to whole number
        const roundedAdjustedScore = Math.round(adjustedScore);
        
        // Update the document with both scores
        await db.collection('users')
            .doc(firebaseUid)
            .collection('scrapedJobs')
            .doc(jobId)
            .set({
                match: {
                    basic_score: originalScore, // Store original for documentation
                    final_score: roundedAdjustedScore, // Update the final score
                    score_adjusted_timestamp: FieldValue.serverTimestamp()
                }
            }, { merge: true });
        
        logger.info('Successfully adjusted final score', {
            firebaseUid,
            jobId,
            originalScore,
            preferenceScore,
            adjustment,
            adjustedScore: roundedAdjustedScore
        });
        
        return true;
    } catch (error) {
        logger.error('Error adjusting final score', {
            firebaseUid,
            jobId,
            error: error.message,
            stack: error.stack
        });
        return false;
    }
}

// Helper to publish message (copied from matchBasics.js)
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

// Main callable function
exports.preferenceMatch = onMessagePublished(
    { 
        topic: "basics-completed",
        timeoutSeconds: 540,
        region: "us-central1" 
    },
    async (event) => {
        try {
            // Parse the message data properly from PubSub
            let message;
            try {
                const rawData = event.data.message.data;
                const decodedData = Buffer.from(rawData, 'base64').toString();
                message = JSON.parse(decodedData);
            } catch (parseError) {
                logger.error('Error parsing message data', { error: parseError.message });
                throw new Error(`Unable to parse message data: ${parseError.message}`);
            }

            const { firebaseUid, jobId, batchId, saveToFirestore = false } = message || {};
            
            // Validate the required parameters
            if (!firebaseUid || typeof firebaseUid !== 'string' || firebaseUid.trim() === '') {
                throw new Error('Invalid or missing firebaseUid');
            }

            if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
                throw new Error('Invalid or missing jobId');
            }
            
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

            // Get user preferences with the updated function
            const preferences = await getUserPreferences(firebaseUid);
            
            // Set an initial status for this job
            let jobStatus = preferences ? 'preference_completed' : 'preference_skipped';
            
            // If no preferences, update job status but still continue with the process flow
            if (!preferences) {
                logger.info('No preferences found', { firebaseUid });
                // We don't return here - we continue to the batch update at the end
            } else {
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
                    logger.error('Failed to parse Gemini response:', { 
                        error: error.message,
                        rawResponse: result.extractedText
                    });
                    throw error;
                }

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

                logger.info('Saved preference score to Firestore', { firebaseUid, jobId });

                await adjustFinalScore(firebaseUid, jobId);

                logger.info('Adjusted final score based on preferences', { firebaseUid, jobId });
            }

            // After adjustFinalScore, fetch the updated job document to get the final score
            const updatedJobDoc = await db.collection('users')
                .doc(firebaseUid)
                .collection('scrapedJobs')
                .doc(jobId)
                .get();
            const updatedJobData = updatedJobDoc.data();
            const finalScore = updatedJobData.match?.final_score;

            if (finalScore === undefined) {
                throw new Error('Final score missing after preference adjustment');
            }

            if (finalScore <= 50) {
                // Write placeholder summary and update batch counter/status
                const placeholderSummary = {
                    match: {
                        summary: {
                            short_description: 'Not summarized: Only jobs with a score of 50 or above are summarized.',
                            short_responsibility: '',
                            short_gaps: '',
                            timestamp: FieldValue.serverTimestamp()
                        }
                    }
                };
                await db.collection('users')
                    .doc(firebaseUid)
                    .collection('scrapedJobs')
                    .doc(jobId)
                    .set(placeholderSummary, { merge: true });
                if (batchId) {
                    const batchRef = db.collection('jobBatches').doc(batchId);
                    await batchRef.update({
                        [`jobStatus.${jobId}`]: 'preference_completed',
                        [`jobProcessingSteps.${jobId}`]: FieldValue.arrayUnion('preference_completed'),
                        completedJobs: FieldValue.increment(1)
                    });
                }
                logger.info('Preference match completed and ended at preference (score below threshold)', {
                    firebaseUid,
                    jobId,
                    finalScore
                });
                return {
                    success: true,
                    status: 'preference_completed',
                    hasPreferences: !!preferences
                };
            } else {
                // Publish to preference-matched for summary generation
                await publishMessage('preference-matched', {
                    firebaseUid,
                    jobId,
                    batchId
                });
                logger.info('Preference match completed and forwarded to summary', {
                    firebaseUid,
                    jobId,
                    finalScore
                });
                return {
                    success: true,
                    status: 'preference_forwarded',
                    hasPreferences: !!preferences
                };
            }

        } catch (error) {
            logger.error('Preference matching failed:', error);
            return {
                success: false,
                error: error.message,
                stack: error.stack
            };
        }
    }
);