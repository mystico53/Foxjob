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
  CALLBACK_URL: 'https://bf2b-71-146-184-34.ngrok-free.app/jobille-45494/us-central1/handleOxylabsCallback'
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
      
      functions.logger.info("Submitting new job request to Oxylabs:", {
        jobId,
        url: payload.url,
        callback_url: payload.callback_url // Log the callback URL
      });

      const response = await axios.post(
        CONFIG.BASE_URL,
        payload,
        { headers: OxylabsService.getAuthHeader() }
      );

      functions.logger.info("New job request submitted:", {
        oxylabsId: response.data.id,
        status: response.data.status
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
    functions.logger.info('Received webhook:', {
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    // Determine callback type based on the response structure
    const callbackType = req.body.results?.[0]?.content?.job_listings ? 
      'search' : 'job_detail';

    functions.logger.info("Detected callback type:", { callbackType });

    // Process based on type
    if (callbackType === 'search') {
      const jobListings = req.body.results?.[0]?.content?.job_listings || [];
      
      for (const job of jobListings) {
        const cleanedDetails = sanitizeForFirestore({
          basicInfo: {
            job_id: job.job_id,
            job_title: job.job_title,
            company_name: job.company_name,
            job_link: job.job_link
          },
          details: null,
          status: 'pending_details'
        });

        await FirestoreService.saveJobToUserCollection('test_user', cleanedDetails);
      }
    } else {
      // Process job detail response
      const result = req.body.results?.[0];
      
      // Extract job ID from URL
      let jobId;
      if (result?.url) {
        const match = result.url.match(/jk=([^&]+)/);
        jobId = match ? match[1] : null;
      }

      if (!jobId) {
        return res.status(200).json({ success: false, error: "Could not determine job ID" });
      }

      // Check if response was successful
      if (result.status === 'faulted' || result.status === 'failed') {
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

      // Process successful response
      const content = result.content;
      const cleanedDetails = sanitizeForFirestore({
        details: {
          title: HtmlAnalyzer.extractCleanContent(content?.jobTitle?.[0] || ""),
          location: HtmlAnalyzer.extractCleanContent(content?.location?.[0] || ""),
          description: HtmlAnalyzer.extractCleanContent(content?.description?.[0] || ""),
          postingDate: content?.postingDate?.[0],
          parseStatusCode: content?.parse_status_code
        },
        status: 'complete'
      });

      await FirestoreService.saveJobToUserCollection('test_user', cleanedDetails, jobId);
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