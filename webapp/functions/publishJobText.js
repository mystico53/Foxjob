const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { PubSub } = require('@google-cloud/pubsub');
const cors = require('cors')({ origin: true });

const pubsub = new PubSub();
const topicName = 'job-text-submitted';

const publishJobText = onRequest(async (req, res) => {
  return cors(req, res, async () => {
    // Check if the request method is POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    // Check if the request body contains the required data
    if (!req.body || !req.body.message) {
      res.status(400).json({ error: 'Bad Request: Missing message in the request body' });
      return;
    }

    try {
      // Publish the message to the Pub/Sub topic
      const messageBuffer = Buffer.from(JSON.stringify(req.body.message));
      const messageId = await pubsub.topic(topicName).publish(messageBuffer);

      logger.info(`Message ${messageId} published.`);
      res.status(200).json({
        status: 'success',
        message: 'Text published successfully.',
        messageId: messageId
      });
    } catch (error) {
      logger.error('Error publishing Text', error);
      res.status(500).json({ error: 'Internal Server Error: Failed to publish Text' });
    }
  });
});

module.exports = { publishJobText };
