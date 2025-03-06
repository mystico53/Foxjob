const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub();
const { logger } = require('firebase-functions');

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

async function processJobsAndPublish(jobs, userId) {
  const topic = pubsub.topic('job-embedding-requests');
  const batch = db.batch();
  const results = { successful: [], failed: [], processed: 0 };
  
  // Process all jobs for Firestore batch
  for (const job of jobs) {
    try {
      const transformedJob = transformJobData(job);
      const jobId = transformedJob.basicInfo.jobId;
      
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
  
  // Commit batch to Firestore
  try {
    await batch.commit();
    results.processed = results.successful.length;
    
    // Publish messages to PubSub
    const pubsubPromises = results.successful.map(job => 
      topic.publishMessage({
        json: {
          firebaseUid: userId,
          jobId: job.jobId,
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
    logger.error('Batch commit error:', error);
    throw error;
  }
}

// Main webhook handler
exports.handleBrightdataWebhook = onRequest({
  timeoutSeconds: 540,
  memory: '1GiB',
  region: 'us-central1'
}, async (req, res) => {
  try {
    const userId = req.query.userId || 'test_user';
    logger.info('Webhook received', { bodyType: typeof req.body, isArray: Array.isArray(req.body) });
    
    // Case 1: Status update from Brightdata
    if (req.body?.snapshot_id && req.body?.status === "ready") {
      logger.info('Processing snapshot ready status', { snapshotId: req.body.snapshot_id });
      
      // Get Brightdata token and download snapshot
      const [secretVersion] = await secretManager.accessSecretVersion({
        name: 'projects/656035288386/secrets/BRIGHTDATA_API_TOKEN/versions/latest'
      });
      const brightdataToken = secretVersion.payload.data.toString();
      const snapshotData = await downloadSnapshot(req.body.snapshot_id, brightdataToken);
      
      // Process jobs from snapshot
      const jobs = Array.isArray(snapshotData) ? snapshotData : [snapshotData];
      const results = await processJobsAndPublish(jobs, userId);
      
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
        userId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Case 2: Direct job data webhook - verify auth token
    const [webhookSecret] = await secretManager.accessSecretVersion({
      name: 'projects/656035288386/secrets/WEBHOOK_SECRET/versions/latest'
    }).then(([version]) => version.payload.data.toString());
    
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
    const results = await processJobsAndPublish(jobs, userId);
    
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