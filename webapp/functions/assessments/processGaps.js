const { onRequest } = require('firebase-functions/v2/https');
const cors = require('cors')({ origin: true });
const logger = require('firebase-functions/logger');

exports.processGaps = onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Log the incoming request
      logger.info('Process gaps function called', req.body);

      const { jobId, userId } = req.body;

      // Validate required fields
      if (!jobId || !userId) {
        logger.error('Missing required parameters');
        return res.status(400).json({ 
          error: 'Missing required parameters',
          received: { jobId, userId }
        });
      }

      // For now, just return "gaps received"
      res.status(200).json({ 
        message: 'gaps received',
        jobId,
        userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error processing gaps:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });
});