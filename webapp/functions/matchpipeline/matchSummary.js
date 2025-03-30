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
    You are an AI assistant helping candidates understand job descriptions. Based on the job description, resume, and match details, create a concise summary with these three components:

    1. Short description: Explain what this job is about in one clear sentence.
    2. Main responsibility: Describe the candidate's primary role in one precise sentence.
    3. Candidate gaps: Identify the most significant skill/experience gap between the candidate and job requirements in one sentence.

    Use match details to identify the gaps - focus on requirements with low match scores.

    Return ONLY the following JSON object, with no additional text:

    {
      "short_description": "One clear sentence about what this job is about.",
      "short_responsibility": "One precise sentence about the candidate's main role.",
      "short_gaps": "One sentence about the most significant candidate gap."
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

// Main function
exports.matchSummary = onMessagePublished(
    { topic: 'basics-matched', timeoutSeconds: 540 },
    
    async (event) => {
        try {
            // Parse message
            const messageData = JSON.parse(
                Buffer.from(event.data.message.data, 'base64').toString()
            );
            const { firebaseUid, jobId } = messageData;
            let batchId = messageData.batchId || null;
            
            logger.info('Starting match summary', { firebaseUid, jobId, batchId });

            // Get job document with match details
            const jobDoc = await db.collection('users')
                .doc(firebaseUid)
                .collection('scrapedJobs')
                .doc(jobId)
                .get();

            if (!jobDoc.exists) {
                throw new Error('Job not found');
            }

            const jobData = jobDoc.data();
            
            // No need to check threshold here since matchBasics already filtered

            // Get job description
            const jobDescription = jobData.details?.description;
            if (!jobDescription) {
                throw new Error('Job has no description');
            }

            // Get match details
            const matchDetails = jobData.match;
            if (!matchDetails) {
                throw new Error('Job has no match details');
            }

            // Get resume text
            const resumeText = await getResumeText(firebaseUid);

            // Call Gemini API
            const result = await callGeminiAPI(
                `Job Description: ${jobDescription}\n\n` +
                `Resume: ${resumeText}\n\n` +
                `Match Details: ${JSON.stringify(matchDetails, null, 2)}`,
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

            // Create document data with updated structure
            const summaryData = {
                match: {
                    summary: {
                        short_description: response.short_description,
                        short_responsibility: response.short_responsibility,
                        short_gaps: response.short_gaps,
                        timestamp: FieldValue.serverTimestamp()
                    }
                },
                processing: {
                    status: 'summary_completed'
                }
            };
            
            // Store results
            await db.collection('users')
                .doc(firebaseUid)
                .collection('scrapedJobs')
                .doc(jobId)
                .set(summaryData, { merge: true });

            // Update batch if batchId exists
            if (batchId) {
                try {
                    const batchRef = db.collection('jobBatches').doc(batchId);
                    await batchRef.update({
                        [`jobStatus.${jobId}`]: 'summary_completed'
                    });
                    logger.info('Updated batch status', { batchId, jobId });
                } catch (error) {
                    logger.error('Failed to update batch', { batchId, error });
                    // Continue even if batch update fails
                }
            }

            logger.info('Match summary completed', { 
                firebaseUid, 
                jobId,
                summary: JSON.stringify({
                    short_description: response.short_description,
                    short_responsibility: response.short_responsibility,
                    short_gaps: response.short_gaps
                }, null, 2)
            });

        } catch (error) {
            logger.error('Match summary processing failed:', error);
            throw error;
        }
    }
);