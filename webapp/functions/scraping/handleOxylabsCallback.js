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

// Keep your existing sanitizeForFirestore helper
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
      // For now, just log search results
      const jobListings = req.body.results?.[0]?.content?.job_listings || [];
      functions.logger.info("Search results:", {
        count: jobListings.length,
        jobs: jobListings
      });
    } else {
      // Process job detail
      const jobDetail = req.body.results?.[0]?.content;
      const jsonLd = JSON.parse(jobDetail.jsonLd || '{}');
      
      const cleanedDetails = sanitizeForFirestore({
        basicInfo: {
          job_id: jsonLd.identifier || `job_${Date.now()}`,
          job_title: jobDetail.jobTitle || jsonLd.title,
          company_name: jsonLd.hiringOrganization?.name
        },
        details: {
          title: jobDetail.jobTitle || jsonLd.title,
          location: jobDetail.location,
          description: jobDetail.description,
          postingDate: jobDetail.postingDate,
          employmentType: jsonLd.employmentType,
          datePosted: jsonLd.datePosted,
          validThrough: jsonLd.validThrough
        },
        lastUpdated: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp()
      });

      // Save to Firestore - using a test user ID for now
      await FirestoreService.saveJobToUserCollection('test_user', cleanedDetails);
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

// Keep your existing FirestoreService
FirestoreService = {
  saveJobToUserCollection: async (userId, jobDetail) => {
    // Add debug logging to see what we're trying to save
    functions.logger.debug("Attempting to save job with details:", {
      userId,
      jobDetailId: jobDetail?.basicInfo?.job_id,
      basicInfo: jobDetail?.basicInfo
    });

    if (!userId || !jobDetail?.basicInfo?.job_id) {
      throw new Error(`Invalid document path parameters. userId: ${userId}, jobId: ${jobDetail?.basicInfo?.job_id}`);
    }

    const docRef = db.collection('users')
                .doc(userId)
                .collection('scrapedcallback')
                .doc(jobDetail.basicInfo.job_id);
    
    functions.logger.info("Saving job to Firestore:", {
      userId,
      jobId: jobDetail.basicInfo.job_id,
      hasDetails: !!jobDetail.details
    });
                     
    const cleanedDetails = sanitizeForFirestore({
      ...jobDetail,
      details: {
        ...jobDetail.details,
        description: HtmlAnalyzer.extractCleanContent(jobDetail.details?.description || "No description available."),
        title: HtmlAnalyzer.extractCleanContent(jobDetail.details?.title || ""),
        location: HtmlAnalyzer.extractCleanContent(jobDetail.details?.location || ""),
      },
      lastUpdated: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp()
    });

    // First check if the document exists
    const doc = await docRef.get();
    if (!doc.exists) {
        // Only create if it doesn't exist
        await docRef.set(cleanedDetails);
    } else {
        // Update if it exists
        await docRef.update(cleanedDetails);
    } 

    try {
      functions.logger.info("Successfully saved job to Firestore:", {
        userId,
        jobId: jobDetail.basicInfo.job_id,
        timeMs: Date.now()
      });
    } catch (error) {
      functions.logger.error("Error saving job to Firestore:", {
        userId,
        jobId: jobDetail.basicInfo.job_id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}