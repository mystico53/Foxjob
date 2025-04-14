const { onRequest } = require('firebase-functions/v2/https');
const axios = require('axios');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const config = require('../config');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const secretManager = new SecretManagerServiceClient();
const crypto = require('crypto');

if (!admin.apps.length) {
    admin.initializeApp();
}

const cors = require('cors')({
  origin: true, // Or specify allowed domains: ['https://jobille-45494.web.app']
});

const db = admin.firestore();

const CONFIG = {
  BRIGHTDATA_DATASET_ID: 'gd_lpfll7v5hcqtkxl6l',
  BASE_URL: 'https://api.brightdata.com/datasets/v3/trigger',
  WEBHOOK_BASE_URL: config.webhookBaseUrl
};

// Generate a deterministic ID based on search parameters
function generateSearchId(userId, searchParams) {
  const searchKey = JSON.stringify(searchParams);
  const hash = crypto.createHash('md5').update(userId + searchKey).digest('hex');
  return hash.substring(0, 20); // Trim to reasonable length
}

// Updated function to calculate next run time based on frequency and delivery time
// Updated function to calculate next run time based on frequency and delivery time
function calculateNextRunTime(frequency, deliveryTime = '08:00', timezoneOffset = 0) {
  // Parse the delivery time (format: "HH:MM")
  const [hours, minutes] = deliveryTime.split(':').map(num => parseInt(num, 10));
  
  // Get current time
  const now = new Date();
  
  // Create target date
  const targetDate = new Date();
  
  // Calculate UTC hours based on the delivery time and timezone offset
  // For example: 8:00 AM in Pacific (offset=7) would be 15:00 UTC
  // For example: 8:00 AM in Tokyo (offset=-9) would be 23:00 UTC (previous day)
  targetDate.setUTCHours(hours + timezoneOffset, minutes, 0, 0);
  
  // If already past today's time, move to next day
  if (targetDate <= now) {
    targetDate.setUTCDate(targetDate.getUTCDate() + 1);
  }
  
  // Apply frequency adjustments
  switch (frequency) {
    case 'daily':
      // Already set for the next day if needed
      break;
    case 'weekly':
      targetDate.setUTCDate(targetDate.getUTCDate() + 6);
      break;
    case 'biweekly':
      targetDate.setUTCDate(targetDate.getUTCDate() + 13);
      break;
    case 'monthly':
      targetDate.setUTCMonth(targetDate.getUTCMonth() + 1);
      break;
    default:
      // Default to daily
  }
  
  console.log(`Setting next run time for ${deliveryTime} in timezone with offset ${timezoneOffset}`);
  console.log(`UTC date: ${targetDate.toISOString()}`);
  console.log(`Local time will be: ${targetDate.toString()}`);
  
  return Timestamp.fromDate(targetDate);
}

