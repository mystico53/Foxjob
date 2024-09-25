const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

exports.saveToFirestore = functions.https.onRequest(async (request, response) => {
  try {
    const db = admin.firestore();
    
    // Create a test document
    const testData = {
      message: "Test entry",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add the test document to a 'test' collection
    const docRef = await db.collection('test').add(testData);

    console.log('Document written with ID: ', docRef.id);
    response.json({ result: 'Document written with ID: ' + docRef.id });
  } catch (error) {
    console.error("Error writing to Firestore: ", error);
    response.status(500).send("Error writing to Firestore: " + error.message);
  }
});