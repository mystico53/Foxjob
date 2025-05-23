const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
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
    salary.range = payRange;
  }

  return salary;
};

const transformJobData = (job) => {
  const jobId = job?.job_posting_id || `generated_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  return {
    processing: {
      status: 'raw'
    },
    basicInfo: {
      jobId: jobId,
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

const initializePubSub = async (topicName) => {
  const topic = pubsub.topic(topicName);
  const [exists] = await topic.exists();
  if (!exists) {
    [topic] = await pubsub.createTopic(topicName);
    logger.info(`Topic ${topicName} created.`);
  }
  return topic;
};

const publishJobMessage = async (topic, firebaseUid, jobId) => {
  try {
    const messageId = await topic.publishMessage({
      json: {
        firebaseUid,
        jobId,
        timestamp: new Date().toISOString()
      },
      attributes: {
        source: 'downloadAndProcessSnapshot'
      }
    });
    logger.info(`Published message ${messageId} for job ${jobId}`);
    return messageId;
  } catch (error) {
    logger.error(`Failed to publish message for job ${jobId}:`, error);
    throw error;
  }
};

// ENHANCED downloadSnapshot function with detailed logging
async function downloadSnapshot(snapshotId, authToken) {
  try {
    logger.info(`Downloading snapshot ${snapshotId} from BrightData API`);
    
    const apiUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}`;
    logger.info(`API URL: ${apiUrl}`);
    
    // Log the request configuration
    logger.info('Request configuration:', {
      url: apiUrl,
      headers: {
        'Authorization': 'Bearer [REDACTED]',
      },
      params: {
        format: 'json'
      }
    });
    
    const startTime = Date.now();
    const response = await axios.get(
      apiUrl,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        params: {
          format: 'json'
        }
      }
    );
    const requestDuration = Date.now() - startTime;
    
    // Log detailed response information
    logger.info(`BrightData API response received in ${requestDuration}ms for snapshot ${snapshotId}`, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      dataLength: Array.isArray(response.data) ? response.data.length : 1
    });
    
    // Log the first item in the response to understand structure (limit personal data)
    if (Array.isArray(response.data) && response.data.length > 0) {
      const sampleJob = { ...response.data[0] };
      // Redact any sensitive fields
      if (sampleJob.job_description) sampleJob.job_description = '[REDACTED FOR LOG]';
      if (sampleJob.job_description_formatted) sampleJob.job_description_formatted = '[REDACTED FOR LOG]';
      
      logger.info('Sample job structure from response:', sampleJob);
      
      // Log job title distribution for debugging relevance
      const jobTitles = response.data.map(job => job.job_title || '').filter(Boolean);
      const titleAnalysis = jobTitles.reduce((acc, title) => {
        const lowerTitle = title.toLowerCase();
        
        // Track specific title patterns
        if (lowerTitle.includes('product manager')) acc.productManager++;
        else if (lowerTitle.includes('software engineer')) acc.softwareEngineer++;
        else if (lowerTitle.includes('developer')) acc.developer++;
        else acc.other++;
        
        return acc;
      }, { productManager: 0, softwareEngineer: 0, developer: 0, other: 0, total: jobTitles.length });
      
      logger.info('Job title distribution analysis:', titleAnalysis);
    } else {
      // If it's a single object or empty, log appropriate info
      logger.info('Response is not an array or is empty. Data structure:', {
        type: typeof response.data,
        keys: typeof response.data === 'object' ? Object.keys(response.data) : 'N/A'
      });
    }
    
    // Log the entire raw response as JSON string for complete debugging
    // Be careful with large responses - this could make logs very large
    logger.info(`COMPLETE_RAW_RESPONSE: ${JSON.stringify(response.data)}`);
    
    return response.data;
  } catch (error) {
    // Enhanced error logging
    logger.error('Error downloading snapshot:', {
      snapshotId,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack,
      responseStatus: error.response?.status,
      responseData: error.response?.data
    });
    throw new Error(`Failed to download snapshot: ${error.message}`);
  }
}

