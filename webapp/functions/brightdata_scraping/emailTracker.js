// emailTracker.js
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
const crypto = require('crypto');
const { defineSecret } = require('firebase-functions/params');

// Define secret for webhook validation
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
	admin.initializeApp();
	logger.info('Firebase initialized');
} else {
	logger.info('Firebase already initialized');
}

const db = admin.firestore();

// Helper function to verify SendGrid signature
function verifySignature(payload, signature, timestamp, apiKey) {
	const hmac = crypto.createHmac('sha256', apiKey);
	const data = timestamp + JSON.stringify(payload);
	const digest = hmac.update(data).digest('hex');
	return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

// Create an HTTP function to handle SendGrid webhook events
exports.trackEmailOpens = onRequest(
	{
		secrets: [sendgridApiKey],
		cors: true // Allow cross-origin requests
	},
	async (req, res) => {
		try {
			// Only accept POST requests
			if (req.method !== 'POST') {
				logger.warn('Received non-POST request');
				return res.status(405).send('Method Not Allowed');
			}

			logger.info('Received webhook event from SendGrid');

			// For development, you might want to disable signature verification
			// In production, uncomment this section for security
			/*
        // Verify SendGrid signature
        const signature = req.headers['x-twilio-email-event-webhook-signature'];
        const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'];
        
        if (!signature || !timestamp) {
            logger.warn('Missing signature or timestamp headers');
            return res.status(401).send('Unauthorized');
        }
        
        try {
            const isValid = verifySignature(req.body, signature, timestamp, process.env.SENDGRID_API_KEY);
            if (!isValid) {
                logger.warn('Invalid signature');
                return res.status(401).send('Unauthorized');
            }
        } catch (error) {
            logger.error('Error validating signature:', error);
            return res.status(401).send('Unauthorized');
        }
        */

			// Process the events
			const events = Array.isArray(req.body) ? req.body : [req.body];

			logger.info(`Processing ${events.length} event(s)`);

			for (const event of events) {
				// Extract message ID and custom arguments if available
				const messageId = event.sg_message_id || 'unknown';
				const requestId =
					event.requestId || (event.unique_args ? event.unique_args.requestId : null);
				const batchId = event.batchId || (event.unique_args ? event.unique_args.batchId : null);

				// Common event data structure
				const eventData = {
					email: event.email,
					messageId: messageId,
					timestamp: admin.firestore.Timestamp.fromDate(new Date(event.timestamp * 1000)),
					userAgent: event.useragent || null,
					ip: event.ip || null,
					eventType: event.event
				};

				// Process different event types
				switch (event.event) {
					// Engagement data
					case 'open':
						logger.info(`Email opened: ${event.email} at ${event.timestamp}`);
						await processOpenEvent(requestId, eventData);
						break;

					case 'click':
						logger.info(`Email link clicked: ${event.email} at ${event.timestamp}`);
						// Add click-specific data
						eventData.url = event.url || null;
						await processClickEvent(requestId, eventData);
						break;

					case 'unsubscribe':
						logger.info(`User unsubscribed: ${event.email} at ${event.timestamp}`);
						await processUnsubscribeEvent(requestId, eventData);
						break;

					case 'spamreport':
						logger.info(`Spam report: ${event.email} at ${event.timestamp}`);
						await processSpamReportEvent(requestId, eventData);
						break;

					case 'group_unsubscribe':
						logger.info(`Group unsubscribe: ${event.email} at ${event.timestamp}`);
						eventData.asm_group_id = event.asm_group_id || null;
						await processGroupUnsubscribeEvent(requestId, eventData);
						break;

					case 'group_resubscribe':
						logger.info(`Group resubscribe: ${event.email} at ${event.timestamp}`);
						eventData.asm_group_id = event.asm_group_id || null;
						await processGroupResubscribeEvent(requestId, eventData);
						break;

					// Deliverability data
					case 'processed':
						logger.info(`Email processed: ${event.email} at ${event.timestamp}`);
						await processDeliveryEvent(requestId, eventData, 'processed');
						break;

					case 'delivered':
						logger.info(`Email delivered: ${event.email} at ${event.timestamp}`);
						await processDeliveryEvent(requestId, eventData, 'delivered');
						break;

					case 'deferred':
						logger.info(`Email deferred: ${event.email} at ${event.timestamp}`);
						eventData.response = event.response || null;
						await processDeliveryEvent(requestId, eventData, 'deferred');
						break;

					case 'bounce':
						logger.info(`Email bounced: ${event.email} at ${event.timestamp}`);
						eventData.reason = event.reason || null;
						eventData.status = event.status || null;
						eventData.bounceType = event.type || null;
						await processDeliveryEvent(requestId, eventData, 'bounced');
						break;

					case 'dropped':
						logger.info(`Email dropped: ${event.email} at ${event.timestamp}`);
						eventData.reason = event.reason || null;
						await processDeliveryEvent(requestId, eventData, 'dropped');
						break;

					// Account data
					case 'group_resubscribe':
						logger.info(`Group resubscribe: ${event.email} at ${event.timestamp}`);
						eventData.asm_group_id = event.asm_group_id || null;
						await processGroupResubscribeEvent(requestId, eventData);
						break;

					default:
						logger.info(`Unhandled event type: ${event.event}`);
						// Store unhandled event types for analysis
						try {
							await db.collection('emailEvents').add({
								...eventData,
								raw: event,
								createdAt: admin.firestore.FieldValue.serverTimestamp()
							});
						} catch (error) {
							logger.error(`Error storing unhandled event: ${error.message}`);
						}
				}
			}

			// Always return a 200 response to SendGrid
			return res.status(200).send('OK');
		} catch (error) {
			logger.error('Error processing webhook event:', error);
			// Still return 200 to avoid SendGrid retries
			return res.status(200).send('Error processed');
		}
	}
);

// Process open events
async function processOpenEvent(requestId, eventData) {
	if (requestId) {
		try {
			// Update the email request document with open information
			await db
				.collection('emailRequests')
				.doc(requestId)
				.update({
					opened: true,
					lastOpened: admin.firestore.FieldValue.serverTimestamp(),
					openCount: admin.firestore.FieldValue.increment(1),
					openEvents: admin.firestore.FieldValue.arrayUnion(eventData)
				});
			logger.info(`Updated emailRequest document ${requestId} with open event`);
		} catch (error) {
			logger.error(`Error updating email request ${requestId} for open event:`, error);
		}
	} else {
		// If no requestId, log open event to a separate collection
		try {
			await db.collection('emailOpenEvents').add({
				...eventData,
				batchId: event.batchId || null, // Include batchId if available
				createdAt: admin.firestore.FieldValue.serverTimestamp()
			});
			logger.info(`Stored open event in generic collection`);
		} catch (error) {
			logger.error('Error storing open event:', error);
		}
	}
}

// Process click events
async function processClickEvent(requestId, eventData) {
	if (requestId) {
		try {
			// Update the email request document with click information
			await db
				.collection('emailRequests')
				.doc(requestId)
				.update({
					clicked: true,
					lastClicked: admin.firestore.FieldValue.serverTimestamp(),
					clickCount: admin.firestore.FieldValue.increment(1),
					clickEvents: admin.firestore.FieldValue.arrayUnion(eventData)
				});
			logger.info(`Updated emailRequest document ${requestId} with click event`);
		} catch (error) {
			logger.error(`Error updating email request ${requestId} for click event:`, error);
		}
	} else {
		// If no requestId, log click event to a separate collection
		try {
			await db.collection('emailClickEvents').add({
				...eventData,
				createdAt: admin.firestore.FieldValue.serverTimestamp()
			});
			logger.info(`Stored click event in generic collection`);
		} catch (error) {
			logger.error('Error storing click event:', error);
		}
	}
}

// Process unsubscribe events
async function processUnsubscribeEvent(requestId, eventData) {
	if (requestId) {
		try {
			// Update the email request document with unsubscribe information
			await db
				.collection('emailRequests')
				.doc(requestId)
				.update({
					unsubscribed: true,
					unsubscribedAt: admin.firestore.FieldValue.serverTimestamp(),
					unsubscribeEvents: admin.firestore.FieldValue.arrayUnion(eventData)
				});
			logger.info(`Updated emailRequest document ${requestId} with unsubscribe event`);
		} catch (error) {
			logger.error(`Error updating email request ${requestId} for unsubscribe event:`, error);
		}
	} else {
		// If no requestId, log to generic collection
		storeGenericEvent(eventData, 'emailUnsubscribeEvents');
	}
}

// Process spam report events
async function processSpamReportEvent(requestId, eventData) {
	if (requestId) {
		try {
			// Update the email request document with spam report information
			await db
				.collection('emailRequests')
				.doc(requestId)
				.update({
					spamReported: true,
					spamReportedAt: admin.firestore.FieldValue.serverTimestamp(),
					spamReportEvents: admin.firestore.FieldValue.arrayUnion(eventData)
				});
			logger.info(`Updated emailRequest document ${requestId} with spam report event`);
		} catch (error) {
			logger.error(`Error updating email request ${requestId} for spam report event:`, error);
		}
	} else {
		// If no requestId, log to generic collection
		storeGenericEvent(eventData, 'emailSpamReportEvents');
	}
}

// Process group unsubscribe events
async function processGroupUnsubscribeEvent(requestId, eventData) {
	if (requestId) {
		try {
			// Update the email request document
			await db
				.collection('emailRequests')
				.doc(requestId)
				.update({
					groupUnsubscribed: true,
					groupUnsubscribedAt: admin.firestore.FieldValue.serverTimestamp(),
					groupUnsubscribeEvents: admin.firestore.FieldValue.arrayUnion(eventData)
				});
			logger.info(`Updated emailRequest document ${requestId} with group unsubscribe event`);
		} catch (error) {
			logger.error(`Error updating email request ${requestId} for group unsubscribe event:`, error);
		}
	} else {
		// If no requestId, log to generic collection
		storeGenericEvent(eventData, 'emailGroupUnsubscribeEvents');
	}
}

// Process group resubscribe events
async function processGroupResubscribeEvent(requestId, eventData) {
	if (requestId) {
		try {
			// Update the email request document
			await db
				.collection('emailRequests')
				.doc(requestId)
				.update({
					groupResubscribed: true,
					groupResubscribedAt: admin.firestore.FieldValue.serverTimestamp(),
					groupResubscribeEvents: admin.firestore.FieldValue.arrayUnion(eventData)
				});
			logger.info(`Updated emailRequest document ${requestId} with group resubscribe event`);
		} catch (error) {
			logger.error(`Error updating email request ${requestId} for group resubscribe event:`, error);
		}
	} else {
		// If no requestId, log to generic collection
		storeGenericEvent(eventData, 'emailGroupResubscribeEvents');
	}
}

// Process delivery-related events (processed, delivered, deferred, bounced, dropped)
async function processDeliveryEvent(requestId, eventData, status) {
	if (requestId) {
		try {
			const updateData = {
				deliveryStatus: status,
				[`${status}At`]: admin.firestore.FieldValue.serverTimestamp(),
				[`${status}Events`]: admin.firestore.FieldValue.arrayUnion(eventData)
			};

			// Set boolean flags for key statuses
			if (['delivered', 'bounced', 'dropped'].includes(status)) {
				updateData[status] = true;
			}

			// Update the email request document
			await db.collection('emailRequests').doc(requestId).update(updateData);
			logger.info(`Updated emailRequest document ${requestId} with ${status} event`);
		} catch (error) {
			logger.error(`Error updating email request ${requestId} for ${status} event:`, error);
		}
	} else {
		// If no requestId, log to generic collection
		storeGenericEvent(eventData, `email${status.charAt(0).toUpperCase() + status.slice(1)}Events`);
	}
}

// Store event in a generic collection when no requestId is available
async function storeGenericEvent(eventData, collectionName) {
	try {
		await db.collection(collectionName).add({
			...eventData,
			createdAt: admin.firestore.FieldValue.serverTimestamp()
		});
		logger.info(`Stored event in generic collection ${collectionName}`);
	} catch (error) {
		logger.error(`Error storing event in ${collectionName}:`, error);
	}
}
