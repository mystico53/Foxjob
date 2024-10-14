const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const admin = require('firebase-admin');
const { Firestore } = require("firebase-admin/firestore");
const { PubSub } = require('@google-cloud/pubsub');

// Ensure Firestore instance is reused
const db = admin.firestore();
const pubSubClient = new PubSub();

exports.saveRawPubSubMessage = onMessagePublished('job-text-submitted', async (event) => {
  console.log('saveRawPubSubMessage function called');

  const pubSubMessage = event.data.message.data
    ? JSON.parse(Buffer.from(event.data.message.data, 'base64').toString())
    : null;

  if (!pubSubMessage) {
    console.error('No valid message received from Pub/Sub');
    return null;
  }

  // Extract parameters from the Pub/Sub message
  const { text, url, googleId } = pubSubMessage;

  console.log('Received message with:', {
    textLength: text ? text.length : 0,
    url,
    googleId,
  });

  if (!text || !url || !googleId) {
    console.error('Missing required parameters');
    return null;
  }

  try {
    // Create a reference to the user's document
    const userRef = db.collection('users').doc(googleId);

    // Generate a new document ID
    const newDocId = db.collection('temp').doc().id;

    // Create a reference to the job document
    const jobRef = userRef.collection('jobs').doc(newDocId);

    // Prepare the data to be saved
    const jobData = {
      texts: {
        rawText: text || "na",
        rawLength: text ? text.length : 0
      },
      generalData: {
        url: url || "na",
        timestamp: Firestore.FieldValue.serverTimestamp(),
        status: "New",
        processingStatus: "processing",
        hidden: false 
      },
      
    };

    // Add the data to the job document
    await jobRef.set(jobData, { merge: true });

    console.log('Job document written with ID: ', newDocId);

    // Create a new topic name
    const topicName = 'raw-text-stored';
    
    // Ensure the topic exists
    await pubSubClient.createTopic(topicName).catch((err) => {
      if (err.code === 6) {
        console.log('Topic already exists');
      } else {
        throw err;
      }
    });

    // Prepare the simplified message
    const message = {
      googleId: googleId,
      docId: newDocId
    };

    // Publish the message to the topic
    const messageId = await pubSubClient.topic(topicName).publishMessage({
      data: Buffer.from(JSON.stringify(message)),
    });

    console.log(`Message ${messageId} published to topic ${topicName} and path ${jobRef.path}`);
    console.log('saveRawPubSubMessage function completed successfully');

    return { 
      firestoreDocPath: jobRef.path,
      topicName: topicName,
      messageId: messageId
    };
  } catch (error) {
    console.error('Error in saveRawPubSubMessage:', error);
    await populateWithNA(googleId, newDocId);
    return null;
  }
});

// Helper function to populate fields with "na"
async function populateWithNA(googleId, docId) {
  try {
    const jobRef = db.collection('users').doc(googleId).collection('jobs').doc(docId);
    await jobRef.set({
      texts: {
        rawText: "na",
        extractedLength: 0
      },
      generalData: {
        url: "na",
        timestamp: Firestore.FieldValue.serverTimestamp(),
        hidden: false
      },
    }, { merge: true });
    console.log('Fields populated with "na" due to error');
  } catch (error) {
    console.error('Error populating fields with "na":', error);
  }
}