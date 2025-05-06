# Email Open Tracking Implementation

This document outlines how the email tracking system works with SendGrid and provides setup instructions.

## How It Works

1. When an email is sent through the `processEmailRequests` function, it includes:

   - An invisible tracking pixel unique to each email request
   - SendGrid's built-in tracking features
   - Custom arguments containing the `requestId` from Firestore

2. The `trackEmailOpens` function receives webhook events from SendGrid when:

   - Various email events occur (opens, clicks, bounces, etc.)
   - Each event type has a specific handler in the code

3. When events are received, the function:
   - Extracts the `requestId` from the event payload
   - Updates the corresponding document in the `emailRequests` collection
   - Records detailed information including timestamp, user agent, and counts

## Event Types Tracked

The system tracks the following event types from SendGrid:

### Engagement Data

- **Opened**: When a recipient opens the email
- **Clicked**: When a recipient clicks a link in the email
- **Unsubscribed**: When a recipient unsubscribes from emails
- **Spam Reports**: When a recipient marks the email as spam
- **Group Unsubscribes**: When a recipient unsubscribes from a specific group
- **Group Resubscribes**: When a recipient resubscribes to a group

### Deliverability Data

- **Processed**: When SendGrid processes the email for delivery
- **Delivered**: When the email is successfully delivered to the recipient's server
- **Deferred**: When SendGrid temporarily couldn't deliver the email
- **Bounced**: When the email permanently fails to deliver
- **Dropped**: When SendGrid drops the email (e.g., invalid email, blocklisted)

### Account Data

- **Group Resubscribes**: When a recipient resubscribes to an unsubscribed group

## SendGrid Setup Instructions

### 1. Enable Tracking in SendGrid

1. Log in to your SendGrid account
2. Go to **Settings** > **Tracking** in the left sidebar
3. Configure the following tracking options:

   - **Open Tracking**: Toggle to "Enabled"
   - **Click Tracking**: Toggle to "Enabled"
   - **Subscription Tracking**: (Optional) Configure if you want to track unsubscribes

4. Click **Save** to apply your changes

### 2. Set Up Event Webhook

1. Go to **Settings** > **Mail Settings**
2. Select **Event Webhooks** under Webhook Settings
3. Click **Create new webhook**
4. Enter the webhook URL:

   - For production: `https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/trackEmailOpens`
   - Replace `YOUR_REGION` and `YOUR_PROJECT_ID` with your actual Firebase project values

5. Configure webhook events - check ALL of these events:

   - **Opened** - When a recipient opens the email
   - **Clicked** - When a recipient clicks on a link
   - **Unsubscribed** - When a recipient unsubscribes
   - **Spam Report** - When the email is reported as spam
   - **Group Unsubscribe** - When a recipient unsubscribes from a group
   - **Group Resubscribe** - When a recipient resubscribes to a group
   - **Processed** - When SendGrid begins processing the email
   - **Dropped** - When SendGrid drops the email without sending
   - **Delivered** - When the email is delivered to the recipient
   - **Deferred** - When delivery is temporarily delayed
   - **Bounce** - When the email permanently fails to deliver

6. For enhanced security (recommended):

   - Enable signed webhooks
   - Store the signing key securely
   - Uncomment the signature verification code in `emailTracker.js`

7. Click **Save**

### 3. Test Your Integration

1. In SendGrid, click the **Test Your Integration** button
2. Check your Firebase functions logs to confirm events are being received
3. Send a test email to yourself and check the various events
4. Verify that the document in Firestore is updated with event information

## Data Storage in Firestore

When email events occur, the following fields are updated in the corresponding `emailRequests` document:

### Engagement Fields

- `opened`: Boolean, true when email is opened
- `openCount`: Number of times the email has been opened
- `lastOpened`: Timestamp of the most recent open
- `openEvents`: Array of detailed open events

- `clicked`: Boolean, true when links are clicked
- `clickCount`: Number of link clicks
- `lastClicked`: Timestamp of the most recent click
- `clickEvents`: Array of click events with URLs

- `unsubscribed`: Boolean, true when recipient unsubscribes
- `unsubscribedAt`: Timestamp of unsubscribe action
- `unsubscribeEvents`: Array of unsubscribe events

- `spamReported`: Boolean, true when marked as spam
- `spamReportedAt`: Timestamp of spam report
- `spamReportEvents`: Array of spam report events

- `groupUnsubscribed`: Boolean, true when unsubscribed from group
- `groupUnsubscribedAt`: Timestamp of group unsubscribe
- `groupUnsubscribeEvents`: Array of group unsubscribe events

### Delivery Fields

- `deliveryStatus`: String, current status (processed/delivered/bounced/etc.)
- `processed`: Boolean, true when SendGrid processes the email
- `processedAt`: Timestamp when processing started
- `processedEvents`: Array of processing events

- `delivered`: Boolean, true when successfully delivered
- `deliveredAt`: Timestamp of delivery
- `deliveredEvents`: Array of delivery events

- `deferred`: Boolean, true if delivery was deferred
- `deferredAt`: Timestamp of deferral
- `deferredEvents`: Array of deferral events

- `bounced`: Boolean, true if email bounced
- `bouncedAt`: Timestamp of bounce
- `bouncedEvents`: Array of bounce events with reasons

- `dropped`: Boolean, true if email was dropped
- `droppedAt`: Timestamp when dropped
- `droppedEvents`: Array of drop events with reasons

## Querying Email Analytics

### Example Firestore Queries

```javascript
// Get all emails that were opened
const openedEmails = await db.collection('emailRequests').where('opened', '==', true).get();

// Get emails with high engagement (opened and clicked)
const engagedEmails = await db
	.collection('emailRequests')
	.where('opened', '==', true)
	.where('clicked', '==', true)
	.get();

// Find problematic emails (bounced or reported as spam)
const problematicEmails = await db
	.collection('emailRequests')
	.where('bounced', '==', true)
	.orWhere('spamReported', '==', true)
	.get();

// Track delivery success rate over time
const recentEmails = await db.collection('emailRequests').where('sentAt', '>=', oneWeekAgo).get();

const deliveryStats = {
	total: recentEmails.size,
	delivered: recentEmails.docs.filter((doc) => doc.data().delivered).length,
	bounced: recentEmails.docs.filter((doc) => doc.data().bounced).length,
	opened: recentEmails.docs.filter((doc) => doc.data().opened).length
};
```

## Troubleshooting

- **No events received**: Ensure webhook URL is correct and accessible
- **Missing email open events**: Ensure images are enabled in recipient's email client
- **Webhook errors**: Check Firebase function logs for detailed error messages
- **Signature verification failures**: Confirm your SendGrid API key is properly configured

## Security Considerations

- In production, uncomment and enable the signature verification code
- Store SendGrid API keys securely using Firebase Secret Manager
- Consider IP filtering if needed for additional security
- Regularly audit your email analytics for unusual patterns
