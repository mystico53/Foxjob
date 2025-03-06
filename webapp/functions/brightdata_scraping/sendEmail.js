const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');

exports.sendEmail = functions.https.onCall(async (data, context) => {
    console.log('Function called with data:', data);
    console.log('Data type:', typeof data);
    console.log('Data keys:', data ? Object.keys(data) : 'no data');
    
    // Access the nested data object
    const emailData = data.data || {};
    console.log('Email data:', emailData);
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: emailData.to || 'konkaiser@gmail.com',
      from: 'jobs@em6330.www.foxjob.io',
      subject: emailData.subject || 'Test Email from Foxjob',
      text: emailData.text || 'This is a test email sent from Firebase Functions.',
      html: emailData.html || '<p>This is a test email sent from Firebase Functions.</p>',
    };
    
    try {
      await sgMail.send(msg);
      console.log('Email sent successfully');
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending email:', error.toString());
      return { success: false, error: error.toString() };
    }
});