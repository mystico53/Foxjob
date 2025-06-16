// emailProcessor.js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const sgMail = require('@sendgrid/mail');
const { FieldValue } = require('firebase-admin/firestore');
const { defineSecret } = require("firebase-functions/params");
const config = require('../config'); // Import the config module from parent directory

// Initialize if needed
if (!admin.apps.length) {
  admin.initializeApp();
  console.log('Firebase initialized');
} else {
  console.log('Firebase already initialized');
}
const db = admin.firestore();

const sendgridApiKey = defineSecret("SENDGRID_API_KEY");

// Process email requests
exports.processEmailRequests = onDocumentCreated({
  document: "emailRequests/{requestId}",
  secrets: [sendgridApiKey]
}, async (event) => {
    const emailData = event.data.data();
    const requestId = event.params.requestId;
    
    // Skip if already processed
    if (emailData.status !== 'pending') {
      logger.info('Skipping non-pending email request', { 
        requestId: requestId,
        status: emailData.status
      });
      return;
    }
    
    try {
      logger.info('Processing email request', { 
        requestId: requestId,
        userId: emailData.userId,
        batchId: emailData.batchId 
      });
      
      // Set the SendGrid API Key
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const uid = emailData.userId;
      let jobsHtml = '';
      let jobsText = '';
      let hasJobsToSend = false; // Flag to track if we have jobs to send
      let userFirstName = 'there'; // Default greeting if name can't be found
      let totalJobsCount = 0; // Will store the total jobs count from batch document
      
      // Get user's display name if we have a user ID
      if (uid) {
        try {
          // Fetch the user document to get the user's display name
          const userDoc = await db.collection('users').doc(uid).get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.displayName) {
              // Extract first name from display name
              const displayNameParts = userData.displayName.split(' ');
              userFirstName = displayNameParts[0]; // Get the first part as first name
              logger.info(`Retrieved user's first name: ${userFirstName}`);
            } else {
              logger.info('User document exists but no display name found');
            }
          } else {
            logger.info(`No user document found for user ID: ${uid}`);
          }
        } catch (error) {
          logger.error('Error fetching user document:', error);
          // Continue with default greeting
        }
        
        // Get totalJobs count from batch if batchId is provided
        if (emailData.batchId) {
          try {
            const batchRef = db.collection('jobBatches').doc(emailData.batchId);
            const batchDoc = await batchRef.get();
            
            if (batchDoc.exists) {
              const batchData = batchDoc.data();
              // Extract totalJobs count from the batch document
              totalJobsCount = batchData.totalJobs || 0;
              logger.info(`Retrieved totalJobs count from batch: ${totalJobsCount}`);
              
              // Ensure the batch has this email request ID
              if (!batchData.emailRequestId || batchData.emailRequestId !== requestId) {
                logger.info(`Updating batch with email request ID: ${requestId}`);
                await batchRef.update({
                  emailRequestId: requestId,
                  emailRequestUpdatedAt: FieldValue.serverTimestamp()
                });
              }
            } else {
              logger.warn(`No batch document found for batch ID: ${emailData.batchId}`);
            }
          } catch (error) {
            logger.error('Error fetching batch document:', error);
            // Continue with default total jobs count
          }
        }
        
        // Check if this is an empty search notification
        const isEmptySearchNotification = emailData.metadata?.type === 'empty_search_notification';
        
        if (isEmptySearchNotification) {
          // For empty search notifications, use the provided HTML and text content
          jobsHtml = emailData.html || '';
          jobsText = emailData.text || '';
          hasJobsToSend = true; // We always want to send empty search notifications
          logger.info('Processing empty search notification email');
        } else {
          // Regular job email processing
          try {
            logger.info(`Starting Firestore query for user: ${uid}`);
            
            // Check if the collection exists
            const jobsRef = db.collection('users').doc(uid).collection('scrapedJobs');
            const snapshot = await jobsRef.limit(1).get();
            
            if (snapshot.empty) {
              logger.info(`No jobs found in collection for user ${uid}`);
            } else {
              logger.info('Jobs collection exists, proceeding with query');
              
              // Calculate the timestamp for 24 hours ago
              const twentyFourHoursAgo = new Date();
              twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
              
              logger.info(`Filtering jobs newer than: ${twentyFourHoursAgo.toISOString()}`);
              
              // Get the search query to retrieve the minimum score threshold
              let minimumScore = 0; // Default to 0 if no threshold is found
              
              if (emailData.searchId) {
                try {
                  // Get the search query document if we have a searchId
                  const searchQueryRef = db.collection('users').doc(uid).collection('searchQueries').doc(emailData.searchId);
                  const searchQueryDoc = await searchQueryRef.get();
                  
                  if (searchQueryDoc.exists) {
                    // Get the minimumScore from the search query document (default to 0 if not set)
                    minimumScore = searchQueryDoc.data().minimumScore || 0;
                    logger.info(`Retrieved minimum score threshold for search query: ${minimumScore}`, {
                      userId: uid,
                      searchId: emailData.searchId
                    });
                  }
                } catch (error) {
                  logger.error('Error retrieving search query document:', error);
                  // Continue with default minimumScore
                }
              } else if (emailData.batchId) {
                // If we have a batchId but no searchId, try to get the searchId from the batch
                try {
                  const batchRef = db.collection('jobBatches').doc(emailData.batchId);
                  const batchDoc = await batchRef.get();
                  
                  if (batchDoc.exists && batchDoc.data().searchId) {
                    const searchId = batchDoc.data().searchId;
                    const searchQueryRef = db.collection('users').doc(uid).collection('searchQueries').doc(searchId);
                    const searchQueryDoc = await searchQueryRef.get();
                    
                    if (searchQueryDoc.exists) {
                      // Get the minimumScore from the search query document
                      minimumScore = searchQueryDoc.data().minimumScore || 0;
                      logger.info(`Retrieved minimum score threshold from batch's search query: ${minimumScore}`, {
                        userId: uid,
                        batchId: emailData.batchId,
                        searchId: searchId
                      });
                    }
                  }
                } catch (error) {
                  logger.error('Error retrieving batch document or associated search query:', error);
                  // Continue with default minimumScore
                }
              }
              
              logger.info(`Using minimum score threshold of ${minimumScore} for filtering jobs`);
              
              // Query Firestore for all jobs from last 24 hours with a score >= minimumScore
              const jobsSnapshot = await jobsRef
                .where('match.final_score', '>=', minimumScore)
                .where('searchMetadata.snapshotDate', '>=', twentyFourHoursAgo.toISOString())
                .orderBy('searchMetadata.snapshotDate', 'desc')
                .get();

              logger.info(`Query returned ${jobsSnapshot.size} documents after filtering with minimum score ${minimumScore}`);
              
              // If we didn't get totalJobs from a batch, use the snapshot size as a fallback
              if (totalJobsCount === 0) {
                totalJobsCount = jobsSnapshot.size;
                logger.info(`Using query result count for totalJobs: ${totalJobsCount}`);
              }

              if (jobsSnapshot.empty) {
                logger.info('No jobs with scores above threshold found');
                // We won't set hasJobsToSend to true since no jobs were found
              } else {
                // Convert to array for in-memory sorting
                const allRecentJobs = [];
                jobsSnapshot.forEach(doc => {
                  allRecentJobs.push({ id: doc.id, doc: doc });
                });
                
                // Sort by final_score (highest first)
                allRecentJobs.sort((a, b) => {
                  const scoreA = a.doc.data().match?.final_score || 0;
                  const scoreB = b.doc.data().match?.final_score || 0;
                  return scoreB - scoreA;
                });
                
                // Take only the top 5
                const topJobs = allRecentJobs.slice(0, 5);
                
                logger.info(`Sorted jobs by score, top 5 selected out of ${allRecentJobs.length}`);
                
                if (topJobs.length > 0) {
                  hasJobsToSend = true; // We have jobs to send
                  
                  // Add header for jobs section
                  jobsHtml = `
                    <div style="margin-top: 30px; padding-top: 20px;">
                    </div>
                  `;
                  
                  jobsText = "\n\n===== YOUR PERSONALIZED JOB MATCHES =====\n\n";
                  
                  // Determine base URL based on environment
                  let baseUrl;
                  if (config.environment === 'production') {
                    baseUrl = 'https://foxjob.io/workflow/';
                    logger.info('Using production job URL format');
                  } else if (config.environment === 'staging') {
                    baseUrl = 'https://jobille-45494.web.app/workflow/';
                    logger.info('Using staging job URL format');
                  } else if (config.environment === 'development') {
                    baseUrl = 'http://localhost:5000/workflow/';
                    logger.info('Using development job URL format');
                  } else {
                    // Default to staging as fallback
                    baseUrl = 'https://jobille-45494.web.app/workflow/';
                    logger.info('Using staging job URL format as fallback');
                  }
                  
                  // Format the jobs for the email
                  topJobs.forEach((job, index) => {
                    const doc = job.doc;
                    logger.info(`Processing job ${index + 1} with ID ${doc.id}, score: ${doc.data().match?.final_score || 'N/A'}`);
                    const jobData = doc.data();
                    
                    // Get score from either location
                    const score = jobData.match?.final_score || jobData.match?.finalScore || 'N/A';
                    const title = jobData.basicInfo?.title || 'Untitled Position';
                    const company = jobData.basicInfo?.company || 'Unnamed Company';
                    
                    // Get the new summary fields
                    const description = jobData.match?.summary?.short_description || 'No company description available';
                    const responsibility = jobData.match?.summary?.short_responsibility || 'No responsibility description available';
                    const gaps = jobData.match?.summary?.short_gaps || 'No gaps information available';
                    const preferenceScore = jobData.match?.preferenceScore?.score || 'N/A';
                    const preferenceExplanation = jobData.match?.preferenceScore?.explanation || 'No preference data available';
                    
                    // Create job URL using document ID
                    const jobUrl = `${baseUrl}${doc.id}`;
                    logger.info(`Job URL: ${jobUrl}`);
                    
                    logger.info(`Job: ${title} at ${company} - Score: ${score}`);
                    
                    // Add to HTML version with improved styling
                    jobsHtml += `
                    <div style="margin-bottom: 20px; padding: 18px; border-radius: 8px; background-color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #eee; position: relative;">
                      <!-- Left accent border using single color -->
                      <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #FF9C00;"></div>
                      
                      <!-- Job title and company with padding for the accent border -->
                      <h3 style="color: #222; font-size: 17px; font-weight: 600; margin: 0 0 5px 8px;">${title}</h3>
                      <div style="color: #555; font-size: 15px; font-weight: 500; margin: 0 0 15px 8px;">${company}</div>
                      
                      <!-- Preference explanation in a styled quote box -->
                      <div style="font-style: italic; color: #666; margin: 12px 0; padding: 10px; background-color: #f9f9f9; border-radius: 4px; border-left: 2px solid #FF9C00;">
                        "${preferenceExplanation}"
                      </div>
                      
                      <!-- Match score with visual bar -->
                      <div style="margin: 12px 0; display: flex; align-items: center; flex-wrap: wrap;">
                        <div style="font-size: 14px; font-weight: 600; color: #555; margin-right: 10px; min-width: 90px;">Match Score:</div>
                        <div style="flex-grow: 1; height: 8px; background-color: #f0f0f0; border-radius: 4px; overflow: hidden; margin: 0 10px 0 0;">
                          <div style="height: 100%; border-radius: 4px; background: #FF9C00; width: ${Math.min(Math.max(parseFloat(score) || 0, 0), 100)}%;"></div>
                        </div>
                        <div style="font-size: 14px; font-weight: 600; color: #222;">${score}%</div>
                      </div>
                      
                      <!-- Job information with consistent styling -->
                      <div style="margin: 12px 0 0 8px;">
                        <div style="font-size: 14px; font-weight: 600; color: #444; margin-bottom: 2px;">Company:</div>
                        <div style="font-size: 14px; color: #555; margin: 0 0 12px 0;">${description}</div>
                        
                        <div style="font-size: 14px; font-weight: 600; color: #444; margin-bottom: 2px;">Your Role:</div>
                        <div style="font-size: 14px; color: #555; margin: 0 0 12px 0;">${responsibility}</div>
                        
                        <div style="font-size: 14px; font-weight: 600; color: #444; margin-bottom: 2px;">Gap Analysis:</div>
                        <div style="font-size: 14px; color: #555; margin: 0 0 12px 0;">${gaps}</div>
                      </div>
                      
                      <!-- Single color button with better styling -->
                      <a href="${jobUrl}" style="display: inline-block; padding: 10px 20px; background: #FF9C00; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; margin-top: 6px; text-align: center;">View Job</a>
                    </div>
                  `;

                  // Also update the text version
                  jobsText += `
                  ${title} at ${company}
                  "${preferenceExplanation}"

                  Match Score: ${score}
                  Company: ${description}
                  Your Role: ${responsibility} 
                  Gap Analysis: ${gaps}
                  View Job: ${jobUrl}

                  ----------------------------------------

                  `;
                  });
                  
                  // Close the jobs HTML section
                  jobsHtml += '</div>';
                  
                  logger.info('Job data formatting complete');
                }
              }
            }
          } catch (error) {
            logger.error('Error fetching job data:', error.message);
            logger.error('Error stack:', error.stack);
          }
        }
      } else {
        logger.info('No user ID available, skipping job data fetch');
      }
      
      // Check if we have jobs to send
      if (!hasJobsToSend) {
        // If no jobs above threshold were found, update status and exit
        logger.info('No jobs above threshold found, skipping email send');
        await event.data.ref.update({
          status: 'skipped',
          reason: 'no_jobs_above_threshold',
          updatedAt: FieldValue.serverTimestamp(),
          // Include batchId if it exists in the email data
          ...(emailData.batchId && { batchId: emailData.batchId })
        });
        return; // Exit the function
      }
      
      // Original HTML and text from the request are in emailData
      const originalHtml = emailData.html || '<p>This is an email from Foxjob.</p>';
      const originalText = emailData.text || 'This is an email from Foxjob.';
      
      // Add invisible tracking pixel to the email
      const trackingPixel = `<img src="https://foxjob.io/track-email/${requestId}.png" width="1" height="1" alt="" style="display:none">`;
      
      // Construct the final email content with improved email wrapper
      const finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${emailData.subject || 'Email from Foxjob'}</title>
          <style>
            * { transition: none !important; animation: none !important; }
            a:hover { color: inherit !important; background-color: inherit !important; }
            @import url('https://fonts.googleapis.com/css2?family=Lalezar&display=swap');
            .foxjob-title {
              font-family: 'Lalezar', cursive;
              font-size: 32px;
              line-height: 1;
              letter-spacing: 0.02em;
              color: #FF9C00;
              text-transform: uppercase;
              font-weight: 900;
            }
          </style>
          <!--[if mso]>
          <style type="text/css">
            .fallback-font {
              font-family: Arial, sans-serif !important;
            }
          </style>
          <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
          <!-- Email Container -->
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <!-- Email Header -->
            <div style="text-align: center; padding: 24px 20px;">
              <div style="display: inline-flex; align-items: center; justify-content: center;">
                <img src="https://foxjob.io/images/icon128.png" alt="Foxjob" style="width: 96px; height: 96px;">
              </div>
            </div>
            
            <!-- Email Content -->
            <div style="padding: 20px;">
              ${isEmptySearchNotification ? '' : `
              <!-- Personalized greeting with total jobs count -->
              <div style="padding-bottom: 20px;">
                <h2 style="color: #222; font-size: 20px; font-weight: 600; margin: 0 0 15px 0;">Hello ${userFirstName},</h2>
                <p>We have matched you with ${totalJobsCount} jobs today. These are our top picks:</p>
              </div>
              `}
              
              <!-- Job listings section -->
              ${jobsHtml}
            </div>
            
            <!-- Email Footer -->
            <div style="margin-top: 30px; padding: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #666;">
              <p>© ${new Date().getFullYear()} Foxjob. All rights reserved.</p>
              <p><a href="https://www.foxjob.io/unsubscribe" style="color: #555; text-decoration: none;">Unsubscribe</a> | <a href="https://www.foxjob.io/preferences" style="color: #555; text-decoration: none;">Email Preferences</a></p>
              ${trackingPixel}
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Add personalized greeting with total jobs count to the text version as well
      const finalText = isEmptySearchNotification ? jobsText : `Hello ${userFirstName},

We have matched you with ${totalJobsCount} jobs today. These are our top picks:

${jobsText}`;
      
      logger.info('Email content prepared. Jobs data added:', jobsHtml.length > 0 ? 'Yes' : 'No');
      
      // Construct the message with jobs appended and tracking parameters
      const msg = {
        to: emailData.to || 'konkaiser@gmail.com',
        from: 'jobs@em6330.www.foxjob.io',
        subject: emailData.subject || 'Email from Foxjob',
        text: finalText,
        html: finalHtml,
        trackingSettings: {
          openTracking: {
            enable: true
          }
        },
        customArgs: {
          requestId: requestId,
          batchId: emailData.batchId || null // Include batchId in custom args if available
        }
      };
      
      logger.info('Sending email to:', msg.to);
      
      // Send the email
      await sgMail.send(msg);
      logger.info('Email sent successfully', { requestId: requestId });
      
      // Update status
      const updateData = {
        status: 'sent',
        sentAt: FieldValue.serverTimestamp(),
        
        // Store the batchId if it exists in the email data
        ...(emailData.batchId && { batchId: emailData.batchId }),
        
        // Initialize tracking fields
        // Engagement tracking
        opened: false,
        openCount: 0,
        clicked: false,
        clickCount: 0,
        unsubscribed: false,
        spamReported: false,
        groupUnsubscribed: false,
        groupResubscribed: false,
        
        // Delivery tracking
        deliveryStatus: 'processed',
        processed: true,
        processedAt: FieldValue.serverTimestamp(),
        delivered: false,
        dropped: false,
        deferred: false,
        bounced: false
      };
      
      await event.data.ref.update(updateData);
    } catch (error) {
      logger.error('Error sending email:', error);
      
      // Update with error
      await event.data.ref.update({
        status: 'error',
        error: error.message,
        errorTimestamp: FieldValue.serverTimestamp()
      });
    }
  
});