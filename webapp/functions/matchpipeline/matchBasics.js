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
    minScoreThreshold: 50,
    instructions: `
   Alright, think of yourself as my super-sharp buddy helping me screen resumes! Our goal is to get a really clear score (0-100) showing how well this candidate's resume lines up with the job description (JD), focusing *only* on the absolute must-haves for the role.

Here’s how we’ll tackle it:

**1. Picking Out What *Really* Matters (Max 10 Requirements):**

(Logic remains exactly the same as your previous version)

**2. Checking the Resume Super Carefully & Scoring Each Requirement:**

For each key requirement we picked, let's carefully scan the resume for clear, direct proof. We need to check every little detail and condition mentioned in the requirement. The proof has to make sense for *this specific* job context.

*   **A Little Leeway (But Only a Little!):** (Logic for inference on broad soft skills remains exactly the same - NOT for specific skills, tools, domains, etc.)

*   **Figuring out the Match Score (%):** We'll use these levels below. It's super important to check them **strictly in order (100 -> 60 -> 50 -> 25 -> 0)**. Give it the score from the *first* level where everything checks out perfectly for that requirement.

    *   **Aiming for 100% (Perfect Match):**
        *   **Does it meet this?** There's explicit text in the resume confirming EVERY SINGLE part of the requirement is nailed or even exceeded (keywords match, clear synonyms, or they have even better qualifications). OR, for those broad soft skills ONLY, their accomplishments clearly show they've got it.
        *   **What to do:** If yes, awesome! Give it 100% and we're done with this requirement. If not, let's check the 60% level.

    *   **Checking for 60% (Got the Must-Haves, Missed Extras/Adjacent):**
        *   **Does it meet this?** *Only* check this if it didn't hit 100% AND:
            *   EITHER: The requirement clearly separates must-haves from nice-to-haves/preferred stuff. The resume clearly shows they've got *all* the must-haves covered (including any time amounts), but the proof for the nice-to-haves is missing. (Like, they have 5+ years PM experience? Check! But the preferred fintech background? Nope.)
            *   OR: The requirement is for a specific Degree or Industry, and they have one that's obviously very closely related. (Like, JD wants Behavioral Science, they have Social Science; JD wants FinTech, they have Investment Banking).
        *   **What to do:** If EITHER of those fits, give it 60% and move to the next requirement. If not, let's check 50%.

    *   **Checking for 50% (Partial Match - Just Missed the Mark on Numbers):**
        *   **Does it meet this?** *Only* check this if it didn't hit 100% or 60%, AND the requirement is straightforward (not multiple parts combined) AND fits ONE of these:
            *   It's purely about years of experience (e.g., "needs 5 years X"), and the resume clearly shows they have *most* of it, specifically over 80% (e.g., 4+ years shown for a 5-year requirement).
            *   (Tool equivalent rule removed as per your previous refinement).
        *   **What to do:** If that fits, give it 50% and move on. If not, check 25%.

    *   **Checking for 25% (Related Foundation / Partial Context):**
        *   **Does it meet this?** *Only* check this if it didn't hit 100%, 60%, or 50%, BUT the resume clearly shows they have *some* real experience with the core idea of the requirement, even if they obviously miss key details like: the scale needed (100 users vs 1M+), the right context (Dev work vs PM work), the duration (months vs years), or the specific responsibility (built the feature vs just tracked its usage). It shows they have a relevant starting point, but not enough for the higher scores.
        *   **What to do:** If yes, give it 25% and move on. Otherwise, it's a 0%.

    *   **Assigning 0% (No Real Match / Irrelevant):**
        *   **Does it meet this?** This is the score ONLY if it didn't qualify for 100%, 60%, 50%, or 25% based on our checks above. Basically, no relevant proof found.
        *   **What to do:** Give it 0%.

**3. Showing Our Work (Evidence):**

*   For every score, pinpoint the exact words from the resume that back it up.
*   If we used accomplishments for soft skills (100% only), briefly summarize what they were, explaining *to the user (you)* why it demonstrates the skill.
*   **Super important:** If it's less than 100%, clearly spell out *for the user (you)* exactly what parts of the requirement *were* found AND which parts were *missing*, based on the resume and the rule applied.
*   If it's a 0%, just put "None".

**4. Calculating the Final Score:**

*   Let's figure out the overall score using a weighted average:
    Final Score = Sum of (Requirement Weight * Match Score Percent for that requirement) / Sum of all Requirement Weights
*   Round the final score to the nearest whole number.

**5. Output Format:**

Just give me back this JSON object below, exactly like this, with no extra chat before or after it.

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
      "requirement": "Strong communication skills (Written & Oral)", // Example soft skill
      "match_score_percent": 100, // Example score for inferred soft skill
      // TONE REVISED EXAMPLE BELOW (using 'you' implicitly):
      "evidence": "You can see strong communication from how they handled that big Costco EV charging deal at Freewire – coordinating 5 divisions/30 stakeholders definitely suggests they manage complex comms well."
    },
    {
      "requirement": "5+ years experience in Product Management", // Example hard skill
      "match_score_percent": 100,
      // Example for direct evidence (factual quote remains):
      "evidence": "'Senior Product Manager, Freewire Technologies (2018-Present)', 'Product Manager, XYZ Corp (2016-2018)'" // Direct quotes don't use 'you'
    },
    {
        "requirement": "Experience with Agile methodologies", // Example where specifics are missing
        "match_score_percent": 25,
        // TONE REVISED EXAMPLE BELOW (using 'you'):
        "evidence": "The resume mentions managing backlog/prioritization ('Senior Product Manager' role), so *you* can see a foundation in Agile concepts here (gets 25%). Key thing *you'll* notice missing: no explicit mention of specific frameworks like Scrum/Kanban."
    },
    {
        "requirement": "Bachelor's Degree in Computer Science", // Example for adjacent match (60%)
        "match_score_percent": 60,
        // TONE REVISED EXAMPLE BELOW (using 'you'):
        "evidence": "Okay, so *you* see they have a 'Bachelor's Degree in Software Engineering'. It's not CS exactly, but close enough to count as adjacent/highly related (gets 60%). The core requirement component (Bachelor's Degree) is met."
     },
    {
      "requirement": "Text of requirement 5",
      "match_score_percent": 0, // Example
      "evidence": "None" // Example - Remains simple
    }
    // ... matching details for all prioritized requirements
  ],
  "final_score": <Calculated Weighted Average Score (0-100)>
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

            // Create document data with updated structure
            const documentData = {
                match: {
                    prioritized_requirements: response.prioritized_requirements,
                    match_details: response.match_details,
                    final_score: response.final_score,
                    timestamp: FieldValue.serverTimestamp()
                },
                processing: {
                    status: 'basics_matched'
                }
            };
            
            // Only add batchId if it exists
            if (batchId) {
                documentData.processing.batchId = batchId;
            }

            // Store results
            await db.collection('users')
                .doc(firebaseUid)
                .collection('scrapedJobs')
                .doc(jobId)
                .set(documentData, { merge: true });

            // Update batch if batchId exists
            if (batchId) {
                try {
                    const batchRef = db.collection('jobBatches').doc(batchId);
                    await batchRef.update({
                        [`jobStatus.${jobId}`]: 'basic_completed',
                        [`jobProcessingSteps.${jobId}`]: FieldValue.arrayUnion('basic_completed'),
                        completedJobs: FieldValue.increment(1) // Add this line
                    });
                    logger.info('Updated batch progress', { batchId, jobId });
                } catch (error) {
                    logger.error('Failed to update batch', { batchId, error });
                    // Continue even if batch update fails
                }
            }

            if (response.final_score > CONFIG.minScoreThreshold) {
                // Publish next message only if score meets threshold
                await publishMessage(CONFIG.topics.outputTopic, {
                    firebaseUid,
                    jobId,
                    batchId // Include batchId if it exists
                });
                
                logger.info('Basic match completed and forwarded to summary', { 
                    firebaseUid, 
                    jobId,
                    finalScore: response.final_score
                });
            } else {
                logger.info('Basic match completed but score below threshold', { 
                    firebaseUid, 
                    jobId,
                    finalScore: response.final_score,
                    threshold: CONFIG.minScoreThreshold
                });
            }

        } catch (error) {
            logger.error('Match processing failed:', error);
            throw error;
        }
    }
);