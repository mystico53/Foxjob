const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub();
const { logger } = require('firebase-functions');
const { collection, query, where, orderBy, limit, getDocs } = require('firebase-admin/firestore');

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = getFirestore();
const secretManager = new SecretManagerServiceClient();

// Helper functions
const safeGet = (obj, key) => {
  const value = obj?.[key];
  if (value === undefined || value === '') return null;
  if (typeof value === 'string') return value.trim() || null;
  return value;
};

const safeGetArray = (value) => {
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return null;
  return value;
};

const cleanHtml = (text) => {
  if (!text) return null;
  const cleaned = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

const transformSalary = (baseSalary, payRange) => {
  const salary = { base: null, range: null };

  if (baseSalary) {
    salary.base = {
      minAmount: safeGet(baseSalary, 'min_amount'),
      maxAmount: safeGet(baseSalary, 'max_amount'),
      currency: safeGet(baseSalary, 'currency'),
      paymentPeriod: safeGet(baseSalary, 'payment_period')
    };
  }

  if (payRange) {
    salary.range = payRange;
  }

  return salary;
};

const transformJobData = (job) => {
  const jobId = job?.job_posting_id || `generated_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  return {
    processing: { status: 'raw' },
    basicInfo: {
      jobId,
      title: safeGet(job, 'job_title'),
      company: safeGet(job, 'company_name'),
      companyId: safeGet(job, 'company_id'),
      location: safeGet(job, 'job_location'),
      url: safeGet(job, 'url'),
      applyLink: safeGet(job, 'apply_link'),
      companyLogo: safeGet(job, 'company_logo'),
      companyUrl: safeGet(job, 'company_url'),
      applicationAvailable: Boolean(job.application_availability),
      poster: job.job_poster ? {
        name: safeGet(job.job_poster, 'name'),
        title: safeGet(job.job_poster, 'title'),
        url: safeGet(job.job_poster, 'url')
      } : null
    },
    details: {
      summary: cleanHtml(job.job_summary),
      description: safeGet(job, 'job_description_formatted'),
      employmentType: safeGet(job, 'job_employment_type'),
      seniorityLevel: safeGet(job, 'job_seniority_level'),
      jobFunction: safeGet(job, 'job_function'),
      industries: safeGetArray(job.job_industries),
      postedDate: safeGet(job, 'job_posted_date'),
      postedTimeAgo: safeGet(job, 'job_posted_time'),
      numApplicants: job.job_num_applicants || 0,
      salary: transformSalary(job.base_salary, job.job_base_pay_range)
    },
    searchMetadata: {
      discoveryInput: job.discovery_input || null,
      countryCode: safeGet(job, 'country_code'),
      titleId: safeGet(job, 'title_id'),
      timestamp: FieldValue.serverTimestamp(),
      snapshotDate: new Date().toISOString(),
      processingDate: new Date().toISOString()
    }
  };
};

async function downloadSnapshot(snapshotId, authToken) {
  try {
    const response = await axios.get(
      `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` },
        params: { format: 'json' }
      }
    );
    return response.data;
  } catch (error) {
    logger.error('Error downloading snapshot:', error);
    throw new Error(`Failed to download snapshot: ${error.message}`);
  }
}

// Exponential backoff retry utility
const retryOperation = async (operation, options = {}) => {
  const { 
    maxRetries = 3, 
    initialDelay = 300, 
    maxDelay = 3000, 
    factor = 2,
    operationName = 'operation'
  } = options;
  
  let lastError;
  let delay = initialDelay;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt <= maxRetries) {
        // Apply jitter to avoid thundering herd
        const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15
        const backoffDelay = Math.min(delay * jitter, maxDelay);
        
        logger.warn(`${operationName} failed (attempt ${attempt}/${maxRetries + 1}), retrying in ${Math.round(backoffDelay)}ms`, { 
          errorCode: error.code,
          errorMessage: error.message?.substring(0, 150),
          attempt
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        
        // Exponential backoff
        delay = delay * factor;
      } else {
        // Final failure, log details
        logger.error(`${operationName} failed after ${maxRetries + 1} attempts`, {
          errorCode: error.code,
          errorMessage: error.message,
          stack: error.stack?.substring(0, 500)
        });
        throw error;
      }
    }
  }
};

async function processJobsAndPublish(jobs, userId, batchId) {
  const topic = pubsub.topic('job-embedding-requests');
  const batch = db.batch();
  const results = { successful: [], failed: [], processed: 0 };
  
  // Process all jobs for Firestore batch
  for (const job of jobs) {
    try {
      const transformedJob = transformJobData(job);
      const jobId = transformedJob.basicInfo.jobId;
      
      // Add batchId to the job's processing metadata
      transformedJob.processing.batchId = batchId;
      
      // Add to batch
      const docRef = db.collection('users').doc(userId).collection('scrapedJobs').doc(jobId);
      batch.set(docRef, transformedJob, { merge: true });
      
      // Track for PubSub
      results.successful.push({
        jobId,
        title: job.job_title
      });
    } catch (error) {
      logger.error('Error transforming job:', error);
      results.failed.push({
        jobId: job?.job_posting_id || 'unknown',
        error: error.message
      });
    }
  }
  
  // Commit batch to Firestore with retry logic
  try {
    // Log batch size before committing
    logger.info('Committing batch to Firestore', { 
      batchSize: results.successful.length,
      userId,
      batchId: batchId || 'undefined' 
    });
    
    await retryOperation(
      () => batch.commit(), 
      { 
        operationName: 'Firestore batch commit',
        maxRetries: 3,
        initialDelay: 500
      }
    );
    
    results.processed = results.successful.length;
    
    // Publish messages to PubSub - now including batchId
    const pubsubPromises = results.successful.map(job => 
      topic.publishMessage({
        json: {
          firebaseUid: userId,
          jobId: job.jobId,
          batchId: batchId, // Include batchId in PubSub message
          timestamp: new Date().toISOString()
        },
        attributes: { source: 'handleBrightdataWebhook' }
      }).catch(error => {
        logger.error(`PubSub error for job ${job.jobId}:`, error);
        results.failed.push({
          jobId: job.jobId,
          error: `PubSub error: ${error.message}`
        });
        results.successful = results.successful.filter(j => j.jobId !== job.jobId);
      })
    );
    
    await Promise.all(pubsubPromises);
    return results;
  } catch (error) {
    logger.error('Batch commit error after retries:', error);
    throw error;
  }
}

// Main webhook handler
exports.handleBrightdataWebhook = onRequest({
  timeoutSeconds: 540,
  memory: '1GiB',
  region: 'us-central1',
  secrets: ["BRIGHTDATA_API_TOKEN", "WEBHOOK_SECRET"]
}, async (req, res) => {
  try {
    const userId = req.query.userId || 'test_user';
    const searchId = req.query.searchId;
    logger.info('Webhook received', { bodyType: typeof req.body, isArray: Array.isArray(req.body) });
    
    // Case 1: Status update from Brightdata
    if (req.body?.snapshot_id && req.body?.status === "ready") {
      logger.info('Processing snapshot ready status', { snapshotId: req.body.snapshot_id });
      
      // Create batch tracking document
      const batchId = req.body.snapshot_id;
      const batchRef = db.collection('jobBatches').doc(batchId);
      
      try {
        // Get Brightdata token and download snapshot
        const [secretVersion] = await secretManager.accessSecretVersion({
          name: 'projects/656035288386/secrets/BRIGHTDATA_API_TOKEN/versions/latest'
        });
        const brightdataToken = secretVersion.payload.data.toString();
        const snapshotData = await downloadSnapshot(req.body.snapshot_id, brightdataToken);
        logger.info('Snapshot download details', { 
          snapshotId: req.body.snapshot_id, 
          rawDataType: typeof snapshotData, 
          rawDataLength: snapshotData?.length || 'N/A', 
          isArray: Array.isArray(snapshotData), 
          firstItem: snapshotData?.[0] ? { 
            hasJobId: Boolean(snapshotData[0].job_posting_id), 
            jobId: snapshotData[0].job_posting_id, 
            title: snapshotData[0].job_title 
          } : 'N/A',
          // Let's also check if the data is wrapped in another object
          dataKeys: typeof snapshotData === 'object' ? Object.keys(snapshotData) : 'N/A',
          // And check the raw structure
          dataStructure: JSON.stringify(snapshotData).substring(0, 500) + '...'
        });
        
        // Process jobs from snapshot
        const jobs = Array.isArray(snapshotData) ? snapshotData : [snapshotData];
        
        // Check if jobs array is empty
        if (!jobs || jobs.length === 0) {
          logger.info('No jobs found in search, sending email notification', { userId, searchId });
          
          // Create batch document for empty search
          await batchRef.set({
            userId,
            snapshotId: batchId,
            searchId: searchId,
            totalJobs: 0,
            completedJobs: 0,
            status: 'empty',
            startedAt: FieldValue.serverTimestamp(),
            completedAt: FieldValue.serverTimestamp(),
            emailSent: false,
            noJobsFound: true,
            jobIds: []
          });
          
          // Send email notification through the Firestore trigger pattern
          await sendEmptySearchEmailNotification(userId, searchId);
          
          // Update batch to indicate email was sent
          await batchRef.update({
            emailSent: true,
            emailSentAt: FieldValue.serverTimestamp()
          });
          
          return res.json({
            success: true,
            message: 'No jobs found for search criteria. Email notification sent.',
            snapshot_id: req.body.snapshot_id,
            batchId,
            userId,
            timestamp: new Date().toISOString()
          });
        }
        
        // Initialize batch document before processing
        await batchRef.set({
          userId,
          snapshotId: batchId,
          searchId: searchId,
          totalJobs: jobs.length,
          completedJobs: 0,
          status: 'processing',
          startedAt: FieldValue.serverTimestamp(),
          emailSent: false,
          smallBatch: jobs.length === 1,
          jobIds: []
        });
        
        // Pass batchId to processing function
        const results = await processJobsAndPublish(jobs, userId, batchId);
        
        // Update batch with job IDs after processing
        await batchRef.update({
          jobIds: results.successful.map(job => job.jobId)
        });
        
        logger.info('Batch document created', { 
          batchId, 
          totalJobs: jobs.length,
          successful: results.successful.length
        });
        
        // If no jobs found, mark batch as complete and email sent
        if (jobs.length === 0) {
          logger.info('No jobs found for batch, marking as complete', { batchId });
          
          // Create email request first
          const emailRequestRef = await db.collection('emailRequests').add({
            batchId,
            userId: userId,
            status: 'skipped',
            reason: 'No jobs found above threshold',
            createdAt: FieldValue.serverTimestamp()
          });
          
          // Then update batch with email request ID
          await batchRef.update({
            status: 'complete',
            emailSent: true,
            emailRequestId: emailRequestRef.id,
            completedAt: FieldValue.serverTimestamp()
          });
          
          return res.json({
            success: true,
            message: 'No jobs found for batch, marking as complete',
            snapshot_id: req.body.snapshot_id,
            batchId,
            userId,
            timestamp: new Date().toISOString()
          });
        }
        
        return res.json({
          success: true,
          message: 'Snapshot processed successfully',
          snapshot_id: req.body.snapshot_id,
          processed: {
            total: jobs.length,
            successful: results.successful.length,
            failed: results.failed.length,
            jobs: results.successful,
            errors: results.failed
          },
          batchId: batchId, // Include batchId in response
          userId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        // Check if the error is due to empty snapshot
        if (error.message && (error.message.includes('Failed to download snapshot') || 
                             (error.response && error.response.data === 'Snapshot is empty'))) {
          logger.info('Snapshot is empty, sending email notification', { userId, searchId });
          
          // Create batch document for empty search
          await batchRef.set({
            userId,
            snapshotId: batchId,
            searchId: searchId,
            totalJobs: 0,
            completedJobs: 0,
            status: 'empty',
            startedAt: FieldValue.serverTimestamp(),
            completedAt: FieldValue.serverTimestamp(),
            emailSent: false,
            noJobsFound: true,
            jobIds: []
          });
          
          // Send email notification through the Firestore trigger pattern
          await sendEmptySearchEmailNotification(userId, searchId);
          
          // Update batch to indicate email was sent
          await batchRef.update({
            emailSent: true,
            emailSentAt: FieldValue.serverTimestamp()
          });
          
          return res.json({
            success: true,
            message: 'No jobs found for search criteria. Email notification sent.',
            snapshot_id: req.body.snapshot_id,
            batchId,
            userId,
            timestamp: new Date().toISOString()
          });
        }
        
        // If it's not an empty snapshot, rethrow the error
        throw error;
      }
    }
    
    // Case 2: Direct job data webhook - verify auth token
    const [webhookSecretVersion] = await secretManager.accessSecretVersion({
      name: 'projects/656035288386/secrets/WEBHOOK_SECRET/versions/latest'
    });
    const webhookSecret = webhookSecretVersion.payload.data.toString();
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    const receivedToken = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : authHeader;
    if (receivedToken !== webhookSecret) {
      logger.warn('Invalid authorization token');
      throw new Error('Invalid authorization');
    }
    
    // Process jobs from webhook body
    const jobs = Array.isArray(req.body) ? req.body : [req.body];
    // Create a batchId for direct webhook case
    const directBatchId = `direct_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const results = await processJobsAndPublish(jobs, userId, directBatchId);
    
    return res.json({
      success: true,
      processed: {
        total: jobs.length,
        successful: results.successful.length,
        failed: results.failed.length,
        jobs: results.successful,
        errors: results.failed
      },
      userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Function to send an email notification for empty searches
// This follows the pattern used in batchProcessing.js
async function sendEmptySearchEmailNotification(userId, searchId) {
  try {
    logger.info('Preparing to send empty search notification', { userId, searchId });
    
    // Get user information
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      logger.error('User not found for empty search notification', { userId });
      return false;
    }
    
    const userData = userDoc.data();
    const userEmail = userData.email;
    
    // Get search query details
    const searchQueryRef = db.collection('users').doc(userId).collection('searchQueries').doc(searchId);
    const searchQueryDoc = await searchQueryRef.get();
    
    if (!searchQueryDoc.exists) {
      logger.error('Search query not found for empty search notification', { searchId });
      return false;
    }
    
    const searchParams = searchQueryDoc.data();
    const searchTerms = searchParams.searchParams[0] || {};
    
    // Get the latest batch for this search
    const batchesQuery = db.collection('jobBatches')
      .where('searchId', '==', searchId)
      .where('userId', '==', userId)
      .orderBy('startedAt', 'desc')
      .limit(1);
    
    const batchesSnapshot = await batchesQuery.get();
    let batchId = null;
    
    if (!batchesSnapshot.empty) {
      const latestBatch = batchesSnapshot.docs[0];
      batchId = latestBatch.id;
      logger.info('Found latest batch for empty search notification', { batchId });
    } else {
      logger.warn('No batch found for empty search notification', { searchId });
    }
    
    // Determine the proper search URL based on environment
    const config = require('../config');
    let searchPageUrl;
    
    if (config.environment === 'production') {
      searchPageUrl = 'https://www.foxjob.io/list';
      logger.info('Using production search URL');
    } else if (config.environment === 'staging') {
      searchPageUrl = 'https://jobille-45494.web.app/list';
      logger.info('Using staging search URL');
    } else {
      // Default for development
      searchPageUrl = 'http://localhost:5000/list';
      logger.info('Using development search URL');
    }
    
    // Create email content
    const htmlContent = `
      <h2>No Jobs Found For Your Search</h2>
      <p>We couldn't find any jobs matching your search criteria. Here are a few suggestions:</p>
      <ul>
        <li>Try broadening your search terms</li>
        <li>Consider different locations or remote options</li>
        <li>Remove some filters like experience level or job type</li>
        <li>Try using more general keywords</li>
        ${!searchTerms.includeSimilarRoles ? '<li><strong>Try enabling "Fuzzy Match" in Advanced Options</strong> for broader job title matching</li>' : ''}
      </ul>
      <h3>Your Search Details:</h3>
      <p><strong>Keywords:</strong> ${searchTerms.keyword || 'N/A'}</p>
      <p><strong>Location:</strong> ${searchTerms.location || 'N/A'}</p>
      <p><strong>Country:</strong> ${searchTerms.country || 'N/A'}</p>
      ${searchTerms.remote ? `<p><strong>Remote Option:</strong> ${searchTerms.remote}</p>` : ''}
      ${searchTerms.experience_level ? `<p><strong>Experience Level:</strong> ${searchTerms.experience_level}</p>` : ''}
      ${searchTerms.job_type ? `<p><strong>Job Type:</strong> ${searchTerms.job_type}</p>` : ''}
      ${searchTerms.time_range ? `<p><strong>Posted Within:</strong> ${searchTerms.time_range}</p>` : ''}
      <p><strong>Fuzzy Match:</strong> ${searchTerms.includeSimilarRoles ? 'Enabled' : 'Disabled'}</p>
      <p>You can <a href="${searchPageUrl}">modify your search</a> and try again.</p>
    `;
    
    const textContent = `
      No Jobs Found For Your Search
      
      We couldn't find any jobs matching your search criteria. Here are a few suggestions:
      
      - Try broadening your search terms
      - Consider different locations or remote options
      - Remove some filters like experience level or job type
      - Try using more general keywords
      ${!searchTerms.includeSimilarRoles ? '- Try adding additional job titles for a broader job title matching' : ''}
      
      Your Search Details:
      Keywords: ${searchTerms.keyword || 'N/A'}
      Location: ${searchTerms.location || 'N/A'}
      Country: ${searchTerms.country || 'N/A'}
      ${searchTerms.remote ? `Remote Option: ${searchTerms.remote}` : ''}
      ${searchTerms.experience_level ? `Experience Level: ${searchTerms.experience_level}` : ''}
      ${searchTerms.job_type ? `Job Type: ${searchTerms.job_type}` : ''}
      ${searchTerms.time_range ? `Posted Within: ${searchTerms.time_range}` : ''}
      Fuzzy Match: ${searchTerms.includeSimilarRoles ? 'Enabled' : 'Disabled'}
      
      You can modify your search and try again at: ${searchPageUrl}
    `;
    
    // Create an email request document in Firestore to trigger the email processor
    const emailRequestRef = db.collection('emailRequests').doc();
    await emailRequestRef.set({
      userId: userId,
      to: userEmail,
      searchId: searchId,
      subject: 'No Jobs Found - Try Broadening Your Search',
      text: textContent,
      html: htmlContent,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      batchId: batchId,
      metadata: {
        type: 'empty_search_notification',
        searchId: searchId,
        searchParams: searchParams,
        batchId: batchId
      }
    });
    
    // If we found a batch, update it with the email request ID
    if (batchId) {
      const batchRef = db.collection('jobBatches').doc(batchId);
      await batchRef.update({
        emailRequestId: emailRequestRef.id,
        emailSent: true,
        emailSentAt: FieldValue.serverTimestamp()
      });
    }
    
    logger.info('Empty search email request created', { 
      userId, 
      requestId: emailRequestRef.id,
      batchId: batchId || 'No batch found',
      recipientEmail: userEmail || 'NULL - fallback will be used'
    });
    
    return true;
  } catch (error) {
    logger.error('Error sending empty search notification:', error);
    return false;
  }
}