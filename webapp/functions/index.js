const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const { processText } = require('./processText');
const { match } = require('./match');

// Export all Cloud Functions
exports.processText = processText;
exports.match = match;

exports.helloWorld = onRequest((request, response) => {
  // Set CORS headers
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  logger.info("Hello logs!", { structuredData: true });
  
  // Set the content type to application/json
  response.setHeader('Content-Type', 'application/json');
  
  // Send a JSON response
  response.send(JSON.stringify({
    message: "Hello from Firebase!",
    timestamp: new Date().toISOString()
  }));
});
