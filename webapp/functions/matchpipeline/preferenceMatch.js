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
    You are a friendly job preference analyzer, acting like a buddy who knows the user's career tastes well. Your task is to quickly check how well a job description fits what the user (you!) is looking for.

    Given:
    1. A job description (for any type of role)
    2. Your work preferences (covering aspects like industry, company size, culture, work style, tasks, etc.)

    Analyze how the job matches up with your preferences. Give it a score from 0-100:
    - 0-30: Probably not a good fit. Major mismatches on things you care about.
    - 31-70: Mixed bag. Has some things you like, but also some drawbacks.
    - 71-100: Looks promising! Aligns well with several of your key preferences.

    Return ONLY a JSON object like this:
    {
      "score": number, // Score between 0 and 100
      "explanation": "A single, short, direct sentence explaining the score by focusing on how specific job details **match or clash with your stated preferences**. Keep it casual, easy to scan, add a touch of warmth/understanding, **and aim for a slightly positive, energizing tone** without being over the top.

      **Key Rules for Explanation:**
      1.  **Preference-Centric:** The core message must explain the job's relevance *to your preferences*.
      2.  **Varied Structure:** **Crucially, vary the sentence structure.** Don't always start with 'Your preference...'. Sometimes start with the job detail and immediately link it to your preference (e.g., 'The [Job Detail] aligns with your interest in...'), other times subtly reference the preference first (e.g., 'This seems to hit the [Preference X] mark because...'). Aim for natural language.
      3.  **Connect Job Details:** Clearly link specific details from the job description *back* to your preferences.
      4.  **No Job Summary:** Don't just describe the job; explain its relevance *to you*.
      5.  **Handle Mismatches Carefully:** If an aspect mismatches, explain how the job's actual characteristic conflicts with your preference, without listing specific preferred things it *isn't*. (e.g., 'The focus on [Actual Industry] here might not be the cutting-edge tech area you find most exciting.')
      6.  **Be Concise:** Stick to the most impactful alignments/misalignments.
      "
    }

    Example Tone/Style for Explanation (Showing Varied Structures & Positive/Energizing Tone):

    **Example 1 (Tech - High Alignment):**
    - User Prefs: Likes cutting-edge tech (AI/gaming/edtech), early-stage, fast-moving teams, dislikes bureaucracy/scrum.
    - Job Desc: Moonvalley, generative AI for film, startup, anti-scrum mentioned.
    - Score: 90
    - **New Positive Try 1:** "Awesome! The generative AI focus here really hits that cutting-edge tech sweet spot you love, and the startup, anti-scrum vibe sounds perfect for the fast-moving, early-stage energy you're after."
    - **New Positive Try 2:** "This looks really promising! You get the cutting-edge AI you enjoy, and the anti-scrum, startup culture should definitely satisfy your craving for a fast-paced, early-stage environment."

    **Example 2 (Tech - Mismatch):**
    - User Prefs: Likes edtech/gaming/AI, early-stage, small teams; Dislikes e-commerce, big companies.
    - Job Desc: Product Manager at Amazon, Consumables division.
    - Score: 35
    - **New Positive Try 1:** "Just a heads-up, the Amazon structure might feel a bit too 'big company' for what you're looking for, and the consumables focus doesn't quite match the exciting tech areas you prefer."
    - **New Positive Try 2:** "Hmm, this one might not quite hit the mark – the Amazon setup probably doesn't align with your love for smaller teams, and consumables is a bit different from the tech fields you find more energizing."

    **Example 3 (Tech - Mixed):**
    - User Prefs: Likes edtech/gaming/AI, early-stage feel, small teams.
    - Job Desc: Product role at Snap, small team, new features, pitching to CEO.
    - Score: 65
    - **New Positive Try 1:** "Okay, so while social media isn't your top field, the chance to work on a small team building new features here could definitely give you that energizing early-stage vibe you love!"
    - **New Positive Try 2:** "The industry might be a slight detour, but digging into new features with a small team and pitching ideas sounds like it could really tap into that early-stage excitement you enjoy."

    **Example 4 (Sales - High Alignment):**
    - User Prefs: Wants high commission potential, autonomy; Dislikes micro-management.
    - Job Desc: Outside sales, commission-heavy, mentions "regular territory check-ins".
    - Score: 78
    - **New Positive Try 1:** "Nice! This role delivers on the high commission potential and autonomy you're looking for; just make sure to clarify those 'regular check-ins' regarding your dislike of micro-management."
    - **New Positive Try 2:** "Great match for your interest in autonomy and commission! Definitely worth clarifying those 'regular check-ins' to ensure the management style fits."

    **Example 5 (Trades - Mixed):**
    - User Prefs: Prefers outdoor work, stable hours; Dislikes excessive paperwork.
    - Job Desc: Landscaping lead, varied projects, M-F schedule, "daily site reports".
    - Score: 72
    - **New Positive Try 1:** "Solid pluses here: it definitely delivers on the outdoor work and stable hours you value! Just be aware the daily reporting might bring a bit more paperwork than ideal."
    - **New Positive Try 2:** "You'll likely appreciate the outdoor work and stable hours here matching your preferences, though the daily site reports might be a slight drag if you dislike paperwork."
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

// Main callable function
exports.preferenceMatch = onMessagePublished(
    { 
        topic: "basics-matched",
        timeoutSeconds: 540,
        region: "us-central1" 
    },
    async (event) => {
        try {
            // Parse the message data properly from PubSub
            let message;
            try {
                // For Firebase Functions v2, properly decode the message
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
            
            // IMPORTANT CHANGE: Always update batch counter, even if preferences are missing
            if (batchId) {
                try {
                    const batchRef = db.collection('jobBatches').doc(batchId);
                    await batchRef.update({
                        [`jobStatus.${jobId}`]: preferences ? 'preference_completed' : 'preference_skipped',
                        [`jobProcessingSteps.${jobId}`]: FieldValue.arrayUnion(preferences ? 'preference_completed' : 'preference_skipped'),
                        // Always increment completion counter
                        completedJobs: FieldValue.increment(1)
                    });
                    logger.info('Updated batch counter', { 
                        batchId, 
                        jobId, 
                        hasPreferences: !!preferences 
                    });
                } catch (error) {
                    logger.error('Failed to update batch counter', { 
                        batchId, 
                        error: error.message 
                    });
                    // Continue even if batch update fails
                }
            }
            
            // After updating the batch counter, now check if we can continue with preference processing
            if (!preferences) {
                logger.info('No preferences found', { firebaseUid });
                return {
                    success: false,
                    error: 'No user preferences found'
                };
            }

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

            // Return results
            return {
                success: true,
                rawOutput: result.extractedText,
                parsedResponse: response,
                savedToFirestore: saveToFirestore
            };

        } catch (error) {
            logger.error('Preference matching test failed:', error);
            return {
                success: false,
                error: error.message,
                stack: error.stack
            };
        }
    }
);