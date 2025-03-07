// batchProcessing.js
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Function to trigger email sending through a Firestore document
async function triggerEmailSending(userId) {
  try {
    logger.info('Preparing to send email for user', { userId });
    
    // Get user information if needed
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const userEmail = userData.email || null;
    
    // Create an email request document
    const emailRequestRef = db.collection('emailRequests').doc();
    await emailRequestRef.set({
      userId: userId,
      to: userEmail,
      subject: 'Your Top Job Matches Are Ready!',
      text: 'We\'ve analyzed your job matches and found some great opportunities for you.',
      html: '<p>We\'ve analyzed your job matches and found some great opportunities for you.</p><p>Check out your top matches below:</p>',
      status: 'pending',
      createdAt: FieldValue.serverTimestamp()
    });
    
    logger.info('Email request created successfully', { 
      userId, 
      requestId: emailRequestRef.id
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to trigger email function', { 
      userId, 
      error: error.message,
      stack: error.stack 
    });
    return false;
  }
}

// Firestore trigger to check for batch completion
exports.onBatchUpdate = onDocumentUpdated("jobBatches/{batchId}", async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  
  logger.info('Batch updated', { 
    batchId: event.params.batchId,
    completedJobs: afterData.completedJobs,
    totalJobs: afterData.totalJobs,
    status: afterData.status 
  });
  
  // Check if batch just completed and email hasn't been sent
  if (afterData.completedJobs >= afterData.totalJobs && 
      beforeData.completedJobs < afterData.totalJobs &&
      !afterData.emailSent) {
    
    logger.info('Batch completed, preparing to send email', { batchId: event.params.batchId });
    
    // Mark batch as complete first to prevent duplicate emails
    await event.data.after.ref.update({
      status: 'complete',
      emailSent: true,
      completedAt: FieldValue.serverTimestamp()
    });
    
    // Trigger email sending
    const userId = afterData.userId;
    const emailResult = await triggerEmailSending(userId);
    
    logger.info('Email sending attempt completed', { 
      batchId: event.params.batchId,
      success: emailResult
    });
  }
});

// Scheduled function to handle stale batches
exports.processStaleJobBatches = onSchedule("every 5 minutes", async (event) => {
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
    const data = doc.data();
    logger.warn('Processing stale batch', { 
      batchId: doc.id, 
      userId: data.userId,
      progress: `${data.completedJobs}/${data.totalJobs}`
    });
    
    // Mark as timed out
    await doc.ref.update({
      status: 'timeout',
      emailSent: true,
      completedAt: FieldValue.serverTimestamp(),
      note: `Timed out after 10 minutes. Processed ${data.completedJobs}/${data.totalJobs} jobs.`
    });
    
    // Send email anyway with whatever jobs have been processed
    const emailResult = await triggerEmailSending(data.userId);
    
    logger.info('Timeout email sending completed', {
      batchId: doc.id,
      success: emailResult
    });
  }
});