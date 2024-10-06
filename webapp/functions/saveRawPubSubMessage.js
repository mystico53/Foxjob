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

    // Create a reference to the 'raw' document
    const rawRef = userRef.collection('jobs').doc(newDocId).collection('raw').doc('document');

    // Add the raw data to the 'raw' document
    await rawRef.set({
      rawtext: text,
      textlength: text.length,
      url: url,
      timestamp: Firestore.FieldValue.serverTimestamp()
    });

    console.log('Raw document written with ID: ', newDocId);

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

    console.log(`Message ${messageId} published to topic ${topicName}`);
    console.log('saveRawPubSubMessage function completed successfully');

    return { 
      firestoreDocPath: rawRef.path,
      topicName: topicName,
      messageId: messageId
    };
  } catch (error) {
    console.error('Error in saveRawPubSubMessage:', error);
    return null;
  }
});