const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');
const { callGeminiAPI } = require('../services/geminiService');
const { FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const pubSubClient = new PubSub();

// Config - updated with three-level recruiter panel approach and match scores
const CONFIG = {
	topics: {
		qualitiesGathered: 'ten-qualities-gathered',
		qualitiesMatched: 'qualities-resumetext-added'
	},
	instructions: `
    Act as a panel of three expert technical recruiters (Junior Recruiter, Senior Recruiter, and Head of Recruiting) evaluating how well a candidate's resume matches specific job requirements. The three recruiters will follow a structured deliberation process to provide reliable assessments.
    
IMPORTANT: You must evaluate ALL qualities provided, not just the first two. Process each quality in the list comprehensively.

RECRUITER PANEL APPROACH:
1. Junior Recruiter gives initial assessment with selected resume text and match score
2. Senior Recruiter critiques and proposes an alternative match with reasoning and match score
3. Head of Recruiting makes final selection between the two options with justification and final match score

RECRUITER PERSONAS:
- Junior Recruiter: Enthusiastic but less experienced. Identifies apparent matches but may miss industry nuances. Often optimistic about transferable skills.
- Senior Recruiter: Industry veteran with critical eye. Must propose a different/better match than Junior's selection. Evaluates based on practical industry knowledge and will point out weaknesses in Junior's selection.
- Head of Recruiting: Strategic decision-maker with long-term perspective. Weighs pros/cons of both options and selects the better match with clear justification. Will select "no match" if neither option is suitable.

DISCUSSION DYNAMICS:
- Junior and Senior MUST provide different text selections when possible
- Senior must critique Junior's selection substantively
- Head must explicitly choose between the two options or reject both
- Each recruiter must justify their selection or rejection with specific reasoning
- Each recruiter MUST provide a match score from 0-10 representing how well the candidate's experience matches the quality

MATCH SCORE GUIDELINES:
- 0: No evidence of the quality in the resume
- 1-3: Minimal evidence, mostly inference or assumption
- 4-6: Moderate evidence, some relevant experience but not extensive
- 7-8: Strong evidence, clear demonstration of the quality
- 9-10: Exceptional evidence, candidate excels in this area

GUIDELINES FOR ALL RECRUITERS:
1. Match resume experiences based on relevance and quality:
   - Junior selects initial text that appears to demonstrate the quality and assigns a match score
   - Senior critiques this selection, proposes better text if available, and assigns their own match score
   - Head evaluates both options against the quality's evidence requirements and assigns a final match score

2. Prioritize by criticality score:
   - Focus selection efforts on highest criticality qualities first
   - For critical qualities (8-10), be especially thorough in evaluation
   - Only accept "assumed" skills for low-criticality qualities

3. Text selection requirements:
   - Use EXACT QUOTES from the resume
   - Ensure selected text specifically demonstrates the required quality
   - If neither selection is adequate, Head should reject both

4. Structured deliberation process:
   - Junior: "I've selected [quote] because [specific reasons it matches]. Match score: [0-10] because [justification]."
   - Senior: "I disagree with Junior's selection because [specific critique]. A better match would be [alternative quote] because [specific reasons]. Match score: [0-10] because [justification]."
   - Head: "After reviewing both options, I select [Junior's/Senior's] match because [decision criteria]. Final match score: [0-10] because [justification]. OR Neither option is adequate because [specific reasons]. Final match score: [0-3]."

CRITICAL REQUIREMENT:
- You MUST ensure the final selected resumeText matches the Head of Recruiting's decision
- If Head selects Junior's match, use Junior's exact text as resumeText
- If Head selects Senior's match, use Senior's exact text as resumeText
- If Head rejects both, use empty string as resumeText
- The finalMatchScore MUST be the Head of Recruiting's score

Your response must be valid JSON matching this exact format:
    {
      "qualityMatches": {
        "Q1": {
          "juniorSelection": "EXACT QUOTE from resume that Junior selects",
          "juniorMatchScore": 7,
          "seniorSelection": "EXACT QUOTE from resume that Senior selects",
          "seniorMatchScore": 8,
          "finalDecision": "junior|senior|none",
          "finalMatchScore": 8,
          "resumeText": "THE TEXT THAT MATCHES THE HEAD'S FINAL DECISION",
          "juniorRecruiterNotes": "I've selected [quote] because [specific reasons]. Match score: [0-10] because [justification].",
          "seniorRecruiterNotes": "I disagree with Junior because [critique]. A better match would be [quote] because [reasons]. Match score: [0-10] because [justification].",
          "headOfRecruitingNotes": "After reviewing both options, I select [Junior's/Senior's] match because [decision criteria]. Final match score: [0-10] because [justification]."
        },
        "Q2": {
          "juniorSelection": "",
          "juniorMatchScore": 0,
          "seniorSelection": "",
          "seniorMatchScore": 0,
          "finalDecision": "",
          "finalMatchScore": 0,
          "resumeText": "",
          "juniorRecruiterNotes": "",
          "seniorRecruiterNotes": "",
          "headOfRecruitingNotes": ""
        }
      }
    }

EXAMPLES:
1. If Head selects Junior's match:
   - resumeText = Junior's exact quote
   - finalMatchScore = Head's score (may differ from Junior's)
   - headOfRecruitingNotes = "After reviewing both options, I select Junior's match because... Final match score: 8 because..."

2. If Head selects Senior's match: 
   - resumeText = Senior's exact quote
   - finalMatchScore = Head's score (may differ from Senior's)
   - headOfRecruitingNotes = "After reviewing both options, I select Senior's match because... Final match score: 7 because..."

3. If Head rejects both:
   - resumeText = "" (empty string)
   - finalMatchScore = Head's score (typically low, 0-3)
   - headOfRecruitingNotes = "Neither option is adequate because... Final match score: 2 because..."

The resume text:
"""
{resumeText}
"""

Qualities to match:
{formattedQualities}`
};

// ===== PubSub Service =====
const pubSubService = {
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

// Helper functions
const normalizeSpaces = (text) => text.replace(/\s+/g, ' ').trim();

const parseGeminiResponse = (extractedText) => {
	try {
		const start = extractedText.indexOf('{');
		const end = extractedText.lastIndexOf('}') + 1;
		if (start === -1 || end === 0) throw new Error('No JSON object found in response');
		return JSON.parse(extractedText.slice(start, end));
	} catch (error) {
		logger.error('JSON parse error:', { error: error.message });
		throw error;
	}
};

// Main Function
exports.matchJobQualities = onMessagePublished(
	{ topic: CONFIG.topics.qualitiesGathered },
	async (event) => {
		let messageData;
		try {
			// Parse message
			const decodedData = Buffer.from(event.data.message.data, 'base64').toString();
			messageData = JSON.parse(decodedData);
			const { firebaseUid, jobId } = messageData;
			logger.info('Processing job qualities', { firebaseUid, jobId });

			// Get resume text
			const userRef = db.collection('users').doc(firebaseUid);
			const resumeSnapshot = await userRef
				.collection('UserCollections')
				.where('type', '==', 'Resume')
				.limit(1)
				.get();

			if (resumeSnapshot.empty) {
				throw new Error(`No resume found for user: ${firebaseUid}`);
			}

			const resumeText = normalizeSpaces(resumeSnapshot.docs[0].data().extractedText || '');
			if (!resumeText) {
				throw new Error('Resume has no extracted text');
			}

			// Get job document
			const jobRef = userRef.collection('scrapedJobs').doc(jobId);
			const jobDoc = await jobRef.get();

			if (!jobDoc.exists) {
				throw new Error(`Job document not found: ${jobId}`);
			}

			const jobData = jobDoc.data();
			const qualities = jobData.qualities || {};

			// Format qualities for API - using the existing format
			const formattedQualities = Object.entries(qualities)
				.map(
					([id, quality]) => `
* ${id}
* criticality: "${quality.criticality || ''}"
* evidence: "${quality.evidence || ''}"
* primarySkill: "${quality.primarySkill || ''}"
* resumeText: [FIND STRONG MATCH HERE]`
				)
				.join('\n');

			// Call Gemini API
			const instruction = CONFIG.instructions
				.replace('{resumeText}', resumeText)
				.replace('{formattedQualities}', formattedQualities);

			// API call with retry
			let result;
			for (let i = 0; i < 3; i++) {
				try {
					result = await callGeminiAPI(resumeText, instruction, {
						model: 'gemini-2.0-flash', // Using pro model for more comprehensive analysis
						temperature: 0.2, // Lower temperature for more consistent output
						maxOutputTokens: 8192 // Increased for more comprehensive multi-recruiter analysis of multiple qualities
					});
					if (result && !result.error) break;
					await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
				} catch (error) {
					logger.warn(`API attempt ${i + 1} failed:`, { error: error.message });
					if (i === 2) throw error;
				}
			}

			// Parse response
			const parsedResponse = parseGeminiResponse(result.extractedText);
			const qualityMatches = parsedResponse.qualityMatches || {};

			// Update with batch
			const batch = db.batch();

			// Add full resume text
			batch.update(jobRef, { 'qualities.resumeText': resumeText });

			// Check for duplicate quotes but allow them if necessary
			const usedQuotes = new Set();
			const duplicateQuotes = new Map(); // Track which quotes are duplicates and where

			Object.entries(qualityMatches).forEach(([qualityId, matchData]) => {
				// Determine the correct resumeText based on finalDecision
				let finalResumeText = matchData.resumeText || '';

				// If we have the new structure with explicit selection fields, use them
				if (matchData.finalDecision) {
					if (matchData.finalDecision === 'junior') {
						finalResumeText = matchData.juniorSelection || '';
					} else if (matchData.finalDecision === 'senior') {
						finalResumeText = matchData.seniorSelection || '';
					} else {
						// finalDecision is 'none' or invalid
						finalResumeText = '';
					}
				}

				// Check for duplicates
				if (finalResumeText && usedQuotes.has(finalResumeText)) {
					// Mark as duplicate but don't remove the text
					logger.warn(`Duplicate quote found for ${qualityId}, marking but keeping`);

					// Track where this quote was previously used
					const originalQuality = duplicateQuotes.get(finalResumeText) || 'another quality';
					duplicateQuotes.set(finalResumeText, originalQuality);

					// Add note about duplicate without removing the text
					if (matchData.juniorRecruiterNotes) {
						matchData.juniorRecruiterNotes +=
							' [NOTE: This text is also used for ' + originalQuality + ']';
					}
					if (matchData.seniorRecruiterNotes) {
						matchData.seniorRecruiterNotes += ' [NOTE: Shared text with ' + originalQuality + ']';
					}
					if (matchData.headOfRecruitingNotes) {
						matchData.headOfRecruitingNotes += ' [NOTE: This demonstrates multiple qualities]';
					}
				} else if (finalResumeText) {
					usedQuotes.add(finalResumeText);
					duplicateQuotes.set(finalResumeText, qualityId);
				}

				// Save the match data with all recruiter assessments, including match scores
				batch.update(jobRef, {
					[`qualities.${qualityId}.resumeText`]: finalResumeText,
					[`qualities.${qualityId}.juniorRecruiterNotes`]: matchData.juniorRecruiterNotes || '',
					[`qualities.${qualityId}.seniorRecruiterNotes`]: matchData.seniorRecruiterNotes || '',
					[`qualities.${qualityId}.headOfRecruitingNotes`]: matchData.headOfRecruitingNotes || '',
					// Store match scores
					[`qualities.${qualityId}.juniorMatchScore`]: matchData.juniorMatchScore || 0,
					[`qualities.${qualityId}.seniorMatchScore`]: matchData.seniorMatchScore || 0,
					[`qualities.${qualityId}.finalMatchScore`]: matchData.finalMatchScore || 0,
					// Store the selection fields for debugging/transparency
					[`qualities.${qualityId}.juniorSelection`]: matchData.juniorSelection || '',
					[`qualities.${qualityId}.seniorSelection`]: matchData.seniorSelection || '',
					[`qualities.${qualityId}.finalDecision`]: matchData.finalDecision || '',
					[`qualities.${qualityId}.assessmentDate`]: FieldValue.serverTimestamp()
				});
			});

			await batch.commit();

			// Publish next message
			await pubSubService.publishMessage(CONFIG.topics.qualitiesMatched, {
				firebaseUid,
				jobId,
				assessmentType: 'multi-recruiter-panel'
			});

			// Validate we processed all qualities
			const processedQualityCount = Object.keys(qualityMatches).length;
			const originalQualityCount = Object.keys(qualities).length;

			if (processedQualityCount < originalQualityCount) {
				logger.warn('Not all qualities were processed by Gemini', {
					jobId,
					originalQualityCount,
					processedQualityCount,
					missingCount: originalQualityCount - processedQualityCount
				});

				// You could implement a retry strategy here for incomplete processing
			}

			logger.info('Multi-recruiter quality matching completed successfully', {
				jobId,
				matchCount: processedQualityCount,
				expectedCount: originalQualityCount,
				usedQuotes: usedQuotes.size
			});
		} catch (error) {
			logger.error('Processing failed:', {
				error: error.message,
				stack: error.stack,
				firebaseUid: messageData?.firebaseUid,
				jobId: messageData?.jobId
			});
			throw error;
		}
	}
);
