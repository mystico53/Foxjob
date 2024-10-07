const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin SDK
initializeApp();

// Get Firestore instance
const db = getFirestore();

// Import your function modules
const { match } = require('./match');
const { publishJobText } = require('./publishJobText');
//const { processPubSubText } = require('./processPubSubText');
const { saveRawPubSubMessage } = require('./saveRawPubSubMessage');
const { extractJobDescription } = require('./extractJobDescription');
const { summarizeJobDescription } = require('./summarizeJobDescription');
const { extractJobRequirements } = require('./extractJobRequirements');
const { calculateScore } = require('./calculateScore');

// Export all Cloud Functions
exports.match = match;
exports.publishJobText = publishJobText;
//exports.processText = processPubSubText;
exports.saveRawMessage = saveRawPubSubMessage;
exports.extractJobDescription = extractJobDescription;
exports.summarizeJobDescription = summarizeJobDescription;
exports.extractJobRequirements = extractJobRequirements;
exports.calculateScore = calculateScore;