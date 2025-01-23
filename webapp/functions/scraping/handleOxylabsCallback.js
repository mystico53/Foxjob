const { onRequest } = require('firebase-functions/v2/https');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require("firebase-admin/firestore");

// Initialize Firebase (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============= HTML ANALYZER =============
const HtmlAnalyzer = {
  analyzeContent: (htmlContent) => {
    return {
      hasJobTitle: htmlContent.includes('jobsearch-JobInfoHeader-title'),
      hasLocation: htmlContent.includes('jobsearch-JobInfoHeader-companyLocation'),
      hasCompany: htmlContent.includes('jobsearch-CompanyInfoContainer'),
      hasDescription: htmlContent.includes('jobDescriptionText'),
      dataTestIds: htmlContent.match(/data-testid="([^"]+)"/g)?.slice(0, 10),
      jobsearchClasses: htmlContent.match(/class="[^"]*jobsearch[^"]*"/g)?.slice(0, 10)
    };
  },

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

// Helper function to recursively remove undefined values
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

// ============= FIRESTORE SERVICE =============
const FirestoreService = {
  saveJobToUserCollection: async (userId, jobDetail, jobId = null) => {
    // Add debug logging to see what we're trying to save
    functions.logger.debug("Attempting to save job with details:", {
      userId,
      jobId: jobId || jobDetail?.basicInfo?.job_id,
      basicInfo: jobDetail?.basicInfo,
      isUpdate: !!jobId
    });

    // For updates (details), we use the passed jobId
    // For new documents (search results), we use the job_id from basicInfo
    const documentId = jobId || jobDetail?.basicInfo?.job_id;

    if (!userId || !documentId) {
      throw new Error(`Invalid document path parameters. userId: ${userId}, jobId: ${documentId}`);
    }

    const docRef = db.collection('users')
                .doc(userId)
                .collection('scrapedcallback')
                .doc(documentId);
    
    functions.logger.info("Saving job to Firestore:", {
      userId,
      jobId: documentId,
      hasDetails: !!jobDetail.details
    });

    // First check if the document exists
    const doc = await docRef.get();
    if (!doc.exists) {
      // Only create if it doesn't exist
      await docRef.set(jobDetail);
    } else {
      // Update if it exists, merging with existing data
      await docRef.update(jobDetail);
    }

    try {
      functions.logger.info("Successfully saved job to Firestore:", {
        userId,
        jobId: documentId,
        timeMs: Date.now()
      });
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

// ============= MAIN HANDLER =============
exports.handleOxylabsCallback = onRequest({
  timeoutSeconds: 540,
  memory: "1GiB"
}, async (req, res) => {
  try {
    functions.logger.info('Received webhook:', {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      timestamp: new Date().toISOString()
    });

    // Determine callback type based on the response structure
    const callbackType = req.body.results?.[0]?.content?.job_listings ? 
      'search' : 'job_detail';

    functions.logger.info("Detected callback type:", { callbackType });

    // Process based on type
    if (callbackType === 'search') {
      const jobListings = req.body.results?.[0]?.content?.job_listings || [];
      functions.logger.info("Search results:", {
        count: jobListings.length,
        jobs: jobListings
      });

      // Create initial documents for each job listing
      for (const job of jobListings) {
        const cleanedDetails = sanitizeForFirestore({
          basicInfo: {
            job_id: job.job_id,
            job_title: job.job_title,
            company_name: job.company_name,
            job_link: job.job_link
          },
          details: null, // Will be populated by subsequent detail callback
          status: 'pending_details',
          lastUpdated: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp()
        });

        await FirestoreService.saveJobToUserCollection('test_user', cleanedDetails);
      }
    } else {
      // Process job detail
      const result = req.body.results?.[0];
      const content = result?.content;
      
      // Extract job ID from the URL
      let jobId;
      if (result?.url) {
        const match = result.url.match(/jk=([^&]+)/);
        jobId = match ? match[1] : null;
      }
      
      if (!jobId) {
        functions.logger.error("Could not determine job ID from response:", {
          url: result?.url,
          jobId: result?.job_id,
          content
        });
        return res.status(200).json({ success: false, error: "Could not determine job ID" });
      }

      functions.logger.info("Processing job details:", { 
        jobId,
        oxylabsJobId: result?.job_id,
        url: result?.url
      });

      const cleanedDetails = sanitizeForFirestore({
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

      // Update existing document with job details
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

    // Always return 200 to prevent Oxylabs from retrying
    return res.status(200).json({
      received: false,
      error: error.message
    });
  }
});