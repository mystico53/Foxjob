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
    
    // Skip if already processed
    if (emailData.status !== 'pending') {
      logger.info('Skipping non-pending email request', { 
        requestId: event.params.requestId,
        status: emailData.status
      });
      return;
    }
    
    try {
      logger.info('Processing email request', { 
        requestId: event.params.requestId,
        userId: emailData.userId 
      });
      
      // Set the SendGrid API Key
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const uid = emailData.userId;
      let jobsHtml = '';
      let jobsText = '';
      
      // Process top jobs if we have a user ID
      if (uid) {
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
            
            // Query Firestore for all jobs from last 24 hours with a score > 0
            const jobsSnapshot = await jobsRef
              .where('match.final_score', '>', 0)
              .where('searchMetadata.snapshotDate', '>=', twentyFourHoursAgo.toISOString())
              .orderBy('searchMetadata.snapshotDate', 'desc')
              .get();

            logger.info(`Query returned ${jobsSnapshot.size} documents`);

            if (jobsSnapshot.empty) {
              logger.info('No jobs with scores found');
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
              
              // Take only the top 3
              const topJobs = allRecentJobs.slice(0, 5);
              
              logger.info(`Sorted jobs by score, top 3 selected out of ${allRecentJobs.length}`);
              
              // Add header for jobs section
              jobsHtml = `
                <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                  <h2 style="color: #444;">Your Top Matched Jobs</h2>
              `;
              
              jobsText = "\n\n===== YOUR TOP MATCHED JOBS =====\n\n";
              
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
                
                // Add to HTML version with new fields and View Job button
                jobsHtml += `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9;">
                  <h3 style="color: #1a73e8; margin-bottom: 5px;">${title} at ${company}</h3>
                  
                  <!-- Add preference score and explanation here -->
                  <p style="font-style: italic; color: #555; margin-bottom: 12px;">"${preferenceExplanation}"</p>
                  
                  <p><strong>Match Score:</strong> ${score}</p>
                  <p><strong>Company:</strong> ${description}</p>
                  <p><strong>Your Role:</strong> ${responsibility}</p>
                  <p><strong>Gap Analysis:</strong> ${gaps}</p>
                  <p style="margin-top: 15px;">
                    <a href="${jobUrl}" style="background-color: #1a73e8; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Job</a>
                  </p>
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
        } catch (error) {
          logger.error('Error fetching job data:', error.message);
          logger.error('Error stack:', error.stack);
        }
      } else {
        logger.info('No user ID available, skipping job data fetch');
      }
      
      // Original HTML and text from the request are in emailData
      const originalHtml = emailData.html || '<p>This is an email from Foxjob.</p>';
      const originalText = emailData.text || 'This is an email from Foxjob.';
      
      // Construct the final email content
      const finalHtml = originalHtml + jobsHtml;
      const finalText = originalText + jobsText;
      
      logger.info('Email content prepared. Jobs data added:', jobsHtml.length > 0 ? 'Yes' : 'No');
      
      // Construct the message with jobs appended
      const msg = {
        to: emailData.to || 'konkaiser@gmail.com',
        from: 'jobs@em6330.www.foxjob.io',
        subject: emailData.subject || 'Email from Foxjob',
        text: finalText,
        html: finalHtml,
      };
      
      logger.info('Sending email to:', msg.to);
      
      // Send the email
      await sgMail.send(msg);
      logger.info('Email sent successfully', { requestId: event.params.requestId });
      
      // Update status
      await event.data.ref.update({
        status: 'sent',
        sentAt: FieldValue.serverTimestamp()
      });
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