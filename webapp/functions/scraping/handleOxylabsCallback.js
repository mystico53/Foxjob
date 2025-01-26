const { onRequest } = require('firebase-functions/v2/https');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const { FieldValue } = require("firebase-admin/firestore");

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
  MAX_RETRIES: 3,
  // Add webhook.site URL for testing callbacks
  CALLBACK_URL: 'https://e02f-71-146-184-34.ngrok-free.app/jobille-45494/us-central1/handleOxylabsCallback'
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

const JobQueueService = {
  // Collection reference
  queueRef: db.collection('jobQueue'),

  async addToQueue(jobId, metadata = {}) {
    try {
      await this.queueRef.add({
        jobId,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        priority: 1,
        retryCount: 0,
        ...metadata
      });
      return true;
    } catch (error) {
      functions.logger.error('Failed to add job to queue:', {
        jobId,
        error: error.message
      });
      return false;
    }
  },

  async processQueue() {
    try {
      // Get count of current active jobs
      const counterDoc = await ActiveJobsService.counterRef.get();
      const currentCount = counterDoc.exists ? counterDoc.data().count : 0;
      
      // Calculate how many jobs we can process (leave 1 slot for search)
      const availableSlots = 12 - currentCount;
      
      if (availableSlots <= 0) {
        return { processed: 0 };
      }

      // Get jobs from queue
      const queueSnapshot = await this.queueRef
        .where('status', '==', 'pending')
        .orderBy('createdAt')
        .limit(availableSlots)
        .get();

      let processedCount = 0;

      for (const doc of queueSnapshot.docs) {
        try {
          const jobData = doc.data();
          const result = await OxylabsService.submitNewJobRequest(jobData.jobId);
          
          if (result.success) {
            await this.queueRef.doc(doc.id).delete();
            processedCount++;
          } else {
            await this.queueRef.doc(doc.id).update({
              status: 'error',
              lastError: result.error,
              retryCount: FieldValue.increment(1),
              lastAttempt: FieldValue.serverTimestamp()
            });
          }
        } catch (error) {
          functions.logger.error('Failed to process queued job:', {
            jobId: doc.id,
            error: error.message
          });
        }
      }

      return { processed: processedCount };
    } catch (error) {
      functions.logger.error('Failed to process job queue:', error);
      return { processed: 0, error: error.message };
    }
  }
};

