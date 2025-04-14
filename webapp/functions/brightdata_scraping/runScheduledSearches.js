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
  //SEARCH_FUNCTION_URL: 'https://searchbright-kvshkfhmua-uc.a.run.app'
  // For local testing, uncomment this:
  //SEARCH_FUNCTION_URL: 'http://127.0.0.1:5001/jobille-45494/us-central1/searchBright'
  SEARCH_FUNCTION_URL: 'https://288f-99-8-162-33.ngrok-free.app/jobille-45494/us-central1/searchBright'
};

// The core logic function - independent of the trigger
async function processScheduledSearches() {
  try {
    logger.info('Starting scheduled search run');
    
    // Calculate current time
    const now = Timestamp.now();
    
    // Query for searches due to run that are not currently processing
    const searchesSnapshot = await db.collectionGroup('searchQueries')
      .where('isActive', '==', true)
      .where('nextRun', '<=', now)
      .where('processingStatus', '==', 'online')  // Only select online searches
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
      const searchId = searchDoc.id;
      const searchDetail = {
        userId,
        searchId,
        status: 'pending'
      };
      
      try {
        // First, mark this search as processing using a transaction to avoid race conditions
        await db.runTransaction(async (transaction) => {
          // Get a fresh snapshot of the document
          const freshDoc = await transaction.get(searchDoc.ref);
          
          if (!freshDoc.exists) {
            throw new Error('Search document no longer exists');
          }
          
          const freshData = freshDoc.data();
          
          // Check if someone else has already started processing
          if (freshData.processingStatus !== 'online') {
            throw new Error('Search is already being processed');
          }
          
          // Mark as processing
          transaction.update(searchDoc.ref, {
            processingStatus: 'processing',
            processingStartedAt: FieldValue.serverTimestamp()
          });
        });
        
        logger.info(`Processing scheduled search for user ${userId}`, { 
          searchId: searchDoc.id 
        });

        // Parse searchParams to ensure it's an array
        const searchParamsArray = typeof searchData.searchParams === 'string' 
          ? JSON.parse(searchData.searchParams) 
          : searchData.searchParams;
        
        // Clean up empty strings from searchParams
        if (searchParamsArray && searchParamsArray.length > 0) {
          Object.keys(searchParamsArray[0]).forEach(key => {
            if (searchParamsArray[0][key] === "") {
              delete searchParamsArray[0][key]; // Remove empty string fields
            }
          });
          
          // Normalize time_range
          if (searchParamsArray[0].time_range === "Any time") {
            searchParamsArray[0].time_range = "Past 24 hours";
          }
        }
        
        logger.info(`Cleaned search parameters for BrightData:`, { 
          userId,
          searchParams: JSON.stringify(searchParamsArray),
          limit: searchData.limit,
          searchId
        });
        
        // Call the searchBright function with the cleaned search parameters
        const response = await axios.post(CONFIG.SEARCH_FUNCTION_URL, {
          userId,
          searchParams: searchParamsArray, // Use the cleaned array
          limit: searchData.limit,
          schedule: {
            searchId,
            frequency: searchData.frequency,
            deliveryTime: searchData.deliveryTime // Pass the delivery time
          }
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Calculate next run time based on frequency and delivery time
        const nextRun = calculateNextRunTime(searchData.frequency, searchData.deliveryTime);
        
        // Update the search document with next run time and reset processing status
        await searchDoc.ref.update({
          lastRun: FieldValue.serverTimestamp(),
          lastRunStatus: 'success',
          nextRun,
          processingStatus: 'online',
          processingCompletedAt: FieldValue.serverTimestamp()
        });
        
        logger.info(`Successfully triggered scheduled search for user ${userId}`, {
          searchId,
          nextRun,
          deliveryTime: searchData.deliveryTime
        });
        
        searchDetail.status = 'success';
        searchDetail.nextRun = nextRun;
        results.successful++;
        
      } catch (error) {
        // Enhanced error logging
        logger.error(`Detailed API error:`, {
          searchId,
          errorMessage: error.message,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
          requestURL: CONFIG.SEARCH_FUNCTION_URL
        });
        
        logger.error(`Error executing scheduled search for user ${userId}`, {
          searchId,
          error: error.message
        });
        
        // Update document with error information and reset processing status
        await searchDoc.ref.update({
          lastRun: FieldValue.serverTimestamp(),
          lastRunStatus: 'error',
          lastRunError: error.message,
          processingStatus: 'online',
          processingCompletedAt: FieldValue.serverTimestamp(),
          nextRun: calculateNextRunTime(searchData.frequency, searchData.deliveryTime) // Still set next run with delivery time
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
  schedule: 'every 2 minutes',
  timeZone: 'America/New_York',
  memory: '512MiB'
}, async (event) => {
  return processScheduledSearches();
});

// For testing or manual runs, expose an HTTP endpoint
exports.manualRunScheduledSearches = onRequest({
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

// Updated helper function to calculate next run time based on frequency and delivery time
function calculateNextRunTime(frequency, deliveryTime = '08:00') {
  const now = new Date();
  let nextRun = new Date();
  
  // Parse the delivery time (format: "HH:MM")
  const [hours, minutes] = deliveryTime.split(':').map(num => parseInt(num, 10));
  
  // Set the time component to the specified delivery time
  nextRun.setHours(hours, minutes, 0, 0);
  
  // If the delivery time for today has already passed, start from tomorrow
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  // Add additional days based on frequency
  switch (frequency) {
    case 'daily':
      // Already set for the next day if needed
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'biweekly':
      nextRun.setDate(nextRun.getDate() + 14);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
    default:
      // Default to daily if frequency is not recognized
  }
  
  return Timestamp.fromDate(nextRun);
}