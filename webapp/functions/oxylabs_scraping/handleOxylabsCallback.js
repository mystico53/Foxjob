const { onRequest } = require('firebase-functions/v2/https');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const { FieldValue } = require("firebase-admin/firestore");
const { JobQueueService, ActiveJobsService } = require('./jobQueueService'); 
const OxylabsService = require('./OxylabsService');
console.log('OxylabsService loaded:', {
  hasService: !!OxylabsService,
  methods: Object.keys(OxylabsService)
});

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Config
const CONFIG = {
  OXY_USERNAME: "mystico_FXPQA",
  OXY_PASSWORD: "ti_QMg2h2WzZMp",
  BASE_URL: 'https://data.oxylabs.io/v1/queries',
  // Add webhook.site URL for testing callbacks
  CALLBACK_URL: 'https://7f88-71-146-184-34.ngrok-free.app/jobille-45494/us-central1/handleOxylabsCallback'
};

// HTML Analyzer for cleaning content
const HtmlAnalyzer = {
  extractCleanContent: (content) => {
    if (!content) return "No description available.";
    if (Array.isArray(content)) {
      return content
        .map(item => (typeof item === 'string' ? item.replace(/<[^>]*>/g, '').trim() : item))
        .filter(Boolean);
    }
    return content.replace(/<[^>]*>/g, '').trim();
  }
};

// Helper function for Firestore
const sanitizeForFirestore = (obj) => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeForFirestore(v)])
    );
  }
  return obj;
};

async function cleanupStaleJobs() {
  const staleTimeout = 30 * 60 * 1000; // 30 minutes
  const staleTimestamp = new Date(Date.now() - staleTimeout);

  try {
    const staleJobs = await JobQueueService.queueRef
      .where('status', '==', 'processing')
      .where('processingStartedAt', '<=', staleTimestamp)
      .get();

    if (staleJobs.empty) return;

    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(ActiveJobsService.counterRef);
      const currentCount = counterDoc.exists ? counterDoc.data().count : 0;
      
      let decrementBy = 0;
      
      staleJobs.forEach(doc => {
        transaction.update(JobQueueService.queueRef.doc(doc.id), {
          status: 'error',
          lastError: 'Job timed out',
          retryCount: FieldValue.increment(1),
          lastAttempt: FieldValue.serverTimestamp()
        });
        decrementBy++;
      });

      const newCount = Math.max(0, currentCount - decrementBy);
      transaction.update(ActiveJobsService.counterRef, { count: newCount });
    });
  } catch (error) {
    functions.logger.error('Failed to cleanup stale jobs:', error);
  }
}

