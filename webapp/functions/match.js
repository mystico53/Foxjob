// match.js

const { onRequest } = require("firebase-functions/v2/https");
const functions = require('firebase-functions'); // Import functions to access config
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require('cors')({ origin: true });
const fetch = require('node-fetch'); // Ensure node-fetch is installed
require('dotenv').config(); // For local development; remove if not needed

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function: match
 * Description: Receives a jobId and googleId, retrieves the user's resume and unprocessed text,
 * extracts the job description using Anthropic API, appends "Resume match score" to the jobId, and returns the result.
 */
const match = onRequest(async (request, response) => {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        response.set('Access-Control-Allow-Origin', '*');
        response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
            logger.info('Request Body:', JSON.stringify(request.body));

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

            // Extract job description using Anthropic API
            let jobDescription;
            try {
                jobDescription = await extractJobDescription(unprocessedText);
                logger.info(`Extracted Job Description for job ID ${jobId}:`, jobDescription);
            } catch (apiError) {
                logger.error('Failed to extract job description:', apiError);
                response.status(500).send('Failed to extract job description.');
                return;
            }

            // Prepare the response object
            const responseData = {
                jobId,
                googleId,
                resumeText,
                unprocessedText,
                jobDescription, // Include the extracted job description
            };

            // Optionally, save the jobDescription to Firestore
            // Uncomment the following lines if you wish to store the job description
            /*
            const processedRef = db.collection('users').doc(googleId).collection('processed').doc(jobId);
            await processedRef.update({ jobDescription });
            logger.info('Job description saved to Firestore.');
            */

            // Send the response to the client
            response.set('Access-Control-Allow-Origin', '*'); // Adjust the origin as needed
            response.status(200).json(responseData);
        } catch (error) {
            logger.error('Error in match function:', error);
            response.status(500).send('Internal Server Error.');
        }
    });
});

/**
 * Helper function to extract job description using Anthropic API
 *
 * @param {string} unprocessedText - The text from which to extract the job description.
 * @returns {Promise<string>} - The extracted job description.
 */
async function extractJobDescription(unprocessedText) {
    // Get the Anthropic API key from environment variables or Firebase Functions config
    const apiKey = process.env.ANTHROPIC_API_KEY || functions.config().anthropic.api_key;

    if (!apiKey) {
        logger.error('Anthropic API key not found');
        throw new Error('Anthropic API key not found');
    }

    // Define the instruction
    const instruction = "Extract only the job and company description from the unprocessed text, be verbose, make sure to get the entire description text.";

    // Prepare the prompt
    const prompt = `${instruction}\n\n${unprocessedText}`;

    try {
        logger.info('Preparing to call Anthropic API with prompt:', prompt);

        // Call the Anthropic API
        logger.info('Calling Anthropic API');
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307', // always use this model: claude-3-haiku-20240307
                max_tokens: 1024,
                messages: [
                    { role: 'user', content: prompt }
                ],
            }),
        });

        const data = await anthropicResponse.json();

        if (!anthropicResponse.ok) {
            logger.error('Anthropic API error response:', data);
            throw new Error(`Anthropic API Error: ${JSON.stringify(data)}`);
        }

        logger.info('Received response from Anthropic API');

        // **Parse the response based on the processText method**
        if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
            const content = data.content[0].text.trim();
            logger.info('Extracted Job Description:', content);
            return content; // Return the extracted job description
        } else {
            logger.error('Unexpected Anthropic API response structure:', data);
            throw new Error('Unexpected Anthropic API response structure');
        }
    } catch (error) {
        logger.error('Error calling Anthropic API:', error);
        throw error;
    }
}

// Export the function for deployment
module.exports = { match };
