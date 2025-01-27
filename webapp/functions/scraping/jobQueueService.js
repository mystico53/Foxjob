const functions = require('firebase-functions');
const { FieldValue } = require("firebase-admin/firestore");
const admin = require('firebase-admin');
const OxylabsService = require('./OxylabsService');

const db = admin.firestore();


const ActiveJobsService = {
  // Collection references
  activeJobsRef: db.collection('activeJobs'),
  counterRef: db.collection('activeJobs').doc('counter'),

  // Initialize counter if it doesn't exist
  async decrementCounter() {
    return await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(this.counterRef);
      const currentCount = counterDoc.exists ? counterDoc.data().count : 0;
      
      if (currentCount > 0) {
        transaction.update(this.counterRef, {
          count: currentCount - 1
        });
      }
      
      return { success: true, newCount: Math.max(0, currentCount - 1) };
    });
  },

  // Modify initializeCounter to use transaction
  async initializeCounter() {
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(this.counterRef);
      if (!doc.exists) {
        transaction.set(this.counterRef, { count: 0 });
      }
      return true;
    });
  },

  // Add a new active job with transaction
  async addActiveJob(oxylabsId, jobType, metadata = {}) {
    if (!oxylabsId) {
      throw new Error('oxylabsId is required');
    }

    try {
      const counterDoc = await this.counterRef.get();
      const currentCount = counterDoc.exists ? counterDoc.data().count : 0;

      // Increase limit for search jobs
      const maxJobs = jobType === 'search' ? 13 : 12;  // Increased from 2

      if (currentCount >= maxJobs) {
        throw new Error('Max concurrent jobs reached');
      }

      // Use transaction for atomic update
      await db.runTransaction(async (transaction) => {
        transaction.set(this.counterRef, { count: currentCount + 1 }, { merge: true });
        transaction.set(this.activeJobsRef.doc(oxylabsId), {
          startedAt: FieldValue.serverTimestamp(),
          type: jobType,
          status: 'running',
          ...metadata,
          lastUpdated: FieldValue.serverTimestamp()
        });
      });

      return { success: true, currentCount: currentCount + 1 };
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

        // Delete active job
        transaction.delete(this.activeJobsRef.doc(oxylabsId));
        
        // Update counter
        transaction.update(this.counterRef, {
          count: FieldValue.increment(-1)
        });

        return { 
          success: true,
          originalJobId: jobDoc.data().originalJobId // Return this so caller can delete queue job if needed
        };
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

const JobQueueService = {
  queueRef: db.collection('jobQueue'),

  async addToQueue(jobId, metadata = {}) {
    try {
      await this.queueRef.doc(jobId).set({
        jobId,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        retryCount: 0,
        ...metadata
      }, { merge: true });

      functions.logger.info('Added job to queue:', {
        jobId,
        metadata
      });

      return { success: true };
    } catch (error) {
      functions.logger.error('Failed to add job to queue:', {
        jobId,
        error: error.message
      });
      throw error;
    }
  },

  async processQueue() {
    try {
      // Stage 1: Get jobs to process
      const getJobsResult = await db.runTransaction(async (transaction) => {
        // READS FIRST
        const counterDoc = await transaction.get(ActiveJobsService.counterRef);
        const currentCount = counterDoc.exists ? counterDoc.data().count : 0;
        
        functions.logger.info('Current active jobs count:', { 
          currentCount,
          counterExists: counterDoc.exists,
          counterData: counterDoc.data()
        });
        
        const availableSlots = 13 - currentCount;
        functions.logger.info('Available slots:', { 
          availableSlots,
          maxJobs: 13,
          currentCount 
        });

        if (availableSlots <= 0) {
          functions.logger.warn('No slots available:', {
            currentCount,
            maxJobs: 13,
            availableSlots
          });
          return { processed: 0, status: 'no_slots_available' };
        }

        const queueSnapshot = await transaction.get(
          this.queueRef
            .where('status', '==', 'pending')
            .orderBy('createdAt')
            .limit(availableSlots)
        );

        if (queueSnapshot.empty) {
          return { processed: 0, status: 'no_pending_jobs' };
        }

        const jobsToProcess = queueSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }));

        // WRITES AFTER ALL READS
        // Update counter
        transaction.update(ActiveJobsService.counterRef, {
          count: currentCount + jobsToProcess.length
        });

        // Mark jobs as processing
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

      // Early return if no jobs to process
      if (!getJobsResult.jobsToProcess?.length) {
        return getJobsResult;
      }

      // Stage 2: Process jobs sequentially with retries
      const processResults = [];
      for (const job of getJobsResult.jobsToProcess) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          let retryCount = 0;
          let success = false;
          let lastError = null;
          let oxylabsId = null;

          // Retry loop for network issues
          while (retryCount < 3 && !success) {
            try {
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