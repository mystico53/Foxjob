const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const axios = require('axios');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configuration
const CONFIG = {
  SEARCH_FUNCTION_URL: 'http://127.0.0.1:5001/jobille-45494/us-central1/searchBright'
};

exports.runScheduledSearches = onSchedule({
  schedule: 'every day 03:00',  // Run daily at 3 AM
  timeZone: 'America/New_York', // Adjust as needed
  memory: '512MiB'
}, async (event) => {
  try {
    logger.info('Starting scheduled search run');
    
    // Calculate current time
    const now = admin.firestore.Timestamp.now();
    
    // Query for searches due to run
    const searchesSnapshot = await db.collectionGroup('searchQueries')
      .where('isActive', '==', true)
      .where('nextRun', '<=', now)
      .get();
    
    if (searchesSnapshot.empty) {
      logger.info('No scheduled searches to run at this time');
      return;
    }
    
    logger.info(`Found ${searchesSnapshot.size} scheduled searches to run`);
    
    // Process each search
    const promises = searchesSnapshot.docs.map(async (searchDoc) => {
      const searchData = searchDoc.data();
      const userId = searchDoc.ref.path.split('/')[1]; // Extract userId from path
      
      try {
        logger.info(`Processing scheduled search for user ${userId}`, { 
          searchId: searchDoc.id 
        });
        
        // Call the searchBright function with the saved search parameters
        await axios.post(CONFIG.SEARCH_FUNCTION_URL, {
          userId,
          searchParams: searchData.searchParams,
          limit: searchData.limit,
          schedule: {
            searchId: searchDoc.id
          }
        });
        
        // Calculate next run time based on frequency
        const nextRun = calculateNextRunTime(searchData.frequency);
        
        // Update the search document with next run time
        await searchDoc.ref.update({
          nextRun
        });
        
        logger.info(`Successfully triggered scheduled search for user ${userId}`, {
          searchId: searchDoc.id,
          nextRun
        });
        
      } catch (error) {
        logger.error(`Error executing scheduled search for user ${userId}`, {
          searchId: searchDoc.id,
          error: error.message
        });
        
        // Update document with error information
        await searchDoc.ref.update({
          lastRun: now,
          lastRunStatus: 'error',
          lastRunError: error.message,
          nextRun: calculateNextRunTime(searchData.frequency) // Still set next run
        });
      }
    });
    
    await Promise.all(promises);
    logger.info('Scheduled search run completed');
    
  } catch (error) {
    logger.error('Error in runScheduledSearches function', { error });
    throw error;
  }
});

// Helper function to calculate next run time (same as above)
function calculateNextRunTime(frequency) {
  const now = new Date();
  
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'biweekly':
      now.setDate(now.getDate() + 14);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    default:
      now.setDate(now.getDate() + 1);
  }
  
  return admin.firestore.Timestamp.fromDate(now);
}