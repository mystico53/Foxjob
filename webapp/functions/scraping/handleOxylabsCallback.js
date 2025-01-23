const { onRequest } = require('firebase-functions/v2/https');
const functions = require('firebase-functions');

exports.handleOxylabsCallback = onRequest({
  timeoutSeconds: 540,
  memory: "1GiB"
}, async (req, res) => {
  try {
    // Log the full request for debugging
    functions.logger.info('Received webhook:', {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      timestamp: new Date().toISOString()
    });

    // Basic validation
    const { job_id, results } = req.body;
    if (!job_id) {
      functions.logger.warn('Missing job_id in webhook');
      return res.status(400).json({ error: 'Missing job_id' });
    }

    // Log specific job info
    functions.logger.info('Processing job:', {
      jobId: job_id,
      hasResults: !!results,
      resultsSize: results ? JSON.stringify(results).length : 0
    });

    // Return success
    return res.status(200).json({
      received: true,
      jobId: job_id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    functions.logger.error('Webhook handler error:', {
      error: error.message,
      stack: error.stack
    });

    // Always return 200 to prevent Oxylabs from retrying
    return res.status(200).json({
      received: false,
      error: error.message
    });
  }
});