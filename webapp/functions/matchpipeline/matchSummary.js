const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { callGeminiAPI } = require('../services/geminiService');
const { FieldValue } = require('firebase-admin/firestore');
const { getUserResume } = require('../helpers/resumeHelper');

// Initialize Firebase
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const CONFIG = {
	instructions: `
    Alright, think of me as your personal career buddy here to help you quickly get the lowdown on this job match! You're looking at a lot of roles, so let's boil this one down to the essentials: what the company's about, what *you'd* actually be doing, and the main thing that might be different from your background.

    FIRST (just so *I* understand the context, I won't output this bit):
    1.  I'll check out the Job Description: Get a feel for the company – what industry they're in, what they make or do, maybe their size or stage.
    2.  Figure out the Role's Core Value: Pinpoint how *this specific job* helps the company succeed.

    THEN, using that insight AND the Resume and Match Details you gave me, I'll generate ONLY the following JSON object. Each part will be a single, punchy sentence using "you/your" where it fits, in clear, everyday language (no confusing business jargon!):

    {
      "short_description": "Here's the scoop on the company itself – their industry and what they create or offer. (e.g., 'So, this company builds cool specialized systems for managing underground stormwater on construction sites.')",
      "short_responsibility": "This explains what *you'd* mainly be diving into day-to-day to help them hit their goals. (e.g., 'Your key mission would be connecting with engineers and contractors across the Southeast to get them excited about these systems.')",
      "short_gaps": "This points out the biggest difference between *your* current background and what this job asks for, based on our match check. (e.g., 'The main thing to note is that your profile doesn't yet highlight direct B2B sales experience or mention being set up for regular travel in the region.')"
    }

    Just a few pointers for how I'll craft this:
    -   My tone will be helpful and upbeat, like a friend giving you the quick summary.
    -   Each sentence will be distinct, super concise, and get straight to the point for each field.
    -   The 'short_gaps' part will stick strictly to what we found comparing your profile to the job needs (using those Match Details).
    -   I'll give you *only* the JSON object – no extra fluff before or after.
    `
};

// Helper to get resume text using the new resume helper
async function getResumeText(firebaseUid, searchQueryId = null) {
	const resumeData = await getUserResume(firebaseUid, searchQueryId);
	
	if (!resumeData) {
		throw new Error('No resume found');
	}

	const resumeText = resumeData.extractedText;
	if (!resumeText) {
		throw new Error('Resume has no extracted text');
	}

	return resumeText;
}

// Main function
exports.matchSummary = onMessagePublished(
	{ topic: 'preference-matched', timeoutSeconds: 540 },

	async (event) => {
		try {
			// Parse message
			const messageData = JSON.parse(Buffer.from(event.data.message.data, 'base64').toString());
			const { firebaseUid, jobId } = messageData;
			let batchId = messageData.batchId || null;

			logger.info('Starting match summary', { firebaseUid, jobId, batchId });

			// Get job document with match details
			const jobDoc = await db
				.collection('users')
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

			// Get resume text - try to get search query ID from batch
			let searchQueryId = null;
			if (batchId) {
				try {
					const batchDoc = await db.collection('jobBatches').doc(batchId).get();
					if (batchDoc.exists) {
						searchQueryId = batchDoc.data().searchId;
					}
				} catch (error) {
					logger.warn('Could not get searchId from batch', { batchId, error: error.message });
				}
			}
			
			const resumeText = await getResumeText(firebaseUid, searchQueryId);

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
			await db
				.collection('users')
				.doc(firebaseUid)
				.collection('scrapedJobs')
				.doc(jobId)
				.set(summaryData, { merge: true });

			// Update batch if batchId exists
			if (batchId) {
				try {
					const batchRef = db.collection('jobBatches').doc(batchId);
					const batchSnap = await batchRef.get();
					const batchData = batchSnap.data() || {};
					if (
						batchData.status === 'complete' ||
						batchData.completedJobs >= batchData.totalJobs ||
						(Array.isArray(batchData.completedJobIds) && batchData.completedJobIds.includes(jobId))
					) {
						logger.info(
							`Skipping batch update for jobId=${jobId} - already counted or batch complete`
						);
					} else {
						await batchRef.update({
							[`jobStatus.${jobId}`]: 'summary_completed',
							[`jobProcessingSteps.${jobId}`]: FieldValue.arrayUnion('summary_completed'),
							completedJobs: FieldValue.increment(1),
							completedJobIds: FieldValue.arrayUnion(jobId)
						});
						// Debug log for completedJobs increment
						const batchSnap2 = await batchRef.get();
						const batchData2 = batchSnap2.data() || {};
						// Fetch job score
						let jobScore = '?';
						try {
							const jobSnap = await db
								.collection('users')
								.doc(firebaseUid)
								.collection('scrapedJobs')
								.doc(jobId)
								.get();
							jobScore =
								jobSnap.exists &&
								jobSnap.data().match &&
								typeof jobSnap.data().match.final_score !== 'undefined'
									? jobSnap.data().match.final_score
									: '?';
						} catch (e) {}
						logger.debug(
							`[matchSummary] Incremented completedJobs for jobId=${jobId} | completedJobs=${batchData2.completedJobs || '?'} / totalJobs=${batchData2.totalJobs || '?'} | score=${jobScore}`
						);
					}
					logger.info('Updated batch status', { batchId, jobId });
				} catch (error) {
					logger.error('Failed to update batch', { batchId, error });
					// Continue even if batch update fails
				}
			}

			logger.info('Match summary completed', {
				firebaseUid,
				jobId,
				summary: JSON.stringify(
					{
						short_description: response.short_description,
						short_responsibility: response.short_responsibility,
						short_gaps: response.short_gaps
					},
					null,
					2
				)
			});
		} catch (error) {
			logger.error('Match summary processing failed:', error);
			throw error;
		}
	}
);
