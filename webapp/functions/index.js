const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// index.js
//const { processText } = require('./processText');
const { match } = require('./match');
const { publishJobText } = require('./publishJobText');

const { processPubSubText } = require('./processPubSubText');

// Export all Cloud Functions
//exports.processText = processText;
exports.match = match;
exports.publishJobText = publishJobText;

exports.processText = processPubSubText;