// Firestore Service
const FirestoreService = {
  saveJobToUserCollection: async (userId, jobDetail, jobId = null) => {
    const documentId = jobId || jobDetail?.basicInfo?.job_id;

    if (!userId || !documentId) {
      throw new Error(`Invalid document path parameters. userId: ${userId}, jobId: ${documentId}`);
    }

    const docRef = db.collection('users')
                .doc(userId)
                .collection('scrapedcallback')  // Using scrapedcallback collection
                .doc(documentId);
    
    try {
      functions.logger.info("Saving job to Firestore:", {
        userId,
        jobId: documentId,
        hasDetails: !!jobDetail.details
      });

      const cleanedDetails = sanitizeForFirestore({
        ...jobDetail,
        lastUpdated: FieldValue.serverTimestamp()
      });

      // Check if document exists first
      const doc = await docRef.get();
      if (!doc.exists) {
        await docRef.set({
          ...cleanedDetails,
          createdAt: FieldValue.serverTimestamp()
        });
      } else {
        await docRef.update(cleanedDetails);
      }

      return true;
    } catch (error) {
      functions.logger.error("Error saving job to Firestore:", {
        userId,
        jobId: documentId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
};

// Main webhook handler
const handleOxylabsCallback = onRequest({
  timeoutSeconds: 540,
  memory: "1GiB"
}, async (req, res) => {
  try {    
    await ActiveJobsService.ensureCounterExists();
    const isSearchJob = req.body.url?.includes('/jobs?') || 
                      (req.body.parsing_instructions && 'job_listings' in req.body.parsing_instructions);
    const callbackType = isSearchJob ? 'search' : 'job_detail';

    functions.logger.info("Detected callback type:", { 
      callbackType,
      url: req.body.url,
      status: req.body.status,
      hasJobListingsInstructions: 'job_listings' in (req.body.parsing_instructions || {})
    });

    // Handle faulted search jobs
    if (callbackType === 'search' && req.body.status === 'faulted') {
      functions.logger.warn("Search job faulted, initiating retry:", {
        jobId: req.body.id,
        url: req.body.url
      });

      await ActiveJobsService.removeActiveJob(req.body.id);

      try {
        const retryPayload = {
          source: "universal",
          url: req.body.url,
          render: "html",
          parse: true,
          callback_url: CONFIG.CALLBACK_URL,
          parsing_instructions: req.body.parsing_instructions
        };

        const response = await axios.post(
          CONFIG.BASE_URL,
          retryPayload,
          { headers: OxylabsService.getAuthHeader() }
        );

        await ActiveJobsService.addActiveJob(response.data.id, 'search', {
          isRetry: true,
          originalJobId: req.body.id
        });

        functions.logger.info("Search retry job submitted successfully:", {
          originalJobId: req.body.id,
          newJobId: response.data.id,
          url: req.body.url
        });

        return res.status(200).json({
          success: true,
          status: 'retrying',
          type: 'search',
          originalJobId: req.body.id,
          newJobId: response.data.id
        });
      } catch (error) {
        functions.logger.error("Failed to submit search retry:", {
          originalJobId: req.body.id,
          error: error.message
        });
        return res.status(200).json({
          success: false,
          error: 'Failed to submit search retry',
          details: error.message
        });
      }
    }

    // Process search jobs
    if (callbackType === 'search' && req.body.status === 'done') {
      try {
        let jobListings = req.body.results?.[0]?.content?.job_listings;
    
        // If no results in callback, fetch them using the query ID
        if (!jobListings || jobListings.length === 0) {
          functions.logger.info("No results in callback, fetching from API:", { 
            queryId: req.body.id 
          });
    
          try {
            const queryResults = await OxylabsService.fetchQueryResults(req.body.id);
            jobListings = queryResults.results?.[0]?.content?.job_listings || [];
            
            functions.logger.info("Retrieved results from API:", { 
              queryId: req.body.id,
              jobCount: jobListings.length
            });
          } catch (error) {
            functions.logger.error("Failed to fetch results from API:", {
              queryId: req.body.id,
              error: error.message
            });
            throw error;
          }
        }
    
        // Process job listings
        for (const job of jobListings) {
          try {
            const cleanedDetails = sanitizeForFirestore({
              basicInfo: {
                job_id: job.job_id,
                job_title: job.job_title,
                company_name: job.company_name,
                job_link: job.job_link
              },
              details: null,
              status: 'pending_details',
              queryId: req.body.id
            });
    
            // Save basic job info
            await FirestoreService.saveJobToUserCollection('test_user', cleanedDetails);
            
            // Add to queue instead of immediate processing
            await JobQueueService.addToQueue(job.job_id, {
              searchQueryId: req.body.id,
              jobTitle: job.job_title
            });
          } catch (error) {
            functions.logger.error("Failed to process individual job:", {
              jobId: job.job_id,
              error: error.message
            });
          }
        }

        await JobQueueService.processQueue();
    
        const result = await ActiveJobsService.removeActiveJob(req.body.id);
        if (result.success && result.originalJobId) {
          await JobQueueService.deleteQueueJob(result.originalJobId);
        }
    
        return res.status(200).json({
          success: true,
          type: 'search',
          jobsProcessed: jobListings.length,
          queryId: req.body.id
        });
    
      } catch (error) {
        functions.logger.error("Failed to process search results:", {
          queryId: req.body.id,
          error: error.message
        });
        return res.status(200).json({
          success: false,
          error: 'Failed to process search results',
          details: error.message
        });
      }
    }
    // Process job detail callbacks
    // Process job detail callbacks
    else if (callbackType === 'job_detail') {
      // Extract job ID from URL FIRST, before any other processing
      const jobId = (() => {
        const match = req.body.url.match(/jk=([^&]+)/);
        return match ? match[1] : null;
      })();
    
      if (!jobId) {
        functions.logger.error('Could not determine job ID from URL:', { url: req.body.url });
        return res.status(200).json({ success: false, error: "Could not determine job ID" });
      }
    
      functions.logger.info('Processing job detail:', {
        jobId: req.body.id,
        url: req.body.url,
        resultsPresent: !!req.body.results,
      });
    
      // Handle faulted status immediately after jobId extraction
      if (req.body.status === 'faulted') {
        functions.logger.warn("Job detail faulted, requeueing:", {
          jobId,
          url: req.body.url
        });
        
        await JobQueueService.requeueJob(jobId, 'Faulted response from Oxylabs');
        return res.status(200).json({
          success: false,
          error: 'Job faulted, requeued'
        });
      }
    
      const result = await ActiveJobsService.removeActiveJob(req.body.id);
      if (result.success && result.originalJobId) {
        await JobQueueService.deleteQueueJob(result.originalJobId);
      }
    
      let jobResult = req.body.results?.[0];

  if (!jobId) {
    functions.logger.error('Could not determine job ID from URL:', { url: req.body.url });
    return res.status(200).json({ success: false, error: "Could not determine job ID" });
  }

  // If no results in callback, fetch them
  if (!jobResult?.content) {
    try {
      const queryResults = await OxylabsService.fetchQueryResults(req.body.id);
      jobResult = queryResults.results?.[0];
      
      functions.logger.debug("Job details from API:", {
        jobId,
        hasContent: !!jobResult?.content,
        contentKeys: jobResult?.content ? Object.keys(jobResult.content) : []
      });
    } catch (error) {
      functions.logger.error("Failed to fetch job details:", {
        jobId,
        error: error.message
      });
      
      // If failure, add back to queue with increased retry count
      await JobQueueService.addToQueue(jobId, {
        retryCount: FieldValue.increment(1),
        lastError: error.message,
        lastAttempt: FieldValue.serverTimestamp()
      });
      
      return res.status(200).json({
        success: false,
        error: error.message
      });
    }
  }

  const content = jobResult?.content;
  if (!content || (!content?.jobTitle?.[0] && !content?.description?.[0])) {
    functions.logger.warn("Insufficient job details received:", {
      jobId,
      content: !!content
    });
    
    // Requeue instead of saving empty details
    await JobQueueService.requeueJob(jobId, 'Insufficient job details received');
    return res.status(200).json({
      success: false,
      error: 'Insufficient details'
    });
  }

  // Process and save job details
  try {
    const content = jobResult?.content;
    
    functions.logger.debug("Processing content:", {
      jobId,
      hasTitle: !!content?.jobTitle?.[0],
      hasDescription: !!content?.description?.[0],
      hasLocation: !!content?.location?.[0]
    });

    // First get the existing document
    const docRef = db.collection('users')
                    .doc('test_user')
                    .collection('scrapedcallback')
                    .doc(jobId);
    const existingDoc = await docRef.get();
    const existingData = existingDoc.data();

    const cleanedDetails = sanitizeForFirestore({
      // Preserve existing basicInfo and add/update new fields
      basicInfo: {
        ...existingData?.basicInfo,
        job_id: jobId,
        job_link: req.body.url
      },
      // Preserve existing details and add/update new fields
      details: {
        ...existingData?.details,
        // Only update these fields if they contain new data
        ...(content?.jobTitle?.[0] ? { title: HtmlAnalyzer.extractCleanContent(content.jobTitle[0]) } : {}),
        ...(content?.location?.[0] ? { location: HtmlAnalyzer.extractCleanContent(content.location[0]) } : {}),
        ...(content?.description?.[0] ? { description: HtmlAnalyzer.extractCleanContent(content.description[0]) } : {}),
        ...(content?.postingDate?.[0] ? { postingDate: content.postingDate[0] } : {}),
        ...(content?.parse_status_code ? { parseStatusCode: content.parse_status_code } : {})
      },
      status: 'complete',
      lastUpdated: FieldValue.serverTimestamp()
    });

    functions.logger.info("Saving job details:", {
      jobId,
      hasTitle: !!cleanedDetails.details.title,
      hasDescription: !!cleanedDetails.details.description,
      contentLength: cleanedDetails.details.description?.length || 0,
      preservedCompanyName: !!existingData?.basicInfo?.company_name,
      preservedJobTitle: !!existingData?.basicInfo?.job_title
    });

    await FirestoreService.saveJobToUserCollection('test_user', cleanedDetails, jobId);
    
    return res.status(200).json({
      success: true,
      jobId,
      message: 'Job details processed and saved'
    });

  } catch (error) {
    functions.logger.error("Failed to process job details:", {
      jobId,
      error: error.message,
      stack: error.stack
    });

    // Add back to queue on processing failure
    await JobQueueService.addToQueue(jobId, {
      retryCount: FieldValue.increment(1),
      lastError: error.message,
      lastAttempt: FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
}

    return res.status(200).json({
      received: true,
      type: callbackType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    functions.logger.error('Webhook handler error:', {
      error: error.message,
      stack: error.stack
    });

    return res.status(200).json({
      received: false,
      error: error.message
    });
  }
});

module.exports = {
  handleOxylabsCallback,
  OxylabsService,
  FirestoreService,
  HtmlAnalyzer
};