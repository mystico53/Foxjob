// match.js

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Enable CORS if your client is on a different domain
const cors = require('cors')({ origin: true });

/**
 * Cloud Function: match
 * Description: Receives a jobId, appends " Resume match score", and returns the result.
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

    // Log request details for debugging
    logger.info('match function called');
    logger.info('Request Body:', request.body);

    // Extract jobId from the request body
    const { jobId } = request.body;

    if (!jobId) {
        logger.error('Missing jobId in request body.');
        response.status(400).send('Bad Request: jobId is required.');
        return;
    }

    // Process the jobId
    const matchScore = `${jobId} Resume match score`;

    // Log the result
    logger.info('Match Score Generated:', matchScore);

    // Set CORS headers and send the response
    response.set('Access-Control-Allow-Origin', '*'); // Adjust the origin as needed
    response.status(200).send(matchScore);
});

// Export the function for deployment
module.exports = { match };
