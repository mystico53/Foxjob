const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { callGeminiAPI } = require('../services/geminiService');
const { FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const CONFIG = {
	instructions: `
   You are an AI assistant performing resume screening. Your goal is to calculate a single, precise match score (0-100) indicating how well a candidate's resume aligns with a given job description (JD), focusing strictly on the most crucial requirements.

Follow these steps:

Requirement Prioritization & Extraction (Max 10):

(Same as before)

Strict Evidence Check & Match Scoring (Per Requirement):

For each prioritized requirement, meticulously examine the resume for direct, explicit evidence. Check every single component, condition, and qualifier. Evidence must match the role context.

Limited Inference Scope: (Same - ONLY for Broad Soft Skills like communication, leadership, etc.; NOT for specific skills, tools, domains, qualifiers).

Assign a Match Score (Percent) by evaluating the following tiers STRICTLY IN ORDER (100 -> 60 -> 50 -> 25 -> 0). Apply the score of the FIRST tier whose conditions are fully met.

Check for 100% (Full Match):

Conditions: Explicit textual evidence confirms EVERY SINGLE component, condition, and qualifier within the requirement is met or exceeded (keywords, direct synonyms, superior qualifications). OR, for broad soft skills ONLY, compelling accomplishments unambiguously demonstrate the skill.

Action: If met, assign 100% and STOP. Otherwise, proceed to check 60%.

Check for 60% (Mandatory Met, Specifics/Preferred/Adjacent Missed):

Conditions: Applies ONLY IF 100% is not met AND:

EITHER: The requirement has clearly distinct mandatory and secondary/preferred components. Explicit evidence fully meets the entire mandatory part (including any specified duration or quantity), but explicit evidence for the secondary/preferred component is missing. (e.g., 5+ years PM ok, but fintech preference missing).

OR: The requirement is for a specific Degree/Industry, and the candidate has one in a clearly adjacent/highly related field (e.g., Req: Behavioral Science Degree, Has: Social Science Degree; Req: FinTech Industry, Has: Investment Banking).

Action: If EITHER condition is met, assign 60% and STOP. Otherwise, proceed to check 50%.

Check for 50% (Partial Match - Quantitative Near Miss ONLY):

Conditions: Applies ONLY IF 100% and 60% are not met AND the requirement is simple and monolithic (not compound) AND meets ONE of these:

Requirement is solely about years of experience (e.g., "min 5 years X"), and resume explicitly shows >80% of that time (e.g., 4+ years).

(Removed tool equivalent rule to simplify and avoid misapplication).

Action: If met, assign 50% and STOP. Otherwise, proceed to check 25%.

Check for 25% (Related Foundation / Partial Context):

Conditions: Applies ONLY IF 100%, 60%, and 50% are not met, BUT there is explicit evidence demonstrating tangible experience with the core skill or concept of the requirement, even if it clearly misses key qualifiers like: Scale (e.g., 100 users vs 1M+), Context (e.g., Dev vs PM), Duration (e.g., months vs years), Specific Accountability (e.g., built feature vs tracked retention). The evidence must show a relevant foundation, but be insufficient for higher scores.

Action: If met, assign 25% and STOP. Otherwise, assign 0%.

Assign 0% (No Match / Irrelevant):

Conditions: Awarded ONLY IF the requirement does not qualify for 100%, 60%, 50%, or 25% based on the checks above. No relevant evidence found.

Action: Assign 0%.

Evidence Documentation:

Cite the specific resume text supporting the score.

For inferred soft skills (100% only), summarize accomplishments.

Crucially, for scores < 100%, explicitly state WHICH components/qualifiers were met AND WHICH were NOT MET according to the rule applied.

If 0%, state "None".

Weighted Score Calculation:

Calculate the final score using a weighted average:
Final Score = Σ (Requirement Weight * Match Score Percent) / Σ (Requirement Weight)

Round the final score to the nearest whole number.

Output Format:

Return ONLY the following JSON object, with no additional text before or after it.

{
  "prioritized_requirements": [
    {
      "requirement": "Text of requirement 1",
      "weight": 5
    },
    {
      "requirement": "Text of requirement 2",
      "weight": 3
    }
    // ... up to 10 requirements
  ],
  "match_details": [
    {
      "requirement": "Text of requirement 1",
      "match_score_percent": <Score based on STRICT rules (100, 60, 50, 25, 0)>,
      "evidence": "Specific resume text supporting the score. Explicitly note if components lack evidence, even if partial score given. Summarize accomplishments if used for soft skill inference."
    },
    {
      "requirement": "Text of requirement 2",
      "match_score_percent": <Score based on STRICT rules (100, 60, 50, 25, 0)>,
      "evidence": "..."
    },
    {
      "requirement": "Text of requirement 3",
      "match_score_percent": 0, // Example
      "evidence": "None" // Example
    }
    // ... matching details for all prioritized requirements
  ],
  "final_score": <Calculated Weighted Average Score (0-100)>
}
    `
};

// Helper to get resume text
async function getResumeText(firebaseUid) {
	const resumeSnapshot = await db
		.collection('users')
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

// Main callable function
exports.matchBasicsTest = onCall({ timeoutSeconds: 540 }, async (request) => {
	try {
		// Get parameters from the request
		const { firebaseUid, jobId, batchId, saveToFirestore = false, customPrompt } = request.data;

		logger.info('Starting test match', { firebaseUid, jobId, batchId });

		// Get job description
		const jobDoc = await db
			.collection('users')
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

		// Use custom prompt if provided
		const promptToUse = customPrompt || CONFIG.instructions;

		// Call Gemini API
		const result = await callGeminiAPI(
			`Job Description: ${jobDescription}\n\nResume: ${resumeText}`,
			promptToUse,
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

		// Store results if saveToFirestore is true
		if (saveToFirestore) {
			await db
				.collection('users')
				.doc(firebaseUid)
				.collection('scrapedJobs')
				.doc(jobId)
				.set(
					{
						match: {
							verification: response.verification,
							requirements: response.requirements,
							evaluations: response.evaluations,
							finalAssessment: response.final_assessment,
							timestamp: FieldValue.serverTimestamp()
						},
						processing: {
							status: 'basics_matched',
							batchId: batchId
						}
					},
					{ merge: true }
				);

			logger.info('Saved match results to Firestore', { firebaseUid, jobId });
		}

		logger.info('Parsed Response:\n' + JSON.stringify(response, null, 2)); // The '2' adds indentation

		// Return results
		return {
			success: true,
			rawOutput: result.extractedText,
			parsedResponse: response,
			savedToFirestore: saveToFirestore
		};
	} catch (error) {
		logger.error('Test match processing failed:', error);
		return {
			success: false,
			error: error.message,
			stack: error.stack
		};
	}
});
