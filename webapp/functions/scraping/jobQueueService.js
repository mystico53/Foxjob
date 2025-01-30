const functions = require('firebase-functions');
const { FieldValue } = require("firebase-admin/firestore");
const admin = require('firebase-admin');
const OxylabsService = require('./OxylabsService');

const db = admin.firestore();

// Debug helper to log counter state
async function logCounterState(message, extraData = {}) {
  const counterDoc = await db.collection('activeJobs').doc('counter').get();
  functions.logger.info(`[COUNTER STATE] ${message}`, {
    currentCount: counterDoc.exists ? counterDoc.data().count : 0,
    exists: counterDoc.exists,
    timestamp: new Date().toISOString(),
    ...extraData
  });
}

// Debug helper to log active jobs state
async function logActiveJobsState(message, extraData = {}) {
  const snapshot = await db.collection('activeJobs').get();
  const jobs = snapshot.docs
    .filter(doc => doc.id !== 'counter')
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  functions.logger.info(`[ACTIVE JOBS STATE] ${message}`, {
    totalJobs: jobs.length,
    jobs,
    timestamp: new Date().toISOString(),
    ...extraData
  });
}


const ActiveJobsService = {
    activeJobsRef: db.collection('activeJobs'),
    counterRef: db.collection('activeJobs').doc('counter'),

    async ensureCounterExists() {
      const counterRef = this.counterRef;
      const doc = await counterRef.get();
      if (!doc.exists) {
          await counterRef.set({ count: 0 });
          functions.logger.info('Created counter document');
      }
  },
  
    async decrementCounter() {
      await logCounterState('Before decrement');
      
      return await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(this.counterRef);
        const currentCount = counterDoc.exists ? counterDoc.data().count : 0;
        
        functions.logger.info('[DECREMENT] Transaction read counter:', {
          currentCount,
          exists: counterDoc.exists
        });
        
        if (currentCount > 0) {
          transaction.update(this.counterRef, {
            count: currentCount - 1
          });
          
          functions.logger.info('[DECREMENT] Updating counter:', {
            from: currentCount,
            to: currentCount - 1
          });
        }
        
        return { success: true, newCount: Math.max(0, currentCount - 1) };
      });
    },
  
    async addActiveJob(oxylabsId, jobType, metadata = {}) {
      if (!oxylabsId) {
        throw new Error('oxylabsId is required');
      }
    
      await logCounterState('Before adding active job', { oxylabsId, jobType });
      await logActiveJobsState('Before adding active job', { oxylabsId, jobType });
  
      try {
        return await db.runTransaction(async (transaction) => {
          // IMPORTANT: Read both counter AND existing job document
          const [counterDoc, existingJobDoc] = await Promise.all([
            transaction.get(this.counterRef),
            transaction.get(this.activeJobsRef.doc(oxylabsId))
          ]);
  
          const currentCount = counterDoc.exists ? counterDoc.data().count : 0;
          const maxJobs = jobType === 'search' ? 13 : 12;
  
          functions.logger.info('[ADD JOB] Transaction state:', {
            currentCount,
            maxJobs,
            jobExists: existingJobDoc.exists,
            oxylabsId,
            jobType
          });
    
          if (currentCount >= maxJobs) {
            functions.logger.warn('[ADD JOB] Max jobs reached:', {
              currentCount,
              maxJobs,
              oxylabsId
            });
            return { success: false, shouldRequeue: true };
          }
  
          // Check for duplicate job
          if (existingJobDoc.exists) {
            functions.logger.warn('[ADD JOB] Duplicate job detected:', {
              oxylabsId,
              existingJob: existingJobDoc.data()
            });
            return { success: false, shouldRequeue: false, error: 'Duplicate job' };
          }
    
          transaction.set(this.counterRef, { count: currentCount + 1 }, { merge: true });
          transaction.set(this.activeJobsRef.doc(oxylabsId), {
            startedAt: FieldValue.serverTimestamp(),
            type: jobType,
            status: 'running',
            ...metadata,
            lastUpdated: FieldValue.serverTimestamp()
          });
    
          functions.logger.info('[ADD JOB] Job added successfully:', {
            oxylabsId,
            newCount: currentCount + 1,
            jobType
          });
  
          return { success: true, currentCount: currentCount + 1 };
        });
      } catch (error) {
        functions.logger.error('[ADD JOB] Failed to add active job:', {
          oxylabsId,
          jobType,
          error: error.message,
          stack: error.stack
        });
        throw error;
      } finally {
        await logCounterState('After adding active job', { oxylabsId, jobType });
        await logActiveJobsState('After adding active job', { oxylabsId, jobType });
      }
    },
  
    async removeActiveJob(oxylabsId) {
      if (!oxylabsId) {
        throw new Error('oxylabsId is required');
      }
  
      await logCounterState('Before removing active job', { oxylabsId });
      await logActiveJobsState('Before removing active job', { oxylabsId });
  
      try {
        return await db.runTransaction(async (transaction) => {
          const jobDoc = await transaction.get(this.activeJobsRef.doc(oxylabsId));
          
          functions.logger.info('[REMOVE JOB] Transaction read state:', {
            oxylabsId,
            jobExists: jobDoc.exists,
            jobData: jobDoc.exists ? jobDoc.data() : null
          });
  
          if (!jobDoc.exists) {
            functions.logger.warn('[REMOVE JOB] Job not found:', { oxylabsId });
            return { success: false, error: 'Job not found' };
          }
  
          // Delete active job and update counter atomically
          transaction.delete(this.activeJobsRef.doc(oxylabsId));
          transaction.update(this.counterRef, {
            count: FieldValue.increment(-1)
          });
  
          functions.logger.info('[REMOVE JOB] Job removed successfully:', {
            oxylabsId,
            originalJobId: jobDoc.data().originalJobId
          });
  
          return { 
            success: true,
            originalJobId: jobDoc.data().originalJobId
          };
        });
      } catch (error) {
        functions.logger.error('[REMOVE JOB] Failed to remove active job:', {
          oxylabsId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      } finally {
        await logCounterState('After removing active job', { oxylabsId });
        await logActiveJobsState('After removing active job', { oxylabsId });
      }
    }
  };

  const JobQueueService = {
    queueRef: db.collection('jobQueue'),

    async addToQueue(jobId, metadata = {}) {
        functions.logger.info('[ADD TO QUEUE] Adding job:', {
          jobId,
          metadata,
          timestamp: new Date().toISOString()
        });
    
        try {
          const result = await db.runTransaction(async (transaction) => {
            // Check if job already exists
            const existingJob = await transaction.get(this.queueRef.doc(jobId));
            
            functions.logger.info('[ADD TO QUEUE] Checked existing job:', {
              jobId,
              exists: existingJob.exists,
              existingData: existingJob.exists ? existingJob.data() : null
            });
    
            // If job exists and is not in error/failed state, don't re-add
            if (existingJob.exists) {
              const status = existingJob.data().status;
              if (status !== 'error' && status !== 'failed') {
                functions.logger.warn('[ADD TO QUEUE] Job already exists with active status:', {
                  jobId,
                  status
                });
                return { success: false, error: 'Job already exists' };
              }
            }
    
            transaction.set(this.queueRef.doc(jobId), {
              jobId,
              status: 'pending',
              createdAt: FieldValue.serverTimestamp(),
              retryCount: 0,
              ...metadata
            }, { merge: true });
    
            return { success: true };
          });
    
          functions.logger.info('[ADD TO QUEUE] Successfully added job:', {
            jobId,
            result
          });
    
          return result;
        } catch (error) {
          functions.logger.error('[ADD TO QUEUE] Failed to add job:', {
            jobId,
            error: error.message,
            stack: error.stack,
            metadata
          });
          throw error;
        }
      },
    
    async processQueue() {
      try {
        await ActiveJobsService.ensureCounterExists();

        await logCounterState('Before processing queue');
        
        // Stage 1: Get jobs to process
        const getJobsResult = await db.runTransaction(async (transaction) => {
          // READS FIRST
          const [counterDoc, queueSnapshot] = await Promise.all([
            transaction.get(ActiveJobsService.counterRef),
            transaction.get(
              this.queueRef
                .where('status', '==', 'pending')
                .orderBy('createdAt')
                .limit(13)
            )
          ]);
  
          const currentCount = counterDoc.exists ? counterDoc.data().count : 0;
          const availableSlots = 13 - currentCount;
  
          functions.logger.info('[PROCESS QUEUE] Transaction read state:', {
            currentCount,
            availableSlots,
            pendingJobs: queueSnapshot.size
          });
  
          if (availableSlots <= 0) {
            return { processed: 0, status: 'no_slots_available' };
          }
  
          if (queueSnapshot.empty) {
            return { processed: 0, status: 'no_pending_jobs' };
          }
  
          const jobsToProcess = queueSnapshot.docs
            .slice(0, availableSlots)
            .map(doc => ({
              id: doc.id,
              data: doc.data()
            }));
  
          functions.logger.info('[PROCESS QUEUE] Processing jobs:', {
            jobCount: jobsToProcess.length,
            jobs: jobsToProcess.map(j => j.id)
          });
  
          // Update counter and mark jobs as processing
          transaction.update(ActiveJobsService.counterRef, {
            count: currentCount + jobsToProcess.length
          });
  
          jobsToProcess.forEach(job => {
            transaction.update(this.queueRef.doc(job.id), {
              status: 'processing',
              processingStartedAt: FieldValue.serverTimestamp(),
              processingAttempts: FieldValue.increment(1)
            });
          });
  
          return {
            jobsToProcess,
            newCount: currentCount + jobsToProcess.length
          };
        });
  
        // Log after transaction
        await logCounterState('After queue processing transaction', {
          jobsProcessed: getJobsResult.jobsToProcess?.length || 0
        });

      // Early return if no jobs to process
      if (!getJobsResult.jobsToProcess?.length) {
        return getJobsResult;
      }

      functions.logger.debug('[PROCESS QUEUE] Starting Stage 2 processing', {
        jobCount: getJobsResult.jobsToProcess.length,
        hasOxylabs: !!OxylabsService,
        oxylabsMethods: OxylabsService ? Object.keys(OxylabsService) : []
      });

      // Stage 2: Process jobs sequentially with retries
      const processResults = [];
      for (const job of getJobsResult.jobsToProcess) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          let retryCount = 0;
          let success = false;
          let lastError = null;
          let oxylabsId = null;

          functions.logger.debug('[PROCESS QUEUE] Attempting job submission', {
            jobId: job.id,
            retryCount,
            hasOxylabs: !!OxylabsService,
            submitMethod: !!OxylabsService?.submitNewJobRequest
          });

          // Retry loop for network issues
          while (retryCount < 3 && !success) {
            try {
              functions.logger.debug('[PROCESS QUEUE] Calling submitNewJobRequest', {
                jobId: job.id,
                attempt: retryCount + 1
              });
              
              const result = await OxylabsService.submitNewJobRequest(job.id);
              
              if (result.success) {
                success = true;
                oxylabsId = result.oxylabsId;
              } else {
                lastError = result.error;
                retryCount++;
                if (retryCount < 3) await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
              }
            } catch (error) {
              functions.logger.error('[PROCESS QUEUE] Submit failed', {
                jobId: job.id,
                attempt: retryCount + 1,
                error: error.message,
                stack: error.stack
              });
              lastError = error.message;
              retryCount++;
              if (retryCount < 3) await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }
          }

          if (success && oxylabsId) {
            try {
              // Add to active jobs with retry
              const activeJobResult = await ActiveJobsService.addActiveJob(oxylabsId, 'job_detail', {
                originalJobId: job.id,
                status: 'submitted'
              });

              if (activeJobResult.success) {
                // Remove from queue on success
                await this.queueRef.doc(job.id).delete();
                processResults.push({ success: true, jobId: job.id, oxylabsId });
              } else if (activeJobResult.shouldRequeue) {
                // Requeue if hit concurrent limit
                await this.requeueJob(job.id, 'Hit concurrent limit - will retry');
                processResults.push({ 
                  success: false, 
                  jobId: job.id, 
                  error: 'Hit concurrent limit - requeued' 
                });
              }
            } catch (error) {
              await this.handleJobFailure(job.id, error.message, true);
              processResults.push({ 
                success: false, 
                jobId: job.id, 
                error: error.message 
              });
            }
          } else {
            // Handle final failure after retries
            await this.handleJobFailure(job.id, lastError || 'Failed after retries', true);
            processResults.push({ 
              success: false, 
              jobId: job.id, 
              error: lastError || 'Failed after retries' 
            });
          }
        } catch (error) {
          await this.handleJobFailure(job.id, error.message, true);
          processResults.push({ 
            success: false, 
            jobId: job.id, 
            error: error.message 
          });
        }
      }

      return {
        processed: processResults.filter(r => r.success).length,
        failed: processResults.filter(r => !r.success).length,
        status: 'completed',
        details: processResults
      };

    } catch (error) {
      functions.logger.error('Failed to process job queue:', error);
      return { processed: 0, status: 'error', error: error.message };
    }
  },

  async requeueJob(jobId, reason) {
    await db.runTransaction(async (transaction) => {
      // READS FIRST
      const jobDoc = await transaction.get(this.queueRef.doc(jobId));
      const counterDoc = await transaction.get(ActiveJobsService.counterRef);
      
      if (!jobDoc.exists) return;
      
      // Get current values from reads
      const currentRetries = jobDoc.data().retryCount || 0;
      const currentCount = counterDoc.exists ? counterDoc.data().count : 0;
      
      // WRITES AFTER ALL READS
      transaction.update(this.queueRef.doc(jobId), {
        status: 'pending',
        retryCount: FieldValue.increment(1),
        lastError: reason,
        lastAttempt: FieldValue.serverTimestamp(),
        nextRetryAt: FieldValue.serverTimestamp()
      });
  
      if (currentCount > 0) {
        transaction.update(ActiveJobsService.counterRef, {
          count: currentCount - 1
        });
      }
    });
  },

  async deleteQueueJob(jobId) {
    if (!jobId) return;
    try {
      await this.queueRef.doc(jobId).delete();
    } catch (error) {
      functions.logger.error('Failed to delete queue job:', {
        jobId,
        error: error.message
      });
    }
  },

  async handleJobFailure(jobId, errorMessage, shouldRequeue = false) {
    try {
      if (shouldRequeue) {
        await this.requeueJob(jobId, errorMessage);
      } else {
        await db.runTransaction(async (transaction) => {
          // READS FIRST
          const jobDoc = await transaction.get(this.queueRef.doc(jobId));
          const counterDoc = await transaction.get(ActiveJobsService.counterRef);
          
          if (!jobDoc.exists) return;
  
          // Get current values from reads
          const currentCount = counterDoc.exists ? counterDoc.data().count : 0;
  
          // Log current state
          functions.logger.info('Handling job failure - current counter:', {
            jobId,
            currentCount,
            willDecrement: currentCount > 0,
            errorMessage
          });
  
          // WRITES AFTER ALL READS
          transaction.update(this.queueRef.doc(jobId), {
            status: 'error',
            lastError: errorMessage,
            retryCount: FieldValue.increment(1),
            lastAttempt: FieldValue.serverTimestamp()
          });
  
          if (currentCount > 0) {
            transaction.update(ActiveJobsService.counterRef, {
              count: currentCount - 1
            });
            
            functions.logger.info('Decremented counter for failed job:', {
              jobId,
              oldCount: currentCount,
              newCount: currentCount - 1
            });
          }
        });
      }
    } catch (error) {
      functions.logger.error('Failed to handle job failure:', {
        jobId,
        error: error.message,
        stack: error.stack
      });
    }
  }
};

module.exports = {
    JobQueueService,
    ActiveJobsService
  };