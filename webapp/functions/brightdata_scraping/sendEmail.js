const admin = require('firebase-admin');
const { awsSESService, requiredSecrets } = require('../services/awsSesService');
const { onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

// Define legacy SendGrid secret for backwards compatibility during transition
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");

// AWS SES secrets are handled by the service module

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
    console.log('Firebase initialized')
} else {
    console.log('Firebase already initialized');
}

const db = admin.firestore();

// Helper function to create email HTML and text content
function createEmailContent(originalHtml, originalText, jobsData = []) {
    let jobsHtml = '';
    let jobsText = '';
    
    // Process jobs if we have any
    if (jobsData.length > 0) {
        // Add header for jobs section
        jobsHtml = `
            <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                <h2 style="color: #444; font-size: 20px; margin-bottom: 20px;">Your Top Matched Jobs</h2>
        `;
        
        jobsText = "\n\n===== YOUR TOP MATCHED JOBS =====\n\n";
        
        // Format the jobs for the email
        jobsData.forEach((job) => {
            // Get score from either location (handling both field naming conventions)
            const score = job.match?.final_score || job.match?.finalScore || 'N/A';
            const title = job.basicInfo?.title || 'Untitled Position';
            const company = job.basicInfo?.company || 'Unnamed Company';
            
            // Get the summary fields, handling both structure patterns
            const description = job.match?.summary?.short_description || 
                               (typeof job.match?.summary === 'string' ? job.match.summary : 'No company description available');
            const responsibility = job.match?.summary?.short_responsibility || 'No responsibility description available';
            const gaps = job.match?.summary?.short_gaps || 'No gaps information available';
            
            // Add to HTML version with improved styling
            jobsHtml += `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9;">
                    <h3 style="color: #1a73e8; margin-bottom: 10px; font-size: 18px;">${title} at ${company}</h3>
                    <p style="margin: 8px 0;"><strong style="color: #555;">Match Score:</strong> <span style="color: #1a73e8; font-weight: bold;">${score}</span></p>
                    <p style="margin: 8px 0;"><strong style="color: #555;">Company:</strong> ${description}</p>
                    <p style="margin: 8px 0;"><strong style="color: #555;">Your Role:</strong> ${responsibility}</p>
                    <p style="margin: 8px 0;"><strong style="color: #555;">Gap Analysis:</strong> ${gaps}</p>
                </div>
            `;
            
            // Add to plain text version
            jobsText += `
${title} at ${company}
Match Score: ${score}
Company: ${description}
Your Role: ${responsibility} 
Gap Analysis: ${gaps}

----------------------------------------

`;
        });
        
        // Close the jobs HTML section
        jobsHtml += '</div>';
    }
    
    // Complete HTML email with responsive design
    const finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Foxjob Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <header style="text-align: center; margin-bottom: 30px;">
                <img src="https://www.foxjob.io/logo.png" alt="Foxjob Logo" style="max-width: 150px; height: auto;">
            </header>
            
            <div style="padding: 15px; border-radius: 5px; background-color: #fff;">
                ${originalHtml}
            </div>
            
            ${jobsHtml}
            
            <footer style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666;">
                <p>© 2025 Foxjob. All rights reserved.</p>
                <p><a href="https://www.foxjob.io/unsubscribe" style="color: #1a73e8; text-decoration: none;">Unsubscribe</a> | <a href="https://www.foxjob.io/preferences" style="color: #1a73e8; text-decoration: none;">Email Preferences</a></p>
            </footer>
        </body>
        </html>
    `;
    
    // Final text email
    const finalText = originalText + jobsText;
    
    return { html: finalHtml, text: finalText };
}

// Export the function with v2 syntax
exports.sendEmail = onCall({
    // Configure the function with AWS SES secrets
    secrets: [...requiredSecrets, sendgridApiKey], // Keep sendgrid for backwards compatibility during transition
    // Optional: set other configurations
    // memory: '256MiB',
    // timeoutSeconds: 60,
}, async (request) => {
    console.log('SendEmail function called');
    
    // Log the structure of data (v2 has a slightly different structure)
    const data = request.data;
    console.log('Email data from client:', data);
    
    // Get user ID from data directly
    const uid = data.userId || null;
    console.log('User ID from params:', uid);
    
    // Initialize AWS SES service
    try {
        awsSESService.initialize();
        console.log('AWS SES service initialized successfully');
    } catch (error) {
        console.error('Failed to initialize AWS SES service:', error);
        return { 
            success: false, 
            error: 'Email service initialization failed',
            previewHtml: emailContent.html
        };
    }
    
    let jobsData = [];
    
    // Process top jobs if we have a user ID
    if (uid) {
        try {
            console.log(`Starting Firestore query for user: ${uid}`);
            
            // First verify if user document exists
            const userRef = db.collection('users').doc(uid);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                console.log(`User document doesn't exist for ID: ${uid}`);
                // Return a mock job for testing purposes
                jobsData = [getMockJobData()];
                console.log('Using mock job data instead');
            } else {
                // Check if the collection exists
                const jobsRef = db.collection('users').doc(uid).collection('scrapedJobs');
                const snapshot = await jobsRef.limit(1).get();
            
            if (snapshot.empty) {
                console.log(`No jobs found in collection for user ${uid}`);
            } else {
                console.log('Jobs collection exists, proceeding with query');
                
                // Try both field naming patterns
                let jobsSnapshot;
                try {
                    // Try first field naming pattern (final_score)
                    jobsSnapshot = await jobsRef
                        .where('match.final_score', '>', 0)
                        .orderBy('match.final_score', 'desc')
                        .limit(3)
                        .get();
                } catch (err) {
                    console.log('Error with first query pattern, trying alternative:', err.message);
                    // Try alternative field naming pattern (finalScore)
                    jobsSnapshot = await jobsRef
                        .where('match.finalScore', '>', 0)
                        .orderBy('match.finalScore', 'desc')
                        .limit(3)
                        .get();
                }
                
                console.log(`Query returned ${jobsSnapshot.size} documents`);
                
                if (!jobsSnapshot.empty) {
                    // Store job data
                    jobsData = jobsSnapshot.docs.map(doc => doc.data());
                    console.log('Job data collected:', jobsData.length);
                }
                }
            }
        } catch (error) {
            console.error('Error fetching job data:', error.message);
            console.error('Error stack:', error.stack);
            
            // Use mock data when there's an error
            jobsData = [getMockJobData(), getMockJobData(), getMockJobData()];
            console.log('Using mock job data due to error');
        }
    } else {
        console.log('No user ID available, skipping job data fetch');
    }
    
    // Helper function to generate mock job data for testing
    function getMockJobData() {
        return {
            basicInfo: {
                title: "Software Engineer",
                company: "TechCorp Inc.",
                location: "Remote"
            },
            match: {
                final_score: 85,
                finalScore: 85,
                summary: {
                    short_description: "TechCorp is a leading software company specializing in AI solutions.",
                    short_responsibility: "Building and maintaining web applications using modern JavaScript frameworks.",
                    short_gaps: "Consider learning more about cloud infrastructure and containerization."
                }
            }
        };
    }
    
    // Original HTML and text from the request
    const originalHtml = data.html || '<p>This is an email from Foxjob.</p>';
    const originalText = data.text || 'This is an email from Foxjob.';
    
    // Create email content
    const emailContent = createEmailContent(originalHtml, originalText, jobsData);
    
    console.log('Email content prepared. Jobs data added:', jobsData.length > 0 ? 'Yes' : 'No');
    
    console.log('Email recipient details:', {
        providedTo: data.to, 
        fallbackUsed: !data.to,
        finalRecipient: data.to || 'konkaiser@gmail.com'
    });

    // Construct the message
    const msg = {
        to: data.to || 'konkaiser@gmail.com',
        from: 'jobs@em6330.www.foxjob.io',
        subject: data.subject || 'Email from Foxjob',
        text: emailContent.text,
        html: emailContent.html,
    };
    
    console.log('Sending email to:', msg.to);
    
    try {
        // Send email using AWS SES with SendGrid-compatible interface
        const result = await awsSESService.send(msg);
        console.log('Email sent successfully via AWS SES', { messageId: result.messageId });
        return { 
            success: true, 
            message: 'Email sent successfully via AWS SES',
            messageId: result.messageId,
            previewHtml: emailContent.html // Return preview HTML
        };
    } catch (error) {
        console.error('Error sending email via AWS SES:', error.toString());
        console.error('AWS SES error details:', {
            name: error.name,
            code: error.code || error.$metadata?.httpStatusCode,
            message: error.message
        });
        return { 
            success: false, 
            error: error.toString(),
            previewHtml: emailContent.html // Still return preview HTML
        };
    }
});

