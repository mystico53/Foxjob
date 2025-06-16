// batchProcessing.js
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { FieldValue } = require('firebase-admin/firestore');
const { onCall } = require("firebase-functions/v2/https");
const config = require('../config'); // Import config for environment check

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Function to trigger email sending through a Firestore document
async function triggerEmailSending(userId, batchId) {
  try {
    logger.info('Preparing to send email for user', { userId, batchId });
    
    // Get user information if needed
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const userEmail = userData.email || null;
    
    // Add logging to check email retrieval
    logger.info('User email retrieval status', { 
      userId, 
      emailFound: Boolean(userEmail),
      emailValue: userEmail || 'Not found'
    });
    
    // Create an email request document reference before the transaction
    const emailRequestRef = db.collection('emailRequests').doc();
    const emailRequestId = emailRequestRef.id;
    
    // IMPORTANT: Create a transaction to ensure consistency
    await db.runTransaction(async (transaction) => {
      // First check if the batch still needs an email
      const batchRef = db.collection('jobBatches').doc(batchId);
      const batchDoc = await transaction.get(batchRef);
      
      if (!batchDoc.exists) {
        throw new Error(`Batch ${batchId} not found`);
      }
      
      const batchData = batchDoc.data();
      
      // If email already sent (and has an ID), don't send again
      if (batchData.emailRequestId) {
        logger.info('Email already sent for this batch', { 
          batchId, 
          emailRequestId: batchData.emailRequestId 
        });
        return;
      }
      
      // Store the new email document in the transaction
      transaction.set(emailRequestRef, {
        userId: userId,
        batchId: batchId, // Explicitly set the batchId field for easier querying
        to: userEmail,
        subject: 'Your Top Job Matches Are Ready!',
        text: 'We\'ve analyzed your job matches and found some great opportunities for you.',
        html: '<p>We\'ve analyzed your job matches and found some great opportunities for you.</p><p>Check out your top matches below:</p>',
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        // Add metadata for better tracking
        metadata: {
          batchId: batchId,
          batchStatus: batchData.status,
          totalJobs: batchData.totalJobs || 0,
          completedJobs: batchData.completedJobs || 0
        }
      });
      
      // Update the batch with the email request ID in the same transaction
      transaction.update(batchRef, {
        emailRequestId: emailRequestId,
        emailRequestCreatedAt: FieldValue.serverTimestamp(),
        emailSent: true // Mark as sent since we're creating the request
      });
      
      logger.info('Created email request and updated batch in transaction', {
        batchId,
        emailRequestId: emailRequestId
      });
    });
    
    // Add logging to confirm success
    logger.info('Email request created with recipient in transaction', { 
      userId, 
      requestId: emailRequestId,
      batchId: batchId || 'No batch ID provided',
      recipientEmail: userEmail || 'NULL - fallback will be used'
    });
    
    return {
      success: true,
      emailRequestId: emailRequestId
    };
  } catch (error) {
    logger.error('Failed to trigger email function', { 
      userId, 
      batchId: batchId || 'No batch ID provided',
      error: error.message,
      stack: error.stack 
    });
    return {
      success: false,
      error: error.message
    };
  }
}

