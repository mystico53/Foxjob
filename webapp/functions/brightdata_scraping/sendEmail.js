const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

exports.sendEmail = functions.https.onCall(async (data, context) => {
  // Set your API key
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  // Hardcode everything for testing
  const msg = {
    to: 'konkaiser@gmail.com', // Hardcoded recipient
    from: 'jobs@em6330.www.foxjob.io', // Your verified sender
    subject: 'Test Email from Foxjob',
    text: 'This is a test email sent from Firebase Functions.',
    html: '<p>This is a test email sent from Firebase Functions.</p>',
  };
  
  try {
    // Simply use the SendGrid send method with await
    await sgMail.send(msg);
    console.log('Email sent successfully');
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error.toString());
    return { success: false, error: error.toString() };
  }
});