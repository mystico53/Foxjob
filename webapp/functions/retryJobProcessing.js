const { onCall } = require("firebase-functions/v2/https");
const { PubSub } = require('@google-cloud/pubsub');
const { defineString } = require("firebase-functions/params");
const { getFirestore } = require('firebase-admin/firestore');

// Initialize clients
const pubSubClient = new PubSub();
const db = getFirestore();

exports.retryJobProcessing = onCall({
}, async (request) => {
    // Ensure user is authenticated
    if (!request.auth) {
        throw new Error('User must be logged in.');
    }

    const { jobId, googleId } = request.data;

    // Validate parameters
    if (!jobId || !googleId) {
        throw new Error('Missing required parameters');
    }

    try {
        // Get the job data from Firestore
        const jobRef = db.collection('users').doc(googleId).collection('jobs').doc(jobId);
        const jobDoc = await jobRef.get();
        
        if (!jobDoc.exists) {
            throw new Error('Job not found');
        }

        const jobData = jobDoc.data();
        
        // Get the required fields
        const text = jobData.texts?.rawText || 'na';
        const url = jobData.generalData?.url || 'na';

        // Publish to job-text-submitted topic
        const message = {
            text,
            url,
            googleId
        };

        const messageId = await pubSubClient.topic('job-text-submitted').publishMessage({
            data: Buffer.from(JSON.stringify(message)),
        });

        // Update the processing status
        await jobRef.update({
            'generalData.processingStatus': 'processing'
        });

        return { success: true, messageId };
    } catch (error) {
        console.error('Error in retryJobProcessing:', error);
        throw new Error('Failed to retry job processing: ' + error.message);
    }
});