exports.searchBright = onRequest({ 
  timeoutSeconds: 540,
  memory: "1GiB",
  secrets: ["BRIGHTDATA_API_TOKEN", "WEBHOOK_SECRET"],
}, async (req, res) => {
  console.log("ENTRY_POINT_DEBUG - searchBright request received:", {
    method: req.method,
    hasBody: !!req.body,
    isScheduled: req.body?.schedule ? true : false
  });
  
  console.log("ENTRY_LOG - searchBright function entry point", {
    method: req.method,
    contentType: req.headers['content-type'],
    bodySize: req.body ? JSON.stringify(req.body).length : 0,
    isScheduled: req.body && req.body.schedule ? "YES" : "NO"
  });
  
  // Wrap the entire function with CORS middleware
  return cors(req, res, async () => {
    const startTime = Date.now();  
    
    try {
      const { userId, searchParams, limit, schedule } = req.body;
      
      // Validate inputs
      if (!userId || !searchParams?.length) {
        return res.status(400).json({ error: "userId and searchParams are required" });
      }

      // Generate a deterministic document ID based on search parameters
      let searchId;
      
      // Process scheduling if requested
      if (schedule) {
        const { frequency, isActive, deliveryTime = '08:00' } = schedule;
        
        if (!frequency) {
          return res.status(400).json({ error: "Frequency is required for scheduled searches" });
        }
        
        try {
          // Use provided searchId or generate a deterministic one
          searchId = schedule.searchId || generateSearchId(userId, searchParams);
          
          // Reference to the search document
          const searchRef = db.collection('users')
            .doc(userId)
            .collection('searchQueries')
            .doc(searchId);
          
          // Check if document exists
          const docSnapshot = await searchRef.get();
          
          if (docSnapshot.exists) {
            // Update existing document instead of creating a new one
            await searchRef.update({
              searchParams,
              limit: limit || 100,
              frequency,
              deliveryTime, // Store the delivery time
              isActive: isActive ?? true,
              updatedAt: FieldValue.serverTimestamp(),
              nextRun: calculateNextRunTime(frequency, deliveryTime)
            });
            
            functions.logger.info("Updated existing scheduled search", { 
              userId, 
              searchId: searchRef.id,
              frequency,
              deliveryTime
            });
          } else {
            // Create new document with the deterministic ID
            await searchRef.set({
              searchParams,
              limit: limit || 100,
              frequency,
              deliveryTime, // Store the delivery time
              isActive: isActive ?? true,
              createdAt: FieldValue.serverTimestamp(),
              lastRun: null,
              nextRun: calculateNextRunTime(frequency, deliveryTime),
              // Add a processingStatus field to prevent duplicate runs
              processingStatus: 'online'
            });
            
            functions.logger.info("Created new scheduled search", { 
              userId, 
              searchId: searchRef.id,
              frequency,
              deliveryTime
            });
          }
          
          // If the user doesn't want to run the search immediately, return success
          if (schedule.runImmediately === false) {
            return res.json({
              status: 'success',
              message: 'Scheduled search saved successfully',
              searchId: searchId
            });
          }
          // Otherwise, continue with executing the search
        } catch (error) {
          functions.logger.error("Error saving scheduled search", { 
            errorMessage: error.message,
            errorStack: error.stack,
            userId: userId,
            searchParams: JSON.stringify(searchParams)
          });
          return res.status(500).json({
            error: "Failed to save scheduled search",
            details: error.message
          });
        }
      }

      const apiKey = process.env.BRIGHTDATA_API_TOKEN;
      const webhookSecret = process.env.WEBHOOK_SECRET;

      if (!apiKey || !webhookSecret) {
        functions.logger.error("Missing required secrets");
        return res.status(500).json({ error: "API configuration error" });
      }

      // Get first search param
      const search = searchParams[0];
      
      const requestData = {
        keyword: `"${search.keyword}"`,
        location: search.location,
        country: search.country,
        time_range: search.time_range,
        job_type: search.job_type || undefined,
        experience_level: search.experience_level || undefined,
        remote: search.remote && search.remote !== "" ? search.remote : undefined,
        company: search.company && search.company !== "" ? search.company : undefined,
      };

      console.log("DETAILED_DEBUG - Search origin:", 
        schedule ? "SCHEDULED" : "MANUAL", 
        "Full request data:", JSON.stringify({
          userId,
          searchParams,
          requestData, // The cleaned data for BrightData
          limit,
          deliveryTime: schedule?.deliveryTime
        }, null, 2)
      );
      
      // Remove empty fields
      Object.keys(requestData).forEach(key => 
        requestData[key] === undefined && delete requestData[key]
      );
      console.log("Full request to BrightData:", JSON.stringify(requestData));

      const webhookUrl = `${CONFIG.WEBHOOK_BASE_URL}?userId=${encodeURIComponent(userId)}`;

      const url = new URL(CONFIG.BASE_URL);
      url.searchParams.append('dataset_id', CONFIG.BRIGHTDATA_DATASET_ID);
      url.searchParams.append('include_errors', 'true');
      url.searchParams.append('type', 'discover_new');
      url.searchParams.append('discover_by', 'keyword');
      url.searchParams.append('format', 'json');
      url.searchParams.append('uncompressed_webhook', 'true');

      // Set webhook and notify URLs
      url.searchParams.append('webhook', webhookUrl);
      url.searchParams.append('notify', webhookUrl);

      // Set auth headers for both webhook and notify
      url.searchParams.append('webhook_headers.Authorization', `Bearer ${webhookSecret}`);
      url.searchParams.append('notify_headers.Authorization', `Bearer ${webhookSecret}`);

      const enforced_limit = Math.min(limit || 101, 101);
      url.searchParams.append('limit_per_input', enforced_limit.toString());

      // Add the detailed logging
      console.log("Final Brightdata URL:", url.toString());
      console.log("Request headers:", {
        'Authorization': 'Bearer ' + apiKey.substring(0,5) + '...',
        'Content-Type': 'application/json'
      });
      console.log("Raw request data:", requestData);
      console.log("Stringified request data:", JSON.stringify(requestData));
      console.log("Quoted keyword:", requestData.keyword);

      const response = await axios({
        method: 'post',
        url: url.toString(),
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: requestData
      });

      functions.logger.info("Brightdata API Response:", {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        timeMs: Date.now() - startTime,
        webhookUrl: webhookUrl.replace(webhookSecret, '****')
      });

      // If this was a scheduled search, update the document (only update, not set status - leave that to the scheduler)
      if (schedule) {
        try {
          // Use the searchId we determined earlier
          const docRef = db.collection('users')
            .doc(userId)
            .collection('searchQueries')
            .doc(searchId);
          
          // Only update search result, not status or processing fields
          await docRef.update({
            lastRunResult: response.data
          });
        } catch (updateError) {
          functions.logger.error("Failed to update scheduled search result", { 
            error: updateError.message, 
            userId, 
            searchId 
          });
          // Don't fail the whole function for this update error
        }
      }

      return res.json({
        status: 'success',
        response: response.data,
        stats: {
          timeMs: Date.now() - startTime
        }
      });

    } catch (error) {
      functions.logger.error("Error in searchJobsLinkedIn:", {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        timeMs: Date.now() - startTime
      });

      return res.status(500).json({ 
        error: "Internal server error",
        details: error.response?.data || error.message
      });
    }
  });
});