// Firestore trigger to check for batch completion
exports.onBatchUpdate = onDocumentUpdated("jobBatches/{batchId}", async (event) => {
  try {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    const batchId = event.params.batchId;
    
    logger.info('Batch updated', { 
      batchId,
      completedJobs: afterData.completedJobs,
      totalJobs: afterData.totalJobs,
      status: afterData.status,
      emailSent: afterData.emailSent || false,
      emailRequestId: afterData.emailRequestId || 'none'
    });
    
    // If the batch already has an emailRequestId, we don't need to trigger again
    if (afterData.emailRequestId) {
      logger.info('Batch already has an emailRequestId, skipping email processing', { 
        batchId, 
        emailRequestId: afterData.emailRequestId 
      });
      return;
    }
    
    // Check if batch just completed and email hasn't been sent
    if (afterData.completedJobs >= afterData.totalJobs && 
        beforeData.completedJobs < afterData.totalJobs &&
        !afterData.emailSent) {
      
      logger.info('Batch completed, preparing to send email', { batchId });
      
      // Trigger email sending first
      const userId = afterData.userId;
      if (!userId) {
        logger.error('Cannot send email for batch without userId', { batchId });
        return;
      }
      
      const emailResult = await triggerEmailSending(userId, batchId);
      
      logger.info('Email sending attempt completed', { 
        batchId,
        success: emailResult.success,
        emailRequestId: emailResult.emailRequestId || 'Unknown'
      });
      
      // Only mark as complete and emailSent if we got an emailRequestId
      if (emailResult.success && emailResult.emailRequestId) {
        await event.data.after.ref.update({
          status: 'complete',
          emailSent: true,
          emailRequestId: emailResult.emailRequestId,
          completedAt: FieldValue.serverTimestamp()
        });
      } else {
        logger.error('Failed to create email request for completed batch', { batchId });
      }
    }
    // Handle case where batch is already marked as complete or timeout, but doesn't have emailSent
    else if ((afterData.status === 'complete' || afterData.status === 'timeout') && 
             !beforeData.emailSent && 
             afterData.emailSent) {
      
      logger.info('Batch marked as complete/timeout with emailSent=true, sending email', { batchId });
      
      // Trigger email sending
      const userId = afterData.userId;
      if (!userId) {
        logger.error('Cannot send email for batch without userId', { batchId });
        return;
      }
      
      const emailResult = await triggerEmailSending(userId, batchId);
      
      logger.info('Email sending attempt completed for already complete/timeout batch', { 
        batchId,
        success: emailResult.success,
        emailRequestId: emailResult.emailRequestId || 'Unknown'
      });
      
      // If we get an emailRequestId back, update the batch to add it if it's not already set
      if (emailResult.success && emailResult.emailRequestId) {
        // Use get() to ensure we have the latest data
        const batchSnapshot = await event.data.after.ref.get();
        if (batchSnapshot.exists && !batchSnapshot.data().emailRequestId) {
          await event.data.after.ref.update({
            emailRequestId: emailResult.emailRequestId
          });
          logger.info('Updated batch with emailRequestId after successful email sending', {
            batchId,
            emailRequestId: emailResult.emailRequestId
          });
        }
      }
    }
  } catch (error) {
    logger.error('Error in onBatchUpdate', {
      error: error.message,
      stack: error.stack,
      batchId: event.params.batchId
    });
  }
});

// Scheduled function to handle stale batches
exports.processStaleJobBatches = onSchedule("every 5 minutes", async (event) => {
  try {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 10); // 10 min timeout
    
    logger.info('Checking for stale job batches', { cutoffTimestamp: cutoffTime.toISOString() });
    
    const staleQuery = await db.collection('jobBatches')
      .where('status', '==', 'processing')
      .where('startedAt', '<', cutoffTime)
      .where('emailSent', '==', false)
      .get();
    
    logger.info(`Found ${staleQuery.size} stale batches`);
    
    for (const doc of staleQuery.docs) {
      try {
        const data = doc.data();
        const batchId = doc.id;
        
        // Skip if it already has an emailRequestId
        if (data.emailRequestId) {
          logger.info('Stale batch already has an emailRequestId, skipping', {
            batchId,
            emailRequestId: data.emailRequestId
          });
          continue;
        }
        
        logger.warn('Processing stale batch', { 
          batchId, 
          userId: data.userId,
          progress: `${data.completedJobs}/${data.totalJobs}`
        });
        
        // Make sure we have a userId
        if (!data.userId) {
          logger.error('Cannot process stale batch without userId', { batchId });
          continue;
        }
        
        // Mark as timed out
        await doc.ref.update({
          status: 'timeout',
          emailSent: true,
          completedAt: FieldValue.serverTimestamp(),
          note: `Timed out after 10 minutes. Processed ${data.completedJobs}/${data.totalJobs} jobs.`
        });
        
        // Send email anyway with whatever jobs have been processed
        const emailResult = await triggerEmailSending(data.userId, batchId);
        
        logger.info('Timeout email sending attempt completed', {
          batchId,
          success: emailResult.success,
          emailRequestId: emailResult.emailRequestId || 'Unknown'
        });
        
        // If we get an emailRequestId back, update the batch
        if (emailResult.success && emailResult.emailRequestId) {
          // Get latest data
          const updatedBatch = await doc.ref.get();
          if (updatedBatch.exists && !updatedBatch.data().emailRequestId) {
            await doc.ref.update({
              emailRequestId: emailResult.emailRequestId
            });
            logger.info('Updated stale batch with emailRequestId after successful email sending', {
              batchId,
              emailRequestId: emailResult.emailRequestId
            });
          }
        }
      } catch (batchError) {
        logger.error('Error processing individual stale batch', {
          batchId: doc.id,
          error: batchError.message,
          stack: batchError.stack
        });
        // Continue with other batches even if one fails
      }
    }
    
    logger.info('Stale batch processing completed');
  } catch (error) {
    logger.error('Error in processStaleJobBatches', {
      error: error.message,
      stack: error.stack
    });
  }
});

