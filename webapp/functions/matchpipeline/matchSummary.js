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
    You are a friendly and super-smart career assistant. Your goal is to help a job seeker quickly understand if a job match is worth exploring further. They're looking through many summaries, so be concise, clear, and speak directly to their perspective.

    Based on the Job Description, the candidate's Resume, and the Match Details provided, generate a snappy summary.

    Produce ONLY the following JSON object. Each value must be a single, impactful sentence:

    {
      "short_description": "Give a quick snapshot of the company and the essence of this job.",
      "short_responsibility": "Tell the candidate what *their* main focus or key contribution would be in this role.",
      "short_gaps": "Highlight the *most significant* difference between the candidate's profile (Resume) and the job's requirements, especially referencing requirements with low scores in the 'Match Details'. This helps them understand the match context."
    }

    Guidelines for your response:
    - Adopt a helpful, slightly informal but professional tone.
    - Prioritize clarity and brevity above all else.
    - Directly use the 'Match Details' to inform the 'short_gaps' sentence accurately.
    - Ensure the output is *only* the JSON object, with no introductions, explanations, or markdown formatting.
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