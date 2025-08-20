# AWS SES Migration Guide

This document outlines the migration from SendGrid to AWS Simple Email Service (SES) for the Foxjob email delivery system.

## Overview

The migration replaces `@sendgrid/mail` with AWS SES using the AWS SDK v3 (`@aws-sdk/client-ses`). This change provides cost savings and removes dependency on SendGrid's policy changes.

## AWS SES Setup Requirements

### 1. AWS Account Setup

1. **Create AWS Account**: If you don't have one, create an AWS account
2. **Navigate to SES**: Go to AWS Management Console → Simple Email Service

### 2. Domain and Email Verification

**Verify Sender Domain:**
1. In SES console, go to "Verified identities"
2. Click "Create identity" → "Domain"
3. Enter your domain: `foxjob.io`
4. Enable DKIM signing (recommended)
5. Add the required DNS records to your domain registrar

**Verify Sender Email:**
1. Verify `jobs@em6330.www.foxjob.io` as a sender address
2. Or verify the entire `foxjob.io` domain to send from any address

### 3. Production Access

**Remove Sandbox Restrictions:**
1. In SES console, go to "Account dashboard"
2. Click "Request production access"
3. Fill out the form explaining your use case:
   - **Use case**: Job matching email notifications
   - **Expected volume**: Estimated daily email count
   - **Bounce/complaint handling**: Describe your process

### 4. AWS Credentials

**Create IAM User for SES:**
1. Go to AWS IAM → Users → Create user
2. User name: `foxjob-ses-user`
3. Attach policy: `AmazonSESFullAccess` (or create custom policy with minimal permissions)
4. Create access key for programmatic access
5. Save Access Key ID and Secret Access Key

**Minimal SES Policy (Recommended):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

### 5. DNS Configuration (Optional but Recommended)

**DKIM Setup:**
- Add DKIM CNAME records provided by AWS SES to your DNS

**SPF Record:**
- Add/update SPF record: `v=spf1 include:amazonses.com ~all`

**DMARC Record:**
- Add DMARC record for better deliverability

## Environment Configuration

### Local Development

**Update `.secret.local`:**
```bash
# AWS SES Credentials
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
```

**Update `.env.local`:**
```bash
# AWS SES Configuration
AWS_REGION=us-east-1
```

### Staging Environment

**Set Firebase Functions secrets:**
```bash
firebase functions:config:set aws.access_key_id="your_access_key_id"
firebase functions:config:set aws.secret_access_key="your_secret_access_key"
firebase functions:config:set aws.region="us-east-1"
```

Or using Firebase Functions v2 secrets:
```bash
firebase functions:secrets:set AWS_ACCESS_KEY_ID
firebase functions:secrets:set AWS_SECRET_ACCESS_KEY
firebase functions:secrets:set AWS_REGION
```

### Production Environment

Same as staging but use production AWS credentials.

## Testing the Migration

### 1. Local Testing

```bash
cd functions
node test-aws-ses.js
```

This will test the AWS SES integration without sending through Firebase Functions.

### 2. Firebase Emulator Testing

```bash
npm run serve
```

Then test the `sendEmail` function through your admin panel or directly:

```javascript
firebase.functions().httpsCallable('sendEmail')({
  to: 'your-email@example.com',
  subject: 'Test Email',
  html: '<p>Test email content</p>',
  text: 'Test email content'
});
```

### 3. Email Delivery Testing

Test both functions:
- **Manual emails**: `sendEmail` function
- **Automated notifications**: `processEmailRequests` (triggered by Firestore documents)

## Cost Comparison

**AWS SES Pricing:**
- $0.10 per 1,000 emails
- No monthly subscription fees
- Free tier: 62,000 emails/month if sent from EC2

**SendGrid Pricing:**
- Various paid plans starting ~$15/month
- Free tier: 100 emails/day

## Migration Checklist

- [ ] AWS account setup and SES configuration
- [ ] Domain/email verification in SES
- [ ] Production access request submitted
- [ ] AWS IAM user created with SES permissions
- [ ] DNS records updated (DKIM, SPF, DMARC)
- [ ] Environment variables configured for all environments
- [ ] Firebase Functions secrets updated
- [ ] Local testing completed successfully
- [ ] Staging deployment and testing
- [ ] Production deployment
- [ ] Monitor email delivery and bounce rates
- [ ] Remove SendGrid dependency completely (future task)

## Monitoring and Troubleshooting

### Common Issues

**1. Email Address Not Verified:**
```
MessageRejected: Email address not verified
```
Solution: Verify sender email/domain in AWS SES console

**2. Sandbox Mode:**
```
MessageRejected: Email address not verified. The following identities failed the check in region...
```
Solution: Request production access or verify recipient email addresses

**3. Credentials Error:**
```
UnauthorizedOperation: Unable to determine service/operation name to be authorized
```
Solution: Check AWS credentials in environment variables

**4. Region Mismatch:**
```
UnknownEndpoint: Inaccessible host
```
Solution: Ensure AWS_REGION is set correctly

### Monitoring

- **AWS SES Console**: Monitor sending statistics, bounces, complaints
- **Firebase Functions Logs**: Check function execution logs
- **Email Delivery**: Monitor actual email delivery to test addresses

## Rollback Plan

If issues occur, temporary rollback is possible:

1. Revert to SendGrid temporarily by uncommenting SendGrid code
2. Update secrets to use SendGrid API key
3. Redeploy functions
4. Fix AWS SES issues
5. Re-migrate to AWS SES

## Future Improvements

1. **Email Templates**: Use AWS SES templates for better management
2. **SNS Integration**: Set up bounce/complaint handling via SNS
3. **Configuration Sets**: Use SES configuration sets for advanced tracking
4. **Dedicated IP**: Consider dedicated IP for high-volume sending
5. **Remove SendGrid**: Complete removal of SendGrid dependencies after successful migration