exports.fixMissingEmailRequests = onCall({
  memory: '256MiB',
}, async (request) => {
  try {
    // Check if user is admin based on auth claims
    const uid = request.auth?.uid;
    if (!uid) {
      throw new Error('Authentication required');
    }
    
    // Check for admin claim in the token
    const token = request.auth?.token;
    logger.info('Checking admin claims:', {
      uid,
      hasToken: !!token,
      claims: token ? JSON.stringify(token) : 'none'
    });

    // For development/staging: Also allow a specific user ID as fallback
    // This is a temporary workaround - remove for production
    const allowedTestUserId = 'VCvUK0pLeDVXJ0JHJsNBwxLgvdO2'; // Your specific user ID

    // Either admin claim, superadmin claim, or specific test user should work
    const isAdmin = !!(
      (token && (token.admin === true || token.superadmin === true)) ||
      (config.environment !== 'production' && uid === allowedTestUserId)
    );

    if (!isAdmin) {
      // Log detailed information for debugging
      logger.warn('User does not have admin privileges:', {
        uid,
        claims: token ? JSON.stringify(token) : 'none'
      });
      throw new Error('Admin privileges required');
    }
    
    logger.info('Admin privileges confirmed for user:', { uid });
    
    // Get all batches with emailSent=true but no emailRequestId
    const batchesQuery = await db.collection('jobBatches')
      .where('emailSent', '==', true)
      .get();
    
    const missingBatches = [];
    batchesQuery.forEach(doc => {
      const data = doc.data();
      if (!data.emailRequestId) {
        missingBatches.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    logger.info(`Found ${missingBatches.length} batches with missing email requests to fix`);
    
    if (missingBatches.length === 0) {
      return { 
        success: true, 
        fixed: 0,
        message: 'No batches with missing email requests found.'
      };
    }
    
    let fixedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const batch of missingBatches) {
      try {
        // Create a new email request document for this batch
        const userId = batch.userId;
        const batchId = batch.id;
        
        if (!userId) {
          logger.warn(`Batch ${batchId} has no userId, skipping`);
          errors.push({
            batchId,
            error: 'No userId found'
          });
          errorCount++;
          continue;
        }
        
        logger.info(`Creating email request for batch ${batchId}, user ${userId}`);
        
        // Get user's email
        let userEmail = null;
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) {
            userEmail = userDoc.data().email;
            logger.info(`Found user email: ${userEmail}`);
          } else {
            logger.warn(`User document not found for ${userId}`);
          }
        } catch (userErr) {
          logger.error(`Error fetching user data for batch ${batchId}:`, userErr);
        }
        
        // Create email request
        const emailRequestRef = db.collection('emailRequests').doc();
        const emailRequestData = {
          userId: userId,
          batchId: batchId,
          to: userEmail,
          subject: 'Your Top Job Matches Are Ready!',
          text: 'We\'ve analyzed your job matches and found some great opportunities for you.',
          html: '<p>We\'ve analyzed your job matches and found some great opportunities for you.</p><p>Check out your top matches below:</p>',
          status: 'sent', // Assume it was already sent since emailSent is true
          createdAt: batch.completedAt || batch.startedAt || admin.firestore.FieldValue.serverTimestamp(),
          sentAt: batch.completedAt || batch.startedAt || admin.firestore.FieldValue.serverTimestamp(),
          opened: false,
          openCount: 0,
          clicked: false,
          clickCount: 0,
          processed: true,
          delivered: true
        };
        
        logger.info(`Creating email request document with data for batch ${batchId}`);
        await emailRequestRef.set(emailRequestData);
        
        // Update the batch record with the email request ID
        const updateData = {
          emailRequestId: emailRequestRef.id
        };
        logger.info(`Updating batch ${batchId} with emailRequestId: ${emailRequestRef.id}`);
        await db.collection('jobBatches').doc(batchId).update(updateData);
        
        logger.info(`Successfully created email request ${emailRequestRef.id} for batch ${batchId}`);
        fixedCount++;
      } catch (err) {
        logger.error(`Error fixing email request for batch ${batch.id}:`, err);
        errors.push({
          batchId: batch.id,
          error: err.message
        });
        errorCount++;
      }
    }
    
    return {
      success: true,
      total: missingBatches.length,
      fixed: fixedCount,
      errors: errorCount,
      errorDetails: errors
    };
  } catch (error) {
    logger.error('Error in fixMissingEmailRequests:', error);
    return {
      success: false,
      error: error.message
    };
  }
});