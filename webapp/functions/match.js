// match.js

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

/**
 * Cloud Function: match
 * Description: A boilerplate function for debugging purposes.
 * Logs a message and sends a simple response.
 */
const match = onRequest(async (request, response) => {
    // Log an informational message
    logger.info('match function called');

    // Optional: Log request details for deeper debugging
    logger.info('Request Method:', request.method);
    logger.info('Request Headers:', request.headers);
    logger.info('Request Body:', request.body);

    // Send a response to the client
    response.status(200).send('Match function is running correctly.');
});

// Export the function for use in index.js
module.exports = { match };
