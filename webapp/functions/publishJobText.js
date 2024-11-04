const { onRequest } = require("firebase-functions/v2/https");
const cors = require('cors')({ origin: true });
const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub();
const topicName = 'job-text-submitted';

const publishJobText = onRequest(async (req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    if (!req.body || !req.body.message) {
      res.status(400).json({ error: 'Bad Request: Missing message in the request body' });
      return;
    }

    try {
      const topic = pubsub.topic(topicName);
      const [exists] = await topic.exists();
      if (!exists) {
        await topic.create();
      }

      const messageBuffer = Buffer.from(JSON.stringify(req.body.message));
      const messageId = await topic.publish(messageBuffer);

      res.status(200).json({
        status: 'success',
        message: 'Text published successfully.',
        messageId: messageId,
      });
    } catch (error) {
      res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
  });
});

module.exports = { publishJobText };