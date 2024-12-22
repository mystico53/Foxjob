const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const cors = require('cors')({ origin: true });
const { PubSub } = require('@google-cloud/pubsub');

const pubSubClient = new PubSub();

exports.retryProcessing = onRequest((req, res) => {
  logger.info('retryProcessing function called');

  return cors(req, res, async () => {
    try {
      // Get data from request body
      const { jobId: docId, userId: firebaseUid } = req.body;
      
      // Log the received parameters
      logger.info('Received retry request with:', {
        docId,
        firebaseUid,
      });

      if (!docId || !firebaseUid) {
        const errorMsg = 'Missing required parameters: docId or firebaseUid';
        logger.error(errorMsg);
        res.status(400).json({ error: errorMsg });
        return;
      }

      // Create a new topic name (same as in original function)
      const topicName = 'raw-text-stored';
      
      // Ensure the topic exists
      await pubSubClient.createTopic(topicName).catch((err) => {
        if (err.code === 6) {
          logger.info('Topic already exists');
        } else {
          throw err;
        }
      });

      // Prepare the message (same format as original function)
      const message = {
        firebaseUid,
        docId
      };

      // Debug log the message being published
      logger.info('Publishing message:', message);

      // Publish the message to the topic
      const messageId = await pubSubClient.topic(topicName).publishMessage({
        data: Buffer.from(JSON.stringify(message)),
      });

      logger.info(`Message ${messageId} published to topic ${topicName}`);
      logger.info('retryProcessing function completed successfully');

      // Send success response
      res.json({ 
        success: true,
        messageId,
        topicName,
        message: 'Processing retry initiated!',
        docId,
        firebaseUid,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in retryProcessing:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });
});