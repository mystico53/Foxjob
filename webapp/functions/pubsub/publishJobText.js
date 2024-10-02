const functions = require('firebase-functions');
const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub();
const topicName = 'job-text-submitted';

exports.publishJobText = functions.https.onRequest(async (req, res) => {
  // Check if the request method is POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Check if the request body contains the required data
  if (!req.body || !req.body.message) {
    return res.status(400).send('Bad Request: Missing message in the request body');
  }

  try {
    // Publish the message to the Pub/Sub topic
    const messageBuffer = Buffer.from(JSON.stringify(req.body.message));
    const messageId = await pubsub.topic(topicName).publish(messageBuffer);

    console.log(`Message ${messageId} published.`);
    res.status(200).send(`Text published successfully. Message ID: ${messageId}`);
  } catch (error) {
    console.error('Error publishing Text', error);
    res.status(500).send('Internal Server Error: Failed to publish Text');
  }
});