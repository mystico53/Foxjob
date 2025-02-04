const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = getFirestore();

// Helper to safely get value or null
const safeGet = (obj, key) => {
  const value = obj?.[key];
  if (value === undefined || value === '') return null;
  if (typeof value === 'string') return value.trim() || null;
  return value;
};

// Helper to safely get array or null
const safeGetArray = (value) => {
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return null;
  return value;
};

// Helper to clean HTML content
const cleanHtml = (text) => {
  if (!text) return null;
  const cleaned = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

// Helper to handle salary data
const transformSalary = (baseSalary, payRange) => {
  const salary = {
    base: null,
    range: null
  };

  if (baseSalary) {
    salary.base = {
      minAmount: safeGet(baseSalary, 'min_amount'),
      maxAmount: safeGet(baseSalary, 'max_amount'),
      currency: safeGet(baseSalary, 'currency'),
      paymentPeriod: safeGet(baseSalary, 'payment_period')
    };
  }

  if (payRange) {
    salary.range = payRange;  // Store the original pay range if different format
  }

  return salary;
};

// Transform job data
const transformJobData = (job) => {
  // Validate required field
  if (!job?.job_posting_id) {
    throw new Error('Job posting ID is required');
  }

  return {
    basicInfo: {
      jobId: safeGet(job, 'job_posting_id'),
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
      description: cleanHtml(job.job_description_formatted),
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

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Initialize Secret Manager client
const secretManager = new SecretManagerServiceClient();

async function downloadSnapshot(snapshotId, authToken) {
  try {
    const response = await axios.get(
      `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`, 
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        params: {
          format: 'json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error downloading snapshot:', error);
    throw new Error(`Failed to download snapshot: ${error.message}`);
  }
}

// Main webhook handler
exports.handleBrightdataWebhook = onRequest({
  timeoutSeconds: 540,
  memory: '1GiB',
  region: 'us-central1'
}, async (req, res) => {
  try {
    // Add the new logging here
    if (req.body?.snapshot_id && req.body?.status === "ready") {
      console.log('[Webhook] Received status update:', {
        snapshot_id: req.body.snapshot_id,
        status: req.body.status,
        headers: req.headers
      });
    } else {
      console.log('[Webhook] Received data webhook:', {
        bodyLength: JSON.stringify(req.body).length,
        headers: req.headers
      });
    }

    // Get the webhook secret
    const name = 'projects/656035288386/secrets/WEBHOOK_SECRET/versions/latest';
    const [version] = await secretManager.accessSecretVersion({ name });
    const webhookSecret = version.payload.data.toString();

    // Get Brightdata API token
    const brightdataTokenName = 'projects/656035288386/secrets/BRIGHTDATA_API_TOKEN/versions/latest';
    const [brightdataVersion] = await secretManager.accessSecretVersion({ name: brightdataTokenName });
    const brightdataToken = brightdataVersion.payload.data.toString();

    // First check if this is a status update
    if (req.body?.snapshot_id && req.body?.status === "ready") {
      console.log('Received ready status for snapshot:', req.body.snapshot_id);
      
      try {
        // Download the snapshot
        const snapshotData = await downloadSnapshot(req.body.snapshot_id, brightdataToken);
        
        // Process the downloaded data using existing job processing logic
        const userId = req.query.userId || 'test_user';
        const jobs = Array.isArray(snapshotData) ? snapshotData : [snapshotData];
        const batch = db.batch();
        
        const results = {
          successful: [],
          failed: []
        };
        
        // Transform and prepare batch writes
        for (const job of jobs) {
          try {
            const transformedJob = transformJobData(job);
            const docRef = db.collection('users')
                          .doc(userId)
                          .collection('scrapedJobs')
                          .doc(job.job_posting_id);
                          
            batch.set(docRef, transformedJob, { merge: true });
            results.successful.push({
              jobId: job.job_posting_id,
              title: job.job_title
            });
          } catch (error) {
            console.error('Error processing job from snapshot:', error);
            results.failed.push({
              jobId: job.job_posting_id,
              error: error.message
            });
          }
        }

        // Commit the batch
        await batch.commit();

        return res.json({
          success: true,
          message: 'Snapshot downloaded and processed',
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
      } catch (error) {
        console.error('Error processing snapshot:', error);
        return res.status(500).json({
          success: false,
          error: `Failed to process snapshot: ${error.message}`,
          snapshot_id: req.body.snapshot_id,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Auth check only for job data webhooks
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('No auth header received');
        throw new Error('Invalid authorization');
    }

    const receivedToken = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : authHeader;
    console.log('Cleaned tokens for comparison:');
    console.log('Received:', receivedToken);
    console.log('Expected:', webhookSecret);

    if (receivedToken !== webhookSecret) {
        console.log('Token mismatch');
        throw new Error('Invalid authorization');
    }
    // Get userId from query params or use default
    const userId = req.query.userId || 'test_user';
    
    // Process jobs array
    const jobs = Array.isArray(req.body) ? req.body : [req.body];
    const batch = db.batch();
    
    const results = {
      successful: [],
      failed: []
    };
    
    // Transform and prepare batch writes
    for (const job of jobs) {
      try {
        const transformedJob = transformJobData(job);
        const docRef = db.collection('users')
                        .doc(userId)
                        .collection('scrapedJobs')
                        .doc(job.job_posting_id);
                        
        batch.set(docRef, transformedJob, { merge: true });
        results.successful.push({
          jobId: job.job_posting_id,
          title: job.job_title
        });
      } catch (error) {
        console.error('Error processing job:', {
          jobId: job.job_posting_id,
          error: error.message
        });
        results.failed.push({
          jobId: job.job_posting_id,
          error: error.message
        });
      }
    }

    // Commit the batch
    await batch.commit();

    // Return detailed success response
    res.json({
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
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});