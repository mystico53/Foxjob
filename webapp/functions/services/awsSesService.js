// services/awsSesService.js
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');

// Define secrets for AWS SES
const awsAccessKeyId = defineSecret('AWS_ACCESS_KEY_ID');
const awsSecretAccessKey = defineSecret('AWS_SECRET_ACCESS_KEY');
const awsRegion = defineSecret('AWS_REGION');

class AWSSESService {
	constructor() {
		this.sesClient = null;
		this.initialized = false;
	}

	/**
	 * Initialize the SES client with credentials
	 */
	initialize() {
		if (this.initialized) {
			return;
		}

		try {
			// Get AWS credentials from environment variables (v2 secrets)
			const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
			const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
			const region = process.env.AWS_REGION || 'us-east-1'; // Default to us-east-1

			if (!accessKeyId || !secretAccessKey) {
				throw new Error('AWS SES credentials not found in environment variables');
			}

			this.sesClient = new SESClient({
				region: region,
				credentials: {
					accessKeyId: accessKeyId,
					secretAccessKey: secretAccessKey
				}
			});

			this.initialized = true;
			logger.info('AWS SES client initialized successfully', { region });
		} catch (error) {
			logger.error('Failed to initialize AWS SES client:', error);
			throw error;
		}
	}

	/**
	 * Send email using AWS SES
	 * @param {Object} emailParams - Email parameters
	 * @param {string} emailParams.to - Recipient email address
	 * @param {string} emailParams.from - Sender email address
	 * @param {string} emailParams.subject - Email subject
	 * @param {string} emailParams.html - HTML content
	 * @param {string} emailParams.text - Plain text content
	 * @param {Object} emailParams.customArgs - Custom arguments for tracking (optional)
	 * @returns {Promise<Object>} - SES response
	 */
	async sendEmail(emailParams) {
		if (!this.initialized) {
			this.initialize();
		}

		const { to, from, subject, html, text, customArgs = {} } = emailParams;

		// Validate required parameters
		if (!to || !from || !subject) {
			throw new Error('Missing required email parameters: to, from, or subject');
		}

		// Prepare the email command
		const sendEmailCommand = new SendEmailCommand({
			Source: from,
			Destination: {
				ToAddresses: Array.isArray(to) ? to : [to]
			},
			Message: {
				Subject: {
					Data: subject,
					Charset: 'UTF-8'
				},
				Body: {
					...(html && {
						Html: {
							Data: html,
							Charset: 'UTF-8'
						}
					}),
					...(text && {
						Text: {
							Data: text,
							Charset: 'UTF-8'
						}
					})
				}
			},
			// Add tags for tracking if customArgs provided
			...(Object.keys(customArgs).length > 0 && {
				Tags: Object.entries(customArgs).map(([key, value]) => ({
					Name: key,
					Value: String(value).replace(/[^a-zA-Z0-9_\-\.@]/g, '_') // Replace invalid chars with underscore
				}))
			})
		});

		try {
			logger.info('Sending email via AWS SES', {
				to: Array.isArray(to) ? to.join(', ') : to,
				subject,
				hasHtml: !!html,
				hasText: !!text,
				customArgs
			});

			const response = await this.sesClient.send(sendEmailCommand);

			logger.info('Email sent successfully via AWS SES', {
				messageId: response.MessageId,
				to: Array.isArray(to) ? to.join(', ') : to
			});

			return {
				success: true,
				messageId: response.MessageId,
				response: response
			};
		} catch (error) {
			logger.error('Error sending email via AWS SES:', {
				error: error.message,
				code: error.name,
				to: Array.isArray(to) ? to.join(', ') : to,
				subject
			});

			throw error;
		}
	}

	/**
	 * Send email with SendGrid-compatible interface for easier migration
	 * @param {Object} msg - SendGrid-style message object
	 * @returns {Promise<Object>} - SES response
	 */
	async send(msg) {
		// Convert SendGrid message format to our internal format
		const emailParams = {
			to: msg.to,
			from: msg.from,
			subject: msg.subject,
			html: msg.html,
			text: msg.text,
			customArgs: msg.customArgs || {}
		};

		return this.sendEmail(emailParams);
	}

	/**
	 * Get the required secrets for Firebase Functions v2
	 * @returns {Array} - Array of secret definitions
	 */
	static getRequiredSecrets() {
		return [awsAccessKeyId, awsSecretAccessKey, awsRegion];
	}
}

// Export singleton instance
const awsSESService = new AWSSESService();

module.exports = {
	AWSSESService,
	awsSESService,
	requiredSecrets: AWSSESService.getRequiredSecrets()
};
