// functions/services/operations.js
const admin = require('../firebaseAdmin'); 
const logger = require('firebase-functions/logger');

const db = admin.firestore();

const operations = {
  // Keep your existing helper function
  _processPathSegments(collectionPath) {
    if (!collectionPath || !collectionPath.length) return [];
    
    return typeof collectionPath === 'string' 
      ? collectionPath.split('/').filter(Boolean)
      : Array.isArray(collectionPath) 
        ? collectionPath.flatMap(p => p.split(',').map(s => s.trim()))
        : [];
  },

  async getDocuments(googleId, docId, collectionPaths) {
    try {
      logger.info('Starting multiple document retrieval:', {
        googleId,
        docId,
        collectionPaths
      });

      // Get documents from each collection
      const results = await Promise.all(
        collectionPaths.map(collectionPath => {
          let ref = db.collection('users').doc(googleId).collection(collectionPath).doc(docId);
          return ref.get().then(snapshot => ({
            collection: collectionPath,
            data: snapshot.exists ? snapshot.data() : null
          }));
        })
      );

      // Combine data with collection names as top-level keys
      const combinedData = {};
      results.forEach(({ collection, data }) => {
        if (data) {
          combinedData[collection] = data;
        }
      });

      logger.debug('Combined document data:', {
        data: JSON.stringify(combinedData)
      });

      // Use the first document's reference for updates
      const primaryRef = db.collection('users').doc(googleId)
        .collection(collectionPaths[0]).doc(docId);

      return {
        docRef: primaryRef,
        docData: combinedData
      };

    } catch (error) {
      logger.error('Error in getDocuments:', {
        googleId,
        docId,
        collectionPaths,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  async getDocument(googleId, docId, collectionPath) {
    try {
      // If array is provided with multiple paths, treat as multiple collections
      if (Array.isArray(collectionPath) && collectionPath.length > 1) {
        return await this.getDocuments(googleId, docId, collectionPath);
      }

      // Process the collection path
      const path = Array.isArray(collectionPath) ? collectionPath[0] : collectionPath;
      
      logger.info('Starting document retrieval:', {
        googleId,
        docId,
        collectionPath: path,
        initialPath: `users/${googleId}`
      });

      const ref = db.collection('users').doc(googleId).collection(path).doc(docId);

      logger.info('Attempting to retrieve document:', {
        finalPath: ref.path
      });

      const docSnapshot = await ref.get();
      
      if (docSnapshot.exists) {
        const data = docSnapshot.data();
        // For single collection, don't wrap in collection name
        const docData = data;
        
        logger.info('Document retrieved successfully:', {
          path: ref.path,
          dataSnapshot: JSON.stringify(docData, null, 2)
        });
        
        return { 
          docRef: ref, 
          docSnapshot,
          docData
        };
      } else {
        logger.warn('Document does not exist:', {
          path: ref.path
        });
        return { 
          docRef: ref, 
          docSnapshot,
          docData: null 
        };
      }

    } catch (error) {
      logger.error('Error in getDocument:', {
        googleId,
        docId,
        collectionPath,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
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