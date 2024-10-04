const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin SDK
initializeApp();

// Get Firestore instance
const db = getFirestore();

// Initialize Firestore emulator if needed
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log('Connecting to Firestore emulator');
  db.settings({
    host: process.env.FIRESTORE_EMULATOR_HOST,
    ssl: false,
  });
}

// Import your function modules
const { match } = require('./match');
const { publishJobText } = require('./publishJobText');
const { processPubSubText } = require('./processPubSubText');

// Export all Cloud Functions
exports.match = match;
exports.publishJobText = publishJobText;
exports.processText = processPubSubText;