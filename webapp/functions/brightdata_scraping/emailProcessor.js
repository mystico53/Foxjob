// emailProcessor.js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const sgMail = require('@sendgrid/mail');
const { FieldValue } = require('firebase-admin/firestore');
const { defineSecret } = require("firebase-functions/params");

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
            
            // Query Firestore for the top 3 jobs by score
            const jobsSnapshot = await jobsRef
              .where('match.finalScore', '>', 0)
              .orderBy('match.finalScore', 'desc')
              .limit(3)
              .get();
            
            logger.info(`Query returned ${jobsSnapshot.size} documents`);
            
            if (jobsSnapshot.empty) {
              logger.info('No jobs with scores found');
            } else {
              // Add header for jobs section
              jobsHtml = `
                <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                  <h2 style="color: #444;">Your Top Matched Jobs</h2>
              `;
              
              jobsText = "\n\n===== YOUR TOP MATCHED JOBS =====\n\n";
              
              // Format the jobs for the email
              jobsSnapshot.forEach((doc, index) => {
                logger.info(`Processing job ${index + 1} with ID ${doc.id}`);
                const jobData = doc.data();
                
                const score = jobData.match?.finalScore || 'N/A';
                const summary = jobData.match?.summary || 'No summary available';
                const title = jobData.basicInfo?.title || 'Untitled Position';
                const company = jobData.basicInfo?.company || 'Unnamed Company';
                
                logger.info(`Job: ${title} at ${company} - Score: ${score}`);
                
                // Add to HTML version
                jobsHtml += `
                  <div style="margin-bottom: 20px; padding: 10px; border-bottom: 1px solid #eee;">
                    <h3 style="color: #1a73e8; margin-bottom: 5px;">${title} at ${company}</h3>
                    <p><strong>Match Score:</strong> ${score}</p>
                    <p><strong>Summary:</strong> ${summary}</p>
                  </div>
                `;
                
                // Add to plain text version
                jobsText += `
${title} at ${company}
Match Score: ${score}
Summary: ${summary}

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
  }
);