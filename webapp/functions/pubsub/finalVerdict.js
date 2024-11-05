const functions = require('firebase-functions');
const admin = require('firebase-admin');
const logger = require("firebase-functions/logger");
require('dotenv').config();

// Initialize
const db = admin.firestore();

// ===== Config =====
const CONFIG = {
  topics: {
    hardSkillsMatched: 'hard-skills-matched'
  },
  collections: {
    users: 'users',
    jobs: 'jobs'
  }
};

// ===== Logging Utility =====
const loggingService = {
  startTime: null,
  metrics: {
    totalUsers: 0,
    totalJobs: 0,
    processedUsers: 0,
    processedJobs: 0,
    errors: 0
  },

  initializeMetrics() {
    this.startTime = Date.now();
    this.metrics = {
      totalUsers: 0,
      totalJobs: 0,
      processedUsers: 0,
      processedJobs: 0,
      errors: 0
    };
  },

  getExecutionTime() {
    return ((Date.now() - this.startTime) / 1000).toFixed(2);
  },

  logJobDetails(userId, jobDoc) {
    const jobData = jobDoc.data();
    logger.info('Job Details:', {
      context: 'job_processing',
      userId,
      jobId: jobDoc.id,
      timestamp: new Date().toISOString(),
      status: jobData.generalData?.processingStatus || 'unknown',
      hasSkillAssessment: !!jobData.SkillAssessment,
      metadata: {
        createdAt: jobData.generalData?.createdAt,
        lastModified: jobData.generalData?.lastModified
      }
    });
  },

  logProgress() {
    const completionPercentage = (this.metrics.processedUsers / this.metrics.totalUsers * 100).toFixed(1);
    logger.info('Processing Progress:', {
      context: 'progress_update',
      timestamp: new Date().toISOString(),
      metrics: {
        ...this.metrics,
        completionPercentage: `${completionPercentage}%`,
        executionTime: `${this.getExecutionTime()}s`
      }
    });
  },

  logFinalSummary() {
    logger.info('Execution Summary:', {
      context: 'final_summary',
      timestamp: new Date().toISOString(),
      metrics: {
        ...this.metrics,
        averageJobsPerUser: (this.metrics.totalJobs / this.metrics.totalUsers).toFixed(2),
        totalExecutionTime: `${this.getExecutionTime()}s`,
        successRate: `${((this.metrics.processedJobs / this.metrics.totalJobs) * 100).toFixed(1)}%`
      }
    });
  }
};

// ===== Log Jobs Function =====
exports.finalVerdict = functions.pubsub
  .topic(CONFIG.topics.hardSkillsMatched)
  .onPublish(async (message) => {
    try {
      // Initialize logging metrics
      loggingService.initializeMetrics();
      
      logger.info('Function Invocation:', {
        context: 'function_start',
        timestamp: new Date().toISOString(),
        functionName: 'finalVerdict',
        trigger: 'pubsub.topic.hardSkillsMatched'
      });

      // Parse message data
      const messageData = message.json;
      logger.info('Received Message:', {
        context: 'message_received',
        data: messageData,
        timestamp: new Date().toISOString()
      });
      
      // Get all documents from the users collection
      const usersSnapshot = await db.collection(CONFIG.collections.users).get();
      loggingService.metrics.totalUsers = usersSnapshot.size;
      
      logger.info('Users Collection Scan:', {
        context: 'collection_scan',
        timestamp: new Date().toISOString(),
        totalUsers: usersSnapshot.size
      });
      
      // Iterate through each user
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        try {
          logger.info('Processing User:', {
            context: 'user_processing',
            userId,
            timestamp: new Date().toISOString(),
            userIndex: loggingService.metrics.processedUsers + 1
          });
          
          // Get all jobs for this user
          const jobsSnapshot = await db
            .collection(CONFIG.collections.users)
            .doc(userId)
            .collection(CONFIG.collections.jobs)
            .get();
          
          loggingService.metrics.totalJobs += jobsSnapshot.size;
          
          // Log each job document
          jobsSnapshot.docs.forEach(jobDoc => {
            loggingService.logJobDetails(userId, jobDoc);
            loggingService.metrics.processedJobs++;
          });
          
          logger.info('User Processing Complete:', {
            context: 'user_complete',
            userId,
            timestamp: new Date().toISOString(),
            jobsProcessed: jobsSnapshot.size
          });
          
          loggingService.metrics.processedUsers++;
          
          // Log progress every 10 users
          if (loggingService.metrics.processedUsers % 10 === 0) {
            loggingService.logProgress();
          }
          
        } catch (userError) {
          loggingService.metrics.errors++;
          logger.error('Error processing user:', {
            context: 'user_error',
            userId,
            error: userError.message,
            timestamp: new Date().toISOString(),
            stack: userError.stack
          });
        }
      }
      
      // Log final summary
      loggingService.logFinalSummary();
      
    } catch (error) {
      logger.error('Critical Error:', {
        context: 'critical_error',
        error: error.message,
        timestamp: new Date().toISOString(),
        stack: error.stack,
        metrics: loggingService.metrics
      });
      throw new functions.https.HttpsError('internal', error.message);
    }
  });