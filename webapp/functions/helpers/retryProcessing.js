const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const cors = require('cors')({ origin: true });

exports.retryProcessing = onRequest((req, res) => {
  logger.info('hello world - before CORS');

  return cors(req, res, () => {
    // Get data from request body
    const { jobId, userId } = req.body;
    
    // Log the specific information
    logger.info('Processing retry request', {
      jobId: jobId,
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      message: 'Processing retry initiated!',
      jobId: jobId,
      userId: userId,
      timestamp: new Date().toISOString()
    });
  });
});