const ActiveJobsService = {
  // Collection references
  activeJobsRef: db.collection('activeJobs'),
  counterRef: db.collection('activeJobs').doc('counter'),

  // Initialize counter if it doesn't exist
  async initializeCounter() {
    const doc = await this.counterRef.get();
    if (!doc.exists) {
      await this.counterRef.set({ count: 0 });
    }
  },

  // Add a new active job with transaction
  async addActiveJob(oxylabsId, jobType, metadata = {}) {
    if (!oxylabsId) {
      throw new Error('oxylabsId is required');
    }

    try {
      return await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(this.counterRef);
        const currentCount = counterDoc.exists ? counterDoc.data().count : 0;

        // Reserve 1 slot for search jobs
        const maxJobs = jobType === 'search' ? 13 : 12;

        if (currentCount >= maxJobs) {
          throw new Error('Max concurrent jobs reached');
        }

        // Increment counter and add job
        transaction.set(this.counterRef, { count: currentCount + 1 }, { merge: true });
        transaction.set(this.activeJobsRef.doc(oxylabsId), {
          startedAt: FieldValue.serverTimestamp(),
          type: jobType,
          status: 'running',
          ...metadata,
          lastUpdated: FieldValue.serverTimestamp()
        });

        return { success: true, currentCount: currentCount + 1 };
      });
    } catch (error) {
      functions.logger.error('Failed to add active job:', {
        oxylabsId,
        jobType,
        error: error.message
      });
      throw error;
    }
  },

  async removeActiveJob(oxylabsId) {
    if (!oxylabsId) {
      throw new Error('oxylabsId is required');
    }

    try {
      return await db.runTransaction(async (transaction) => {
        const jobDoc = await transaction.get(this.activeJobsRef.doc(oxylabsId));
        
        if (!jobDoc.exists) {
          return { success: false, error: 'Job not found' };
        }

        transaction.delete(this.activeJobsRef.doc(oxylabsId));
        transaction.update(this.counterRef, {
          count: FieldValue.increment(-1)
        });

        return { success: true };
      });
    } catch (error) {
      functions.logger.error('Failed to remove active job:', {
        oxylabsId,
        error: error.message
      });
      throw error;
    }
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

// Oxylabs Service
const OxylabsService = {
  getAuthHeader: () => {
    const authStr = Buffer.from(`${CONFIG.OXY_USERNAME}:${CONFIG.OXY_PASSWORD}`).toString('base64');
    return {
      "Content-Type": "application/json",
      "Authorization": `Basic ${authStr}`
    };
  },

  createJobDetailsPayload: (jobId) => ({
    source: "universal",
    url: `https://www.indeed.com/viewjob?jk=${jobId}`,
    render: "html",
    parse: true,
    // Add callback URL to the payload
    callback_url: CONFIG.CALLBACK_URL,
    parsing_instructions: {
      jobTitle: {
        _fns: [{ _fn: "css", _args: ["[data-testid='jobsearch-JobInfoHeader-title']"] }]
      },
      location: {
        _fns: [{ _fn: "css", _args: ["[data-testid='job-location'], [data-testid='jobsearch-JobInfoHeader-companyLocation'], [data-testid='inlineHeader-companyLocation']"] }]
      },
      description: {
        _fns: [{ _fn: "css", _args: ["#jobDescriptionText.jobsearch-JobComponent-description"] }]
      },
      postingDate: {
        _fns: [{ _fn: "css", _args: ["[data-testid='job-posting-date']"] }]
      }
    }
  }),

  submitNewJobRequest: async (jobId) => {
    try {
      const payload = OxylabsService.createJobDetailsPayload(jobId);
      
      const response = await axios.post(
        CONFIG.BASE_URL,
        payload,
        { headers: OxylabsService.getAuthHeader() }
      );

      // Add to active jobs tracking
      await ActiveJobsService.addActiveJob(response.data.id, 'job_detail', {
        originalJobId: jobId
      });

      return {
        success: true,
        oxylabsId: response.data.id
      };
    } catch (error) {
      functions.logger.error("Failed to submit new job request:", {
        jobId,
        error: error.message
      });
      return {
        success: false,
        error: error.message
      };
    }
  },

  fetchQueryResults: async (queryId) => {
    try {
      functions.logger.info("Fetching results for query:", { queryId });
      
      const response = await axios.get(
        `${CONFIG.BASE_URL}/${queryId}/results`,
        { headers: OxylabsService.getAuthHeader() }
      );

      functions.logger.info("Retrieved results for query:", { 
        queryId,
        status: response.status,
        hasResults: Boolean(response.data?.results?.[0]?.content)
      });

      return response.data;
    } catch (error) {
      functions.logger.error("Failed to fetch query results:", {
        queryId,
        error: error.message
      });
      throw error;
    }
  }
};

// Firestore Service
const FirestoreService = {
  saveJobToUserCollection: async (userId, jobDetail, jobId = null) => {
    const documentId = jobId || jobDetail?.basicInfo?.job_id;

    if (!userId || !documentId) {
      throw new Error(`Invalid document path parameters. userId: ${userId}, jobId: ${documentId}`);
    }

    const docRef = db.collection('users')
                .doc(userId)
                .collection('scrapedcallback')
                .doc(documentId);
    
    const cleanedDetails = sanitizeForFirestore({
      ...jobDetail,
      lastUpdated: FieldValue.serverTimestamp()
    });

    const doc = await docRef.get();
    if (!doc.exists) {
      await docRef.set({
        ...cleanedDetails,
        createdAt: FieldValue.serverTimestamp(),
        retryCount: 0
      });
    } else {
      await docRef.update({
        ...cleanedDetails,
        retryCount: FieldValue.increment(1)
      });
    }

    return doc.exists;
  }
};

// Main webhook handler
exports.handleOxylabsCallback = onRequest({
  timeoutSeconds: 540,
  memory: "1GiB"
}, async (req, res) => {
  try {
    await ActiveJobsService.initializeCounter();
    functions.logger.info('Received webhook:', {
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString()
    });

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
    
        // Remove the search job only after processing all listings
        await ActiveJobsService.removeActiveJob(req.body.id);
    
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
    else if (callbackType === 'job_detail') {
      functions.logger.info('Processing job detail:', {
        jobId: req.body.id,
        url: req.body.url,
        resultsPresent: !!req.body.results,
        resultsCount: req.body.results?.length
      });
    
      await ActiveJobsService.removeActiveJob(req.body.id);
      const result = req.body.results?.[0];

      if (!result || !result.content) {
        functions.logger.info("No results in callback, fetching from API:", { 
          queryId: req.body.id 
        });
    
        try {
          const queryResults = await OxylabsService.fetchQueryResults(req.body.id);
          result = queryResults.results?.[0];
          
          functions.logger.info("Retrieved results from API:", { 
            queryId: req.body.id,
            hasResult: !!result,
            hasContent: !!result?.content
          });
        } catch (error) {
          functions.logger.error("Failed to fetch results from API:", {
            queryId: req.body.id,
            error: error.message
          });
          throw error;
        }
      }
      
      // Add debug log for result content
      functions.logger.info('Job detail result:', {
        hasResult: !!result,
        resultStatus: result?.status,
        hasUrl: !!result?.url,
        contentFields: result?.content ? Object.keys(result.content) : []
      });


      
      // Extract job ID from URL
      let jobId;
      if (result?.url) {
        const match = result.url.match(/jk=([^&]+)/);
        jobId = match ? match[1] : null;
      }
    
      if (!jobId) {
        functions.logger.error('Could not determine job ID from URL:', { url: result?.url });
        return res.status(200).json({ success: false, error: "Could not determine job ID" });
      }
    
      // Get the content from result
      const content = result?.content;
      functions.logger.info('Content details:', {
        jobId,
        hasTitle: !!content?.jobTitle,
        hasLocation: !!content?.location,
        hasDescription: !!content?.description
      });
    
      // Check if response was successful
      if (result?.status === 'faulted' || result?.status === 'failed') {
        // Get current retry count
        const docRef = db.collection('users')
                    .doc('test_user')
                    .collection('scrapedcallback')
                    .doc(jobId);
        
        const doc = await docRef.get();
        const retryCount = doc.exists ? (doc.data().retryCount || 0) : 0;
    
        if (retryCount >= CONFIG.MAX_RETRIES) {
          await FirestoreService.saveJobToUserCollection('test_user', {
            status: 'failed',
            error: 'Max retries exceeded',
            lastError: result.status
          }, jobId);
          return res.status(200).json({ success: false, error: 'Max retries exceeded' });
        }
    
        // Submit new job request to Oxylabs
        const newSubmission = await OxylabsService.submitNewJobRequest(jobId);
        
        if (!newSubmission.success) {
          await FirestoreService.saveJobToUserCollection('test_user', {
            status: 'failed',
            error: 'Failed to create new job request',
            lastError: newSubmission.error
          }, jobId);
          return res.status(200).json({ success: false, error: 'Retry submission failed' });
        }
    
        // Update document with retry status
        await FirestoreService.saveJobToUserCollection('test_user', {
          status: 'retrying',
          oxylabsId: newSubmission.oxylabsId,
          lastError: result.status
        }, jobId);
    
        return res.status(200).json({ success: true, status: 'retrying' });
      }
    
      try {
        // Process successful response
        const cleanedDetails = sanitizeForFirestore({
          basicInfo: {
            job_id: jobId,
            job_link: result.url
          },
          details: {
            title: HtmlAnalyzer.extractCleanContent(content?.jobTitle?.[0] || ""),
            location: HtmlAnalyzer.extractCleanContent(content?.location?.[0] || ""),
            description: HtmlAnalyzer.extractCleanContent(content?.description?.[0] || ""),
            postingDate: content?.postingDate?.[0],
            parseStatusCode: content?.parse_status_code
          },
          status: 'complete',
          lastUpdated: FieldValue.serverTimestamp()
        });
    
        functions.logger.info("Saving job details to Firestore:", {
          jobId,
          hasTitle: !!cleanedDetails.details.title,
          hasDescription: !!cleanedDetails.details.description,
          hasLocation: !!cleanedDetails.details.location
        });
    
        await FirestoreService.saveJobToUserCollection('test_user', cleanedDetails, jobId);
        functions.logger.info('Successfully saved job details:', { jobId });
    
        return res.status(200).json({
          success: true,
          jobId,
          message: 'Job details processed and saved'
        });
      } catch (error) {
        functions.logger.error('Failed to process job details:', {
          jobId,
          error: error.message,
          stack: error.stack
        });
    
        return res.status(200).json({
          success: false,
          jobId,
          error: 'Failed to process job details',
          details: error.message
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