// functions/services/operations.js
const admin = require('../firebaseAdmin'); 
const logger = require('firebase-functions/logger');

const db = admin.firestore();

const operations = {
  async getDocument(googleId, docId, collections = ['users', 'jobs']) {
    let ref = db;
    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      const docIdToUse = i === 0 ? googleId : i === collections.length - 1 ? docId : null;
      ref = ref.collection(collection);
      if (docIdToUse) {
        ref = ref.doc(docIdToUse);
      }
    }
    const docSnapshot = await ref.get();
    
    // Add debug logging
    if (docSnapshot.exists) {
      const data = docSnapshot.data();
      logger.info('Document data:', {
        path: ref.path,
        data: JSON.stringify(data, null, 2)
      });
    }
    
    return { 
      docRef: ref, 
      docSnapshot,
      docData: docSnapshot.exists ? docSnapshot.data() : null 
    };
  },

  async getFieldValue(data, path) {
    if (!path) return null;
    return path.split('.').reduce((obj, key) => {
      if (obj && typeof obj === 'object') {
        return obj[key];
      }
      return null;
    }, data);
  },

  async updateField(docRef, currentData, fieldPath, value) {
    const update = {};
    update[fieldPath] = value;
    await docRef.update(update);
    logger.info(`Updated ${fieldPath} successfully`, {
      fieldPath,
      valuePreview: typeof value === 'string' ? 
        value.substring(0, 100) : 
        JSON.stringify(value).substring(0, 100)
    });
  },

  async publishNext(pubSubClient, topicName, message) {
    try {
      const topic = pubSubClient.topic(topicName);
      const [exists] = await topic.exists();
      if (!exists) {
        await pubSubClient.createTopic(topicName);
      }

      const messageId = await topic.publishMessage({
        data: Buffer.from(JSON.stringify(message)),
      });
      logger.info(`Published to ${topicName}, messageId: ${messageId}`, {
        message: JSON.stringify(message)
      });
    } catch (error) {
      logger.error(`Failed to publish to ${topicName}:`, error);
      throw error;
    }
  },
};

module.exports = { operations };