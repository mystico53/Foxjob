const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
    console.log('Firebase initialized')
} else {
    console.log('Firebase already initialized');
}

const db = admin.firestore();

exports.sendEmail = functions.https.onCall(async (data, context) => {
    console.log('SendEmail function called');
    
    // Log the structure of data
    console.log('Top level data keys:', Object.keys(data));
    
    // The actual data sent from the client is in data.data
    const emailData = data.data || {};
    console.log('Email data from client:', emailData);
    console.log('Email data keys:', Object.keys(emailData));
    
    // Get user ID from emailData directly
    const uid = emailData.userId || null;
    console.log('User ID from params:', uid);
    
    // Set the SendGrid API Key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    let jobsHtml = '';
    let jobsText = '';
    
    // Process top jobs if we have a user ID
    if (uid) {
        try {
            console.log(`Starting Firestore query for user: ${uid}`);
            
            // Check if the collection exists
            const jobsRef = db.collection('users').doc(uid).collection('scrapedJobs');
            const snapshot = await jobsRef.limit(1).get();
            
            if (snapshot.empty) {
                console.log(`No jobs found in collection for user ${uid}`);
            } else {
                console.log('Jobs collection exists, proceeding with query');
                
                // Query Firestore for the top 3 jobs by score
                const jobsSnapshot = await jobsRef
                    .where('match.finalScore', '>', 0)
                    .orderBy('match.finalScore', 'desc')
                    .limit(3)
                    .get();
                
                console.log(`Query returned ${jobsSnapshot.size} documents`);
                
                if (jobsSnapshot.empty) {
                    console.log('No jobs with scores found');
                } else {
                    // Add header for jobs section
                    jobsHtml = `
                        <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                            <h2 style="color: #444;">Your Top Matched Jobs</h2>
                    `;
                    
                    jobsText = "\n\n===== YOUR TOP MATCHED JOBS =====\n\n";
                    
                    // Format the jobs for the email
                    jobsSnapshot.forEach((doc, index) => {
                        console.log(`Processing job ${index + 1} with ID ${doc.id}`);
                        const jobData = doc.data();
                        
                        const score = jobData.match?.finalScore || 'N/A';
                        const summary = jobData.match?.summary || 'No summary available';
                        const title = jobData.basicInfo?.title || 'Untitled Position';
                        const company = jobData.basicInfo?.company || 'Unnamed Company';
                        
                        console.log(`Job: ${title} at ${company} - Score: ${score}`);
                        
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
                    
                    console.log('Job data formatting complete');
                }
            }
        } catch (error) {
            console.error('Error fetching job data:', error.message);
            console.error('Error stack:', error.stack);
        }
    } else {
        console.log('No user ID available, skipping job data fetch');
    }
    
    // Original HTML and text from the request are in emailData
    const originalHtml = emailData.html || '<p>This is an email from Foxjob.</p>';
    const originalText = emailData.text || 'This is an email from Foxjob.';
    
    // Construct the final email content
    const finalHtml = originalHtml + jobsHtml;
    const finalText = originalText + jobsText;
    
    console.log('Email content prepared. Jobs data added:', jobsHtml.length > 0 ? 'Yes' : 'No');
    
    // Construct the message with jobs appended
    const msg = {
        to: emailData.to || 'konkaiser@gmail.com',
        from: 'jobs@em6330.www.foxjob.io',
        subject: emailData.subject || 'Email from Foxjob',
        text: finalText,
        html: finalHtml,
    };
    
    console.log('Sending email to:', msg.to);
    
    try {
        await sgMail.send(msg);
        console.log('Email sent successfully via SendGrid');
        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.error('Error sending email:', error.toString());
        if (error.response) {
            console.error('SendGrid error details:', error.response.body);
        }
        return { success: false, error: error.toString() };
    }
});