// Add preview function - does not actually send email
exports.previewEmail = onCall({
    secrets: [...requiredSecrets, sendgridApiKey], // AWS SES secrets + legacy SendGrid for transition
    // Add CORS configuration
    cors: ["http://localhost:5000", "https://jobille-45494.web.app"],
}, async (request) => {
    console.log('PreviewEmail function called');
    
    const data = request.data;
    const uid = data.userId || null;
    
    let jobsData = [];
    
    // Process top jobs if we have a user ID (same code as above)
    if (uid) {
        try {
            console.log(`Starting Firestore query for user: ${uid}`);
            
            const jobsRef = db.collection('users').doc(uid).collection('scrapedJobs');
            const snapshot = await jobsRef.limit(1).get();
            
            if (!snapshot.empty) {
                console.log('Jobs collection exists, proceeding with query');
                
                // Try both field naming patterns
                let jobsSnapshot;
                try {
                    jobsSnapshot = await jobsRef
                        .where('match.final_score', '>', 0)
                        .orderBy('match.final_score', 'desc')
                        .limit(3)
                        .get();
                } catch (err) {
                    console.log('Error with first query pattern, trying alternative:', err.message);
                    jobsSnapshot = await jobsRef
                        .where('match.finalScore', '>', 0)
                        .orderBy('match.finalScore', 'desc')
                        .limit(3)
                        .get();
                }
                
                if (!jobsSnapshot.empty) {
                    jobsData = jobsSnapshot.docs.map(doc => doc.data());
                }
            }
        } catch (error) {
            console.error('Error fetching job data:', error.message);
        }
    }
    
    // Original HTML and text from the request
    const originalHtml = data.html || '<p>This is an email from Foxjob.</p>';
    const originalText = data.text || 'This is an email from Foxjob.';
    
    // Create email content
    const emailContent = createEmailContent(originalHtml, originalText, jobsData);
    
    // Return just the preview, without sending
    return { 
        success: true, 
        previewHtml: emailContent.html,
        previewText: emailContent.text
    };
});