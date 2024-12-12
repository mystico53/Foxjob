const { onRequest } = require('firebase-functions/v2/https');
const cors = require('cors')({ origin: true });
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { Firestore } = require("firebase-admin/firestore");

const db = admin.firestore();

exports.structureResume = onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Log the incoming request
      logger.info('Structure resume function called', req.body);

      const { userId } = req.body;

      // Validate required fields
      if (!userId) {
        logger.error('No userId provided');
        return res.status(400).json({ 
          error: 'Missing userId',
          received: req.body
        });
      }

      const userCollectionsRef = db
        .collection('users')
        .doc(userId)
        .collection('UserCollections');

      const resumeQuery = await userCollectionsRef
        .where('type', '==', 'Resume')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (resumeQuery.empty) {
        logger.error('No resume found for user:', userId);
        return res.status(404).json({
          error: 'No resume found'
        });
      }

      const resumeDoc = resumeQuery.docs[0];
      const resumeData = resumeDoc.data();

      res.status(200).json({
        success: true,
        resume: resumeData.extractedText
      });

    } catch (error) {
      logger.error('Error retrieving resume:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        received: req.body
      });
    }
  });
});