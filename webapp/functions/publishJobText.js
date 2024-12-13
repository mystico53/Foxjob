// index.js (or functions.js)
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const cors = require('cors')({ origin: true });
const { PubSub } = require('@google-cloud/pubsub');
const admin = require('firebase-admin');
const { Firestore } = require("firebase-admin/firestore");
const FieldValue = Firestore.FieldValue;

const pubsub = new PubSub();
const topicName = 'job-text-submitted';
const db = admin.firestore();

/**
 * Maps googleSubId to firebaseUid.
 * Utilizes the googleSubToUid collection for mapping.
 * @param {string} googleSubId
 * @returns {Promise<{ firebaseUid: string, isPending: boolean }>}
 */
async function mapGoogleSubIdToFirebaseUid(googleSubId) {
  try {
    const mappingRef = db.collection('googleSubToUid').doc(googleSubId);
    const mappingDoc = await mappingRef.get();

    if (mappingDoc.exists) {
      const { firebaseUid } = mappingDoc.data();
      const isPending = firebaseUid.startsWith('pending_');
      return { firebaseUid, isPending };
    }

    // If mapping doesn't exist, attempt to create it
    try {
      const userRecord = await admin.auth().getUserByProviderUid('google.com', googleSubId);
      logger.info('Found existing Firebase Auth user:', userRecord.uid);
      
      // Update Firestore user document if necessary
      await db
        .collection('users')
        .doc(userRecord.uid)
        .set({
          googleSubId: googleSubId,
          email: userRecord.email,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      
      // Create the mapping
      await mappingRef.set({
        firebaseUid: userRecord.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return { firebaseUid: userRecord.uid, isPending: false };
    } catch (authError) {
      logger.info('No existing Firebase Auth user found, checking Firestore');

      // If Auth lookup fails, check Firestore as fallback
      const usersSnapshot = await db
        .collection('users')
        .where('googleSubId', '==', googleSubId)
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        logger.info('Found existing user mapping in Firestore:', userDoc.id);

        // Create the mapping
        await mappingRef.set({
          firebaseUid: userDoc.id,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

        return { firebaseUid: userDoc.id, isPending: false };
      }

      // No user found anywhere, create pending user
      logger.info('Creating pending user');
      const tempRef = await db.collection('pending_users').add({
        googleSubId: googleSubId,
        createdAt: FieldValue.serverTimestamp(),
        processedData: []
      });
      
      // Create mapping for pending user
      const pendingUid = `pending_${tempRef.id}`;
      await mappingRef.set({
        firebaseUid: pendingUid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return { firebaseUid: pendingUid, isPending: true };
    }
  } catch (error) {
    logger.error('Error in mapGoogleSubIdToFirebaseUid:', error);
    throw error;
  }
}

const publishJobText = onRequest(async (req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    if (!req.body || !req.body.message) {
      res.status(400).json({ error: 'Bad Request: Missing message in the request body' });
      return;
    }

    const message = req.body.message;

    if (!message.googleId) {
      res.status(400).json({ error: 'Bad Request: Missing googleId in message' });
      return;
    }

    try {
      // Map Google Sub ID to Firebase UID or pending ID
      const { firebaseUid, isPending } = await mapGoogleSubIdToFirebaseUid(message.googleId);
      logger.info(`Mapped googleSubId ${message.googleId} to firebaseUid ${firebaseUid}`);

      // Enrich the message with mapping details
      const enrichedMessage = {
        ...message,
        firebaseUid,
        originalGoogleId: message.googleId,
        isPending
      };

      // Publish the message to Pub/Sub
      const topic = pubsub.topic(topicName);
      const [exists] = await topic.exists();
      if (!exists) {
        await topic.create();
      }

      const messageBuffer = Buffer.from(JSON.stringify(enrichedMessage));
      const messageId = await topic.publish(messageBuffer);

      res.status(200).json({
        status: 'success',
        message: 'Text published successfully.',
        messageId: messageId,
        firebaseUid,
        isPending
      });
    } catch (error) {
      logger.error('Error publishing text:', error);
      res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
  });
});

module.exports = { publishJobText };
