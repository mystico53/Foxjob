// functions/helpers/saveUnprocessedText.js

const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { extractTextWithAnthropic } = require('./extractTextWithAnthropic');

// Ensure Firebase Admin is initialized elsewhere to avoid multiple initializations
// Do not call admin.initializeApp() here

async function saveUnprocessedText({ googleId, processedDocId, rawText }) {
    try {
      // Process the raw text using Anthropic API
      const extractedText = await extractTextWithAnthropic(rawText);
  
      const db = admin.firestore();
      
      // Reference to the specific processed document
      const processedRef = db
        .collection('users')
        .doc(googleId)
        .collection('processed')
        .doc(processedDocId);
      
      // Add the extracted text as unprocessed text to the 'unprocessed' subcollection
      const unprocessedRef = await processedRef.collection('unprocessed').add({
        text: extractedText,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      logger.info('Extracted text saved as unprocessed with ID:', unprocessedRef.id);
      return { id: unprocessedRef.id };
    } catch (error) {
      logger.error('Error in saveUnprocessedText:', error);
      throw error;
    }
  }
  
  module.exports = { saveUnprocessedText };
  