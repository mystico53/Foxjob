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
    You are a friendly and super-smart career assistant. Help the job seeker quickly grasp the essentials of a job match: the company, their potential role, and the key difference from their profile. They're scanning many summaries, so be concise, clear, and speak directly to them.

    FIRST (for your understanding, don't output this analysis):
    1. Analyze the Job Description: Understand the company's business (industry, product/service, maybe size/stage).
    2. Determine Value Add: Identify the core contribution this specific role makes to the company's success.

    THEN, using that understanding AND the provided Resume and Match Details, generate ONLY the following JSON object. Each value must be a single, impactful sentence using "you/your" where appropriate, and clear, everyday language (no technical business acronyms in the final output):

    {
      "short_description": "Describe the company itself: its industry, what it makes or does. (e.g., 'This company manufactures specialized underground systems for managing stormwater in construction.')",
      "short_responsibility": "Explain what *you* would primarily do to contribute to this company's goals. (e.g., 'Your main focus would be building relationships with engineers and contractors in the Southeast to drive sales of their systems.')",
      "short_gaps": "Highlight the most significant difference between *your* background (Resume/profile) and this job's requirements, based on the 'Match Details'. (e.g., 'Your profile doesn't currently show experience in direct B2B sales or mention readiness for frequent regional travel.')"
    }

    Guidelines for your response:
    - Adopt a helpful, slightly informal but professional tone.
    - Ensure the sentences are distinct, concise, and directly answer the purpose of each field.
    - Base 'short_gaps' strictly on comparing the candidate's profile to job requirements via Match Details.
    - Output *only* the JSON object, no extra text or formatting.
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