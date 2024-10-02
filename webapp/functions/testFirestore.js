const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Initialize Firebase app only once
if (!admin.apps.length) {
  admin.initializeApp();
  const db = admin.firestore();

  // Initialize Firestore emulator only once
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('Connecting to Firestore emulator');
    db.settings({
      host: 'localhost:8080',
      ssl: false,
    });
  }
}

// Ensure the Firestore instance is reused
const db = admin.firestore();

exports.testFirestore = onRequest(async (req, res) => {
  try {
    const testDoc = await db.collection('testCollection').add({
      message: 'Firestore emulator is working!',
    });

    res.status(200).send(`Test document written with ID: ${testDoc.id}`);
  } catch (error) {
    console.error('Error writing test document:', error);
    res.status(500).send('Error writing test document.');
  }
});
