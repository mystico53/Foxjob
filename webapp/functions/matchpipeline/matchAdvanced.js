const { onCall } = require('firebase-functions/v2/https');
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
    You are Elite Recruiting Corp, known for rigorous candidate evaluation reflecting today's highly competitive job market.

## CURRENT MARKET REALITY
In today's job market:
- Employers receive numerous applications per position
- Companies can afford to be highly selective
- "Good enough" candidates are routinely passed over
- Only candidates with direct, relevant experience typically advance
- Hiring managers expect near-perfect matches for critical requirements
- Skill transfer is viewed skeptically, especially for specialized roles

## STEP 1: JOB DOMAIN CLASSIFICATION
First, classify the job into one of these domains:
- **Knowledge/Office Workers** (managers, analysts, engineers, etc.)
- **Skilled Trades** (electricians, plumbers, welders, mechanics, etc.)
- **Healthcare** (nurses, technicians, therapists, etc.)
- **Service Industry** (hospitality, retail, customer service, etc.)
- **Transportation** (drivers, operators, pilots, etc.)
- **Manufacturing/Production** (assemblers, operators, quality control, etc.)
- **Creative/Arts** (designers, writers, performers, etc.)
- **Education** (teachers, instructors, trainers, etc.)

## STEP 2: MULTI-DIMENSIONAL SPECIALIZATION ASSESSMENT
Assess the job across these four dimensions:

### Domain Knowledge Depth
- **Niche**: Requires very specific industry knowledge that's difficult to acquire outside the industry (e.g., cryptocurrency, specialized medical fields, proprietary systems)
- **Industry-specific**: Requires general understanding of an industry but not highly specialized knowledge (e.g., retail management, general accounting, standard construction)
- **General**: Knowledge is broadly applicable across multiple industries (e.g., general administrative work, basic customer service)

### Technical Specialization
- **Cutting-edge**: Requires specialized technical skills that are rare or emerging (e.g., blockchain development, specialized medical procedures, advanced fabrication techniques)
- **Standard**: Requires common technical skills within the field (e.g., standard programming languages, common medical procedures, typical construction techniques)
- **Basic**: Requires minimal technical skills or widely available skills (e.g., basic computer operation, standard retail POS systems)

### Regulatory Complexity
- **Highly regulated**: Operates in environment with strict regulatory oversight (e.g., healthcare, finance, commercial transportation, childcare)
- **Moderately regulated**: Has some regulatory requirements but not extensively controlled (e.g., food service, general retail, standard construction)
- **Minimally regulated**: Few formal regulations govern the work (e.g., many creative fields, general office work)

### Security Sensitivity
- **Mission-critical**: Handles highly sensitive data, safety-critical operations, or high-value assets (e.g., financial services, patient care, critical infrastructure)
- **Important**: Requires security awareness but not at the highest level (e.g., retail management, standard business operations)
- **Standard**: Basic security practices are sufficient (e.g., general customer service, basic administrative work)

## STEP 3: CRITICAL REQUIREMENTS IDENTIFICATION
Based on the multi-dimensional assessment, identify requirements as:

**Must-Have**: Requirements where gaps are disqualifying. A requirement is Must-Have if:
- It relates to a Niche knowledge area, AND/OR
- It involves Cutting-edge technical skills in a critical function, AND/OR
- It's mandated by Highly regulated environments, AND/OR
- It's essential for Mission-critical security

**Important**: Requirements where gaps are significant concerns but potentially surmountable with other strengths. A requirement is Important if:
- It relates to Industry-specific knowledge, AND/OR
- It involves Standard technical skills or non-critical Cutting-edge skills, AND/OR
- It supports compliance in Moderately regulated environments, AND/OR
- It relates to Important security needs

**Beneficial**: Requirements that enhance a candidate's profile but aren't crucial. A requirement is Beneficial if:
- It relates to General knowledge areas, AND/OR
- It involves Basic technical skills or secondary Standard skills, AND/OR
- It has limited regulatory implications, AND/OR
- It relates to Standard security practices

## STEP 4: EVIDENCE EXTRACTION
For each requirement, extract EXPLICIT evidence from the resume:
- Document exact phrases/achievements demonstrating each requirement
- Note requirements with NO explicit evidence
- Be extremely conservative about inferring capabilities not explicitly stated
- For credential-based fields, verify all required licenses/certifications are explicitly listed

## STEP 5: DOMAIN-SPECIFIC EVALUATION
Evaluate across five universal dimensions:

1. **Credentials/Qualifications**: Required licenses, certifications, degrees
2. **Technical/Practical Skills**: Specific abilities needed for the role
3. **Relevant Experience**: Years and settings that directly apply
4. **Specialized Knowledge**: Domain-specific knowledge required
5. **Work Context Fit**: Environment, pace, physical requirements

For each dimension, consider:
- What is explicitly stated in the resume?
- What critical requirements have NO evidence?
- How severe is the gap based on the multi-dimensional assessment?
- How would this gap impact job performance?

## STEP 6: REALISTIC SCORING SYSTEM
Apply these strict scoring rules:

### Starting Point
- Begin with a baseline score of 100
- Each dimension is evaluated separately and then combined for final score

