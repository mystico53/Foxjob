const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { extractTextWithAnthropic } = require('./extractTextWithAnthropic');

// Import FieldValue explicitly
const { Firestore } = require("firebase-admin/firestore");
const FieldValue = Firestore.FieldValue;

async function saveExtractedJDText({ googleId, processedDocId, rawText }) {
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
      
      // Add the extracted text as extractedJDText text to the 'extractedJDText' subcollection
      const extractedJDTextRef = await processedRef.collection('extractedJDText').add({
        text: extractedText,
        timestamp: FieldValue.serverTimestamp()
      });
      
      logger.info('Extracted text saved as extractedJDText with ID:', extractedJDTextRef.id);
      return { id: extractedJDTextRef.id };
    } catch (error) {
      logger.error('Error in saveExtractedJDText:', error);
      throw error;
    }
  }

module.exports = { saveExtractedJDText };
