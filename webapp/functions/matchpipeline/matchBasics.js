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
    You're evaluating how well a resume matches a job. Today's job market is highly selective - only candidates with direct relevant experience typically advance.
Step 1: Identify if the job requires niche knowledge (crypto, specialized medical, etc.) or cutting-edge skills. If yes, these are must-have requirements.
Step 2: Check if must-have requirements are explicitly evidenced in the resume. If any must-have requirement is missing, the maximum score is 40.
Step 3: Calculate score (0-100):

Start at 100
For each missing must-have requirement: -60 points
For each missing important requirement: -20 points
For partially evidenced requirements: -15 points

Output format: {"score": X}`
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
    { topic: 'job-embedding-requests', timeoutSeconds: 540 },
    
    async (event) => {
        try {
            // Parse message
            const messageData = JSON.parse(
                Buffer.from(event.data.message.data, 'base64').toString()
            );
            const { firebaseUid, jobId, batchId } = messageData; // Extract batchId
            
            logger.info('Starting basic match', { firebaseUid, jobId, batchId });

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
                    temperature: 0.7
                    
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
                    verification: response.verification,
                    evaluators: response.evaluators,  
                    finalScore: response.final.score,
                    summary: response.final.summary,  
                    timestamp: FieldValue.serverTimestamp()
                },
                processing: {
                    status: 'basics_matched',
                    batchId: batchId // Store batchId in job document too
                }
            }, { merge: true });

            if (batchId) {
                try {
                    const batchRef = db.collection('jobBatches').doc(batchId);
                    await batchRef.update({
                        completedJobs: FieldValue.increment(1),
                        [`jobStatus.${jobId}`]: 'completed'
                    });
                    logger.info('Updated batch progress', { batchId, jobId });
                } catch (error) {
                    logger.error('Failed to update batch', { batchId, error });
                    // Continue even if batch update fails
                }
            }

            // Publish next message
            await publishMessage(CONFIG.topics.outputTopic, {
                firebaseUid,
                jobId
            });

            logger.info('Basic match completed', { 
                firebaseUid, 
                jobId,
                parsedResponse: JSON.stringify(response, null, 2)  // Log the parsed JSON response
            });

        } catch (error) {
            logger.error('Match processing failed:', error);
            throw error;
        }
    }
);