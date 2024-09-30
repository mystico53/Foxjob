// match.js

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function: match
 * Description: Receives a jobId and googleId, retrieves the user's resume and unprocessed text,
 * appends "Resume match score" to the jobId, and returns the result.
 */
const match = onRequest(async (request, response) => {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        response.set('Access-Control-Allow-Origin', '*');
        response.set('Access-Control-Allow-Methods', 'POST');
        response.set('Access-Control-Allow-Headers', 'Content-Type');
        response.status(204).send('');
        return;
    }

    // Allow only POST requests
    if (request.method !== 'POST') {
        logger.warn(`Invalid request method: ${request.method}`);
        response.status(405).send('Method Not Allowed. Please use POST.');
        return;
    }

    // Handle CORS and parse the request
    cors(request, response, async () => {
        try {
            // Log request details for debugging
            logger.info('match function called');
            logger.info('Request Body:', request.body);

            // Extract jobId and googleId from the request body
            const { jobId, googleId } = request.body;

            if (!jobId || !googleId) {
                logger.error('Missing jobId or googleId in request body.');
                response.status(400).send('Bad Request: jobId and googleId are required.');
                return;
            }

            // Retrieve the user's resume
            const userCollectionsRef = db.collection('users').doc(googleId).collection('UserCollections');
            const resumeQuery = userCollectionsRef.where('type', '==', 'Resume').limit(1);
            const resumeSnapshot = await resumeQuery.get();

            if (resumeSnapshot.empty) {
                logger.warn(`No resume found for user ID: ${googleId}`);
                response.status(404).send('Resume not found.');
                return;
            }

            const resumeDoc = resumeSnapshot.docs[0];
            const resumeText = resumeDoc.data().extractedText;

            logger.info(`Resume retrieved for user ID ${googleId}:`, resumeText);

            // Retrieve the unprocessed text associated with the jobId
            const unprocessedRef = db
                .collection('users')
                .doc(googleId)
                .collection('processed')
                .doc(jobId)
                .collection('unprocessed');

            const unprocessedSnapshot = await unprocessedRef.get();

            if (unprocessedSnapshot.empty) {
                logger.warn(`No unprocessed text found for job ID: ${jobId}`);
                response.status(404).send('Unprocessed text not found.');
                return;
            }

            // Assuming only one unprocessed document per job
            const unprocessedDoc = unprocessedSnapshot.docs[0];
            const unprocessedText = unprocessedDoc.data().text;

            logger.info(`Unprocessed text for job ID ${jobId}:`, unprocessedText);

            // Process the data (currently, just appending " Resume match score")
            const matchScore = `${jobId} Resume match score`;

            logger.info('Match Score Generated:', matchScore);

            // Prepare the response object
            const responseData = {
                jobId,
                googleId,
                resumeText,
                unprocessedText,
                matchScore
            };

            // Send the response to the client
            response.set('Access-Control-Allow-Origin', '*'); // Adjust the origin as needed
            response.status(200).json(responseData);
        } catch (error) {
            logger.error('Error in match function:', error);
            response.status(500).send('Internal Server Error.');
        }
    });
});

// Export the function for deployment
module.exports = { match };
