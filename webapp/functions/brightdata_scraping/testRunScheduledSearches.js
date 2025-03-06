const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const axios = require('axios');
const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configuration
const CONFIG = {
  // Use the deployed URL in production
  //SEARCH_FUNCTION_URL: 'https://us-central1-jobille-45494.cloudfunctions.net/searchBright',
  // For local testing, uncomment this:
  SEARCH_FUNCTION_URL: 'http://127.0.0.1:5001/jobille-45494/us-central1/searchBright'
};

// The core logic function - independent of the trigger
async function processScheduledSearches() {
  try {
    logger.info('Starting scheduled search run');
    
    // Calculate current time
    const now = Timestamp.now();
    
    // Query for searches due to run
    const searchesSnapshot = await db.collectionGroup('searchQueries')
      .where('isActive', '==', true)
      .where('nextRun', '<=', now)
      .get();
    
    if (searchesSnapshot.empty) {
      logger.info('No scheduled searches to run at this time');
      return { searchesRun: 0 };
    }
    
    logger.info(`Found ${searchesSnapshot.size} scheduled searches to run`);
    
    const results = {
      searchesRun: searchesSnapshot.size,
      successful: 0,
      failed: 0,
      details: []
    };
    
    // Process each search
    const promises = searchesSnapshot.docs.map(async (searchDoc) => {
      const searchData = searchDoc.data();
      const userId = searchDoc.ref.path.split('/')[1]; // Extract userId from path
      const searchDetail = {
        userId,
        searchId: searchDoc.id,
        status: 'pending'
      };
      
      try {
        logger.info(`Executing search with params:`, {
            userId,
            searchParamsData: searchData.searchParams
          });
          
          const response = await axios.post(CONFIG.SEARCH_FUNCTION_URL, {
            userId,
            searchParams: searchData.searchParams, // This should already be an array from Firestore
            limit: searchData.limit || 1,
            schedule: {
              searchId: searchDoc.id,
              frequency: searchData.frequency // Pass the frequency back
            }
          });
        
        // Calculate next run time based on frequency
        const nextRun = calculateNextRunTime(searchData.frequency);
        
        // Update the search document with next run time
        await searchDoc.ref.update({
          lastRun: FieldValue.serverTimestamp(),
          lastRunStatus: 'success',
          lastRunResult: response.data,
          nextRun
        });
        
        logger.info(`Successfully triggered scheduled search for user ${userId}`, {
          searchId: searchDoc.id,
          nextRun
        });
        
        searchDetail.status = 'success';
        searchDetail.nextRun = nextRun;
        results.successful++;
        
      } catch (error) {
        logger.error(`Error executing scheduled search for user ${userId}`, {
          searchId: searchDoc.id,
          error: error.message
        });
        
        // Update document with error information
        await searchDoc.ref.update({
          lastRun: FieldValue.serverTimestamp(),
          lastRunStatus: 'error',
          lastRunError: error.message,
          nextRun: calculateNextRunTime(searchData.frequency) // Still set next run
        });
        
        searchDetail.status = 'error';
        searchDetail.error = error.message;
        results.failed++;
      }
      
      results.details.push(searchDetail);
    });
    
    await Promise.all(promises);
    logger.info('Scheduled search run completed', {
      successful: results.successful,
      failed: results.failed
    });
    
    return results;
    
  } catch (error) {
    logger.error('Error in processScheduledSearches function', { error });
    throw error;
  }
}

// The scheduled function just calls the core logic
exports.runScheduledSearches = onSchedule({
  schedule: 'every day 03:00',
  timeZone: 'America/New_York',
  memory: '512MiB'
}, async (event) => {
  return processScheduledSearches();
});

// For testing or manual runs, expose an HTTP endpoint
exports.testRunScheduledSearches = onRequest({
  timeoutSeconds: 540,
  memory: "512MiB"
}, async (req, res) => {
  try {
    const result = await processScheduledSearches();
    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error in manualRunScheduledSearches', { error });
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Helper function to calculate next run time based on frequency
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
  
  return Timestamp.fromDate(now);
}