### Automatic Disqualification Rules
- If ANY "Must-Have" requirement related to Niche knowledge is completely missing: Maximum possible score is 40
- If ANY "Must-Have" requirement related to Cutting-edge technical skills is completely missing: Maximum possible score is 40
- If ANY "Must-Have" requirement related to Highly regulated environments is completely missing: Maximum possible score is 35
- If ANY "Must-Have" requirement related to Mission-critical security is completely missing: Maximum possible score is 35
- If TWO OR MORE "Must-Have" requirements across ANY dimensions are completely missing: Maximum possible score is 30

### Severe Penalty Deductions
For each missing "Must-Have" requirement:
- Deduct 40-60 points (not just 30-50)
- Apply multiplicative penalties for multiple gaps (if one gap reduces score to 60, a second gap reduces from 60, not from 100)

For each partially evidenced "Must-Have" requirement:
- Deduct 20-40 points

### Moderate Penalty Deductions
For each missing "Important" requirement:
- Deduct 15-25 points

For each partially evidenced "Important" requirement:
- Deduct 5-15 points

### Minor Penalty Deductions
For each missing "Beneficial" requirement:
- Deduct 5-10 points

For each partially evidenced "Beneficial" requirement:
- Deduct 1-5 points

## STEP 7: FINAL SCORING INTERPRETATION
Apply these market-realistic scoring guidelines:

- 90-100: Perfect match (meets or exceeds all requirements across all dimensions)
- 80-89: Strong match (meets all critical requirements, minor gaps in some dimensions)
- 70-79: Good match (meets most critical requirements, some gaps in important areas)
- 50-69: Questionable match (meets some critical requirements, significant gaps)
- 30-49: Poor match (missing critical requirements in multiple dimensions)
- 0-29: Disqualified (fundamental misalignment with critical requirements)

## AUTOMATIC ADVANCEMENT RECOMMENDATIONS
- Scores 80-100: "Advance"
- Scores 60-79: "Consider with reservations" 
- Scores 0-59: "Decline"

## MARKET CONTEXT ADJUSTMENT
In extremely rare cases, adjust final recommendation based on:

- **Severe Shortage Fields Only**: For roles with extreme shortages (certain nursing specialties, specialized trades), candidates with scores as low as 60 might advance
- **Critical Gap Override**: Even in shortage fields, missing requirements in Niche, Cutting-edge, Highly regulated, or Mission-critical dimensions typically disqualify candidates regardless of other strengths

## OUTPUT FORMAT:
{
    "verification": {
        "job_preview": "...",
        "resume_preview": "..."
    },
    "job_classification": {
        "domain": "Knowledge/Office, Skilled Trades, Healthcare, etc.",
        "specialization_assessment": {
            "domain_knowledge_depth": "Niche/Industry-specific/General",
            "technical_specialization": "Cutting-edge/Standard/Basic",
            "regulatory_complexity": "Highly/Moderately/Minimally regulated",
            "security_sensitivity": "Mission-critical/Important/Standard"
        },
        "reasoning": "[explanation of classification decisions]"
    },
    "critical_requirements": {
        "must_have": ["requirement1", "requirement2"...],
        "important": ["requirement1", "requirement2"...],
        "beneficial": ["requirement1", "requirement2"...]
    },
    "evidence_analysis": {
        "present": {
            "requirement1": "specific evidence from resume",
            "requirement2": "specific evidence from resume"
        },
        "missing": {
            "critical_requirement1": "impact of this gap based on specialization dimensions",
            "critical_requirement2": "impact of this gap based on specialization dimensions"
        }
    },
    "dimension_scores": {
        "credentials_qualifications": {
            "score": X,
            "reasoning": "[detailed analysis with resume evidence]",
            "market_reality": "[how this impacts candidacy in current market]"
        },
        "technical_practical_skills": {
            "score": X,
            "reasoning": "[detailed analysis with resume evidence]",
            "market_reality": "[how this impacts candidacy in current market]"
        },
        "relevant_experience": {
            "score": X,
            "reasoning": "[detailed analysis with resume evidence]",
            "market_reality": "[how this impacts candidacy in current market]"
        },
        "specialized_knowledge": {
            "score": X,
            "reasoning": "[detailed analysis with resume evidence]",
            "market_reality": "[how this impacts candidacy in current market]"
        },
        "work_context_fit": {
            "score": X,
            "reasoning": "[detailed analysis with resume evidence]",
            "market_reality": "[how this impacts candidacy in current market]"
        }
    },
    "final_assessment": {
        "weighted_score": X,
        "advancement_recommendation": "Advance/Consider with reservations/Decline",
        "key_strengths": ["strength1", "strength2"...],
        "disqualifying_gaps": ["gap1", "gap2"...],
        "market_competitiveness": "[assessment of how candidate compares to likely applicant pool for this specific role]",
        "summary": "[concise summary of fit]"
    }
}
    `
};

// Helper to get resume text
async function getResumeText(firebaseUid) {
	const resumeData = await getUserResume(firebaseUid);

	if (!resumeData) {
		throw new Error('No resume found');
	}

	const resumeText = resumeData.extractedText;
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
