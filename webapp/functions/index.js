const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin SDK
initializeApp();

// Get Firestore instance
const db = getFirestore();

// Initialize feedback collection
async function initializeFeedbackCollection() {
    try {
        const feedbackRef = db.collection('feedback').doc('_init');
        const doc = await feedbackRef.get();
        
        if (!doc.exists) {
            await feedbackRef.set({
                initialized: true,
                timestamp: new Date(),
                description: 'Feedback collection initialization document'
            });
            logger.info('Feedback collection initialized successfully');
        }
    } catch (error) {
        logger.error('Error initializing feedback collection:', error);
        throw error; // Propagate the error
    }
}

// Export initialization function instead of running it immediately
exports.initFeedback = onRequest(async (request, response) => {
    try {
        await initializeFeedbackCollection();
        response.json({ success: true });
    } catch (error) {
        response.status(500).json({ error: error.message });
    }
});

// Import your function modules

const { publishJobText } = require('./publishJobText');
//const { processPubSubText } = require('./processPubSubText');
const { saveRawPubSubMessage } = require('./pubsub/saveRawPubSubMessage');
const { extractJobDescription } = require('./pubsub/extractJobDescription');
const { summarizeJobDescription } = require('./pubsub/summarizeJobDescription');
const { extractJobRequirements } = require('./pubsub/extractJobRequirements');
const { calculateScore } = require('./pubsub/calculateScore');
const { extractHardSkills } = require('./pubsub/extractHardSkills.js');
//const { extractSoftSkills } = require('./pubsub/extractSoftSkills.js');
const { extractDomainExpertise } = require('./pubsub/extractDomainExpertise.js');
const { matchHardSkills } = require('./pubsub/matchHardSkills.js');
//const { matchSoftSkills } = require('./pubsub/matchSoftSkills.js');
const { matchDomainExpertise } = require('./pubsub/matchDomainExpertise.js');
const { finalVerdict } = require('./pubsub/finalVerdict.js');
const { embeddingMatch } = require('./pubsub/embeddingMatch.js'); 
const { retryProcessing } = require('./helpers/retryProcessing.js');
const { processGaps } = require('./assessments/processGaps.js');  

// Export all Cloud Functions

exports.publishJobText = publishJobText;
//exports.processText = processPubSubText;
exports.saveRawMessage = saveRawPubSubMessage;
exports.extractJobDescription = extractJobDescription;
exports.summarizeJobDescription = summarizeJobDescription;
exports.extractJobRequirements = extractJobRequirements;
exports.calculateScore = calculateScore;
exports.extractHardSkills = extractHardSkills;
//exports.extractSoftSkills = extractSoftSkills;
exports.extractDomainExpertise = extractDomainExpertise;
exports.matchHardSkills = matchHardSkills;
//exports.matchSoftSkills = matchSoftSkills;
exports.matchDomainExpertise = matchDomainExpertise;
exports.finalVerdict = finalVerdict;
exports.embeddingMatch = embeddingMatch;
exports.retryProcessing = retryProcessing;
exports.processGaps = processGaps;
