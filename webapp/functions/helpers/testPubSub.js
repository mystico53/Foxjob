const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const cors = require('cors')({ origin: true });
const { PubSub } = require('@google-cloud/pubsub');

const pubSubClient = new PubSub();

exports.testPubSub = onRequest((req, res) => {
  logger.info('testPubSub function called');

  return cors(req, res, async () => {
    try {
      // Get data from request body - changed docId to jobId
      const { jobId, firebaseUid, topicName } = req.body;
      
      logger.info('Received pub/sub test request:', {
        jobId,
        firebaseUid,
        topicName
      });

      // Validate required parameters
      if (!jobId || !firebaseUid || !topicName) {
        const errorMsg = 'Missing required parameters: jobId, firebaseUid, or topicName';
        logger.error(errorMsg, {
          receivedParams: {
            hasJobId: !!jobId,
            hasFirebaseUid: !!firebaseUid,
            hasTopicName: !!topicName
          }
        });
        res.status(400).json({ error: errorMsg });
        return;
      }
      
      // Validate parameter formats
      if (typeof jobId !== 'string' || typeof firebaseUid !== 'string') {
        const errorMsg = 'Invalid parameter types: jobId and firebaseUid must be strings';
        logger.error(errorMsg, {
          types: {
            jobId: typeof jobId,
            firebaseUid: typeof firebaseUid
          }
        });
        res.status(400).json({ error: errorMsg });
        return;
      }

      // Ensure the topic exists
      await pubSubClient.createTopic(topicName).catch((err) => {
        if (err.code === 6) {  // Already exists
          logger.info(`Topic ${topicName} already exists`);
        } else {
          throw err;
        }
      });

      const message = { firebaseUid, jobId };  // Changed docId to jobId
      logger.info('Publishing message:', message);

      // Publish the message
      const messageId = await pubSubClient.topic(topicName).publishMessage({
        data: Buffer.from(JSON.stringify(message)),
      });

      logger.info(`Message published successfully:`, {
        messageId,
        topicName,
        jobId,
        firebaseUid
      });

      res.json({ 
        success: true,
        messageId,
        topicName,
        message: `Message published to topic ${topicName}`,
        jobId,  // Changed from docId
        firebaseUid,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in testPubSub:', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });
});