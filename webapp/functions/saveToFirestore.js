const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

exports.saveToFirestore = functions.https.onRequest(async (request, response) => {
  // Handle CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  // Get the data from the request body
  const { googleId, processedData } = request.body;

  if (!googleId || !processedData) {
    console.error('Missing required parameters');
    response.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    const db = admin.firestore();
    
    // Create a reference to the user's document
    const userRef = db.collection('users').doc(googleId);

    // Add the processed data to the user's 'processed' subcollection
    const processedRef = await userRef.collection('processed').add({
      ...processedData,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Document written with ID: ', processedRef.id);
    response.json({ result: 'Document written with ID: ' + processedRef.id });
  } catch (error) {
    console.error("Error writing to Firestore: ", error);
    response.status(500).send("Error writing to Firestore: " + error.message);
  }
});