// ENHANCED main function with more logging points
exports.downloadAndProcessSnapshot = onRequest({
  timeoutSeconds: 540,
  memory: '1GiB',
  region: 'us-central1',
  secrets: ["BRIGHTDATA_API_TOKEN"],
}, async (req, res) => {
  const startTime = Date.now();
  logger.info('Function started', {
    method: req.method,
    query: req.query,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    timestamp: new Date().toISOString()
  });
  
  await new Promise((resolve) => cors(req, res, resolve));
  try {
    const snapshotId = req.query.snapshotId || req.body?.snapshotId;
    if (!snapshotId) {
      throw new Error('Snapshot ID is required');
    }

    const firebaseUid = req.query.firebaseUid || req.body?.firebaseUid || 'test_user';
    logger.info(`Processing request for user ${firebaseUid}, snapshot ${snapshotId}`);

    const brightdataTokenName = 'projects/656035288386/secrets/BRIGHTDATA_API_TOKEN/versions/latest';
    const [brightdataVersion] = await secretManager.accessSecretVersion({ name: brightdataTokenName });
    const brightdataToken = brightdataVersion.payload.data.toString();
    logger.info('Successfully retrieved BrightData API token');

    // Get snapshot data with enhanced logging
    const snapshotData = await downloadSnapshot(snapshotId, brightdataToken);
    
    const jobs = Array.isArray(snapshotData) ? snapshotData : [snapshotData];
    logger.info(`Processing ${jobs.length} jobs from snapshot ${snapshotId}`);
    
    const MAX_BATCH_SIZE = 500;
    
    const results = {
      successful: [],
      failed: []
    };
    
    // Initialize Pub/Sub topic once
    const topicName = 'job-embedding-requests';
    const topic = await initializePubSub(topicName);
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Process jobs in batches
    for (let i = 0; i < jobs.length; i += MAX_BATCH_SIZE) {
      const batchJobs = jobs.slice(i, i + MAX_BATCH_SIZE);
      logger.info(`Processing batch ${Math.floor(i/MAX_BATCH_SIZE) + 1} with ${batchJobs.length} jobs`);
      
      const batch = db.batch();
      const batchJobIds = [];  // Track jobs in this batch
    
      for (const job of batchJobs) {
        try {
          const transformedJob = transformJobData(job);
          const docRef = db.collection('users')
            .doc(firebaseUid)
            .collection('scrapedJobs')
            .doc(transformedJob.basicInfo.jobId);
            
          batch.set(docRef, transformedJob, { merge: true });
          batchJobIds.push(transformedJob.basicInfo.jobId);
        } catch (error) {
          logger.error('Error processing job:', {
            jobId: job.job_posting_id,
            error: error.message,
            stack: error.stack
          });
          results.failed.push({
            jobId: job.job_posting_id,
            error: error.message
          });
        }
      }
    
      // Commit batch first
      try {
        await batch.commit();
        logger.info(`Batch committed successfully for ${batchJobIds.length} jobs`);
        
        // Wait a bit longer after commit
        await sleep(1000);
    
        // Now publish messages for the committed batch
        const pubsubPromises = batchJobIds.map(jobId =>
          publishJobMessage(topic, firebaseUid, jobId)
            .then(() => {
              results.successful.push({ jobId });
            })
            .catch(error => {
              results.failed.push({
                jobId,
                error: error.message
              });
            })
        );
    
        await Promise.all(pubsubPromises);
        logger.info(`Published ${batchJobIds.length} messages to Pub/Sub`);
      } catch (error) {
        logger.error('Error in batch operation:', {
          error: error.message,
          stack: error.stack,
          batchSize: batchJobIds.length
        });
        batchJobIds.forEach(jobId => {
          results.failed.push({
            jobId,
            error: error.message
          });
        });
      }
    }

    const processingTime = Date.now() - startTime;
    logger.info(`Function completed successfully in ${processingTime}ms`, {
      totalJobs: jobs.length,
      successful: results.successful.length,
      failed: results.failed.length
    });

    res.json({
      success: true,
      processed: {
        total: jobs.length,
        successful: results.successful.length,
        failed: results.failed.length,
        jobs: results.successful,
        errors: results.failed
      },
      snapshotId,
      firebaseUid,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Function failed:', {
      error: error.message,
      stack: error.stack,
      processingTime: `${processingTime}ms`
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      processingTime: `${processingTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
});