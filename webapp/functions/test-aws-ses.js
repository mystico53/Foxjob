// test-aws-ses.js
// Simple test script to verify AWS SES service integration
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.secret.local' });
const { awsSESService } = require('./services/awsSesService');

async function testAWSSES() {
	console.log('Testing AWS SES Service Integration...');

	try {
		// Initialize the service
		awsSESService.initialize();
		console.log('✓ AWS SES service initialized successfully');

		// Test email parameters
		const testEmail = {
			to: 'konkaiser@gmail.com',
			from: 'jobs@em6330.www.foxjob.io', // Your verified sender
			subject: 'AWS SES Migration Test',
			html: '<h1>Test Email</h1><p>This is a test email sent via AWS SES from Firebase Functions.</p>',
			text: 'Test Email\n\nThis is a test email sent via AWS SES from Firebase Functions.',
			customArgs: {
				test: 'migration',
				timestamp: new Date().toISOString()
			}
		};

		console.log('Sending test email...');
		console.log('Email details:', {
			to: testEmail.to,
			from: testEmail.from,
			subject: testEmail.subject
		});

		// Attempt to send email
		const result = await awsSESService.sendEmail(testEmail);

		console.log('✓ Email sent successfully!');
		console.log('Message ID:', result.messageId);
		console.log('Full result:', result);
	} catch (error) {
		console.error('✗ Test failed:', error.message);
		console.error('Error details:', {
			name: error.name,
			code: error.code,
			statusCode: error.$metadata?.httpStatusCode
		});

		// Check for common issues
		if (error.message.includes('credentials')) {
			console.error(
				'\n💡 Troubleshooting: Make sure AWS credentials are set in .secret.local file'
			);
		}
		if (
			error.message.includes('MessageRejected') ||
			error.message.includes('Email address not verified')
		) {
			console.error('\n💡 Troubleshooting: Verify your sender email address in AWS SES console');
		}
		if (error.message.includes('Sandbox')) {
			console.error(
				'\n💡 Troubleshooting: Request production access in AWS SES to send to unverified recipients'
			);
		}
	}
}

// Run the test if script is executed directly
if (require.main === module) {
	testAWSSES();
}

module.exports = { testAWSSES };
