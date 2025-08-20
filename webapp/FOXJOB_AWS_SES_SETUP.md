# Foxjob AWS SES Setup Guide

This is your complete step-by-step guide to set up AWS SES for the Foxjob email system. Follow these steps in order.

## Prerequisites
- AWS account (create one at aws.amazon.com if needed)
- Access to your domain's DNS settings (foxjob.io)
- Admin access to Firebase project

---

## Step 1: AWS Account & SES Setup

### 1.1 Access AWS SES Console
1. Log into AWS Console: https://console.aws.amazon.com/
2. Search for "SES" or go to: https://console.aws.amazon.com/ses/
3. Select region: **US East (N. Virginia) us-east-1** (important: use this region)

### 1.2 Verify Your Domain
1. In SES Console, click **"Identities"** under Configuration section
2. Click **"Create identity"** button
3. Select **"Domain"**
4. Enter domain: `foxjob.io`
5. Check ☑️ **"Use a default DKIM signing key pair"**
6. Click **"Create identity"**

### 1.3 Add DNS Records
AWS will show you DNS records to add. You need to add these to your foxjob.io domain:

**DKIM Records (3 CNAME records):**
```
[random-string]._domainkey.foxjob.io → [random-string].dkim.amazonses.com
[random-string]._domainkey.foxjob.io → [random-string].dkim.amazonses.com
[random-string]._domainkey.foxjob.io → [random-string].dkim.amazonses.com
```

**Instructions:**
- Go to your domain registrar (wherever foxjob.io is managed)
- Add these 3 CNAME records exactly as shown
- Wait 5-10 minutes for DNS propagation
- Return to AWS SES and click "Refresh" - status should show "Verified"

---

## Step 2: Request Production Access

### 2.1 Submit Production Access Request
1. In SES Console, go to **"Account dashboard"** (at the top of the left menu)
2. Look for **"Request production access"** button or link on the dashboard
3. Fill out the form:

**Mail type:** Transactional
**Website URL:** https://foxjob.io
**Use case description:**
```
Foxjob is a job matching platform that sends personalized job notifications to users. We send:
- Daily job match notifications with AI-powered job recommendations
- Welcome emails to new users
- Account-related transactional emails

We implement proper bounce and complaint handling, maintain clean email lists, and follow email best practices. Expected volume: 1,000-5,000 emails per day.
```

**Additional contact addresses:** `[your-email]@foxjob.io`

**Preferred process for handling bounces/complaints:**
```
We monitor bounce rates and complaints through AWS SES metrics. Hard bounces are automatically removed from our mailing lists. We respond to complaints within 24 hours and provide easy unsubscribe options in all emails.
```

4. Click **"Submit request"**
5. **Wait 1-2 business days** for approval

---

## Step 3: Create IAM User for Email Access

### 3.1 Create IAM User
1. Go to AWS IAM Console: https://console.aws.amazon.com/iam/
2. Click **"Users"** → **"Create user"**
3. User name: `foxjob-ses-user`
4. Click **"Next"**

### 3.2 Set Permissions
1. Select **"Attach policies directly"**
2. Search for and select: **"AmazonSESFullAccess"**
3. Click **"Next"** → **"Create user"**

### 3.3 Create Access Keys
1. Click on the newly created user `foxjob-ses-user`
2. Go to **"Security credentials"** tab
3. Click **"Create access key"**
4. Select **"Application running outside AWS"**
5. Click **"Next"** → **"Create access key"**
6. **⚠️ IMPORTANT: Copy and save both:**
   - **Access Key ID**: `AKIAXXXXXXXXXXXXXXXX`
   - **Secret Access Key**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 4: Update Local Environment

### 4.1 Update Your Local Secrets
Open `functions/.secret.local` and replace the placeholder values:

```bash
# Legacy SendGrid API Key (to be removed after migration)
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here

# AWS SES Credentials (replace with actual values from Step 3.3)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

BRIGHTDATA_API_TOKEN=your-brightdata-token-here
WEBHOOK_SECRET=your-webhook-secret-here
```

### 4.2 Verify Environment Files
Ensure these files have AWS_REGION set:
- `functions/.env.local` ✅ (already updated)
- `functions/.env.staging` ✅ (already updated) 
- `functions/.env.production` ✅ (already updated)

---

## Step 5: Test Local Setup

### 5.1 Test AWS SES Connection
```bash
cd functions
node test-aws-ses.js
```

**Expected successful output:**
```
Testing AWS SES Service Integration...
✓ AWS SES service initialized successfully
Sending test email...
Email details: { to: 'konkaiser@gmail.com', from: 'jobs@em6330.www.foxjob.io', subject: 'AWS SES Migration Test' }
✓ Email sent successfully!
Message ID: 0000014a-f4d4-4f36-b0a5-2e427c2468c0-000000
```

### 5.2 Troubleshoot Common Issues

**If you see "Email address not verified":**
- Check that foxjob.io domain is verified in AWS SES
- Wait for DNS records to propagate (can take up to 24 hours)

**If you see "MessageRejected" with sandbox mention:**
- Your production access request is still pending
- For testing, verify the recipient email (konkaiser@gmail.com) in AWS SES

**If you see credentials error:**
- Double-check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in `.secret.local`
- Ensure no extra spaces or characters

---

## Step 6: Test with Firebase Emulator

### 6.1 Start Emulator
```bash
npm run serve
```

### 6.2 Test via Admin Panel
1. Go to http://localhost:5000/admin
2. Find the email testing section
3. Send a test email to verify the integration works

### 6.3 Test sendEmail Function Directly
Use Firebase console or your admin panel to call:
```javascript
firebase.functions().httpsCallable('sendEmail')({
  to: 'your-email@example.com',
  subject: 'Firebase + AWS SES Test',
  html: '<h1>Success!</h1><p>Email sent via AWS SES</p>',
  text: 'Success! Email sent via AWS SES'
});
```

---

## Step 7: Deploy to Staging

### 7.1 Set Firebase Secrets (Staging)
```bash
firebase use staging  # or your staging project ID
firebase functions:secrets:set AWS_ACCESS_KEY_ID --data-file <(echo -n "AKIAXXXXXXXXXXXXXXXX")
firebase functions:secrets:set AWS_SECRET_ACCESS_KEY --data-file <(echo -n "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
firebase functions:secrets:set AWS_REGION --data-file <(echo -n "us-east-1")
```

### 7.2 Deploy Functions
```bash
npm run deploy:functions
```

### 7.3 Test Staging
- Send test emails through staging environment
- Verify job notification emails work correctly

---

## Step 8: Deploy to Production

### 8.1 Set Firebase Secrets (Production)
```bash
firebase use production  # or your production project ID
firebase functions:secrets:set AWS_ACCESS_KEY_ID --data-file <(echo -n "AKIAXXXXXXXXXXXXXXXX")
firebase functions:secrets:set AWS_SECRET_ACCESS_KEY --data-file <(echo -n "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
firebase functions:secrets:set AWS_REGION --data-file <(echo -n "us-east-1")
```

### 8.2 Deploy to Production
```bash
npm run deploy:functions:prod
```

---

## Step 9: Monitor and Verify

### 9.1 AWS SES Monitoring
1. Go to AWS SES Console → **"Reputation metrics"** (under Configuration)
2. Also check **"Account dashboard"** for sending statistics
3. Monitor:
   - **Bounce Rate**: Keep under 5%
   - **Complaint Rate**: Keep under 0.1%
   - **Sending Quota**: Track daily sending limit

### 9.2 Test Production Emails
- Send test job notifications
- Verify unsubscribe links work
- Check email formatting and delivery

### 9.3 Firebase Functions Logs
```bash
firebase functions:log
```
Look for successful AWS SES log entries.

---

## Step 10: Clean Up (Future Task)

After 1-2 weeks of successful AWS SES operation:

1. Remove SendGrid from package.json completely
2. Remove SendGrid secrets from environment
3. Remove SendGrid fallback code
4. Delete unused SendGrid-related files

---

## 🚨 Troubleshooting

### DNS Issues
```bash
# Check DKIM records
dig TXT [random-string]._domainkey.foxjob.io

# Should return amazonses.com CNAME
```

### Email Delivery Issues
1. **Check AWS SES Console** → Configuration → Identities → foxjob.io status
2. **Check bounce/complaint rates** in SES reputation dashboard
3. **Verify production access** is approved
4. **Test with verified email addresses** first

### Firebase Secrets Issues
```bash
# List current secrets
firebase functions:secrets:access AWS_ACCESS_KEY_ID

# Update if needed
firebase functions:secrets:set AWS_ACCESS_KEY_ID --data-file <(echo -n "new-key")
```

---

## 📞 Support

If you encounter issues:

1. **Check AWS SES Console** for domain verification status
2. **Review Firebase Functions logs** for error details
3. **Test locally first** with `node test-aws-ses.js`
4. **Check this guide's troubleshooting section**

---

## ✅ Success Checklist

- [ ] AWS SES account created
- [ ] Domain foxjob.io verified with DKIM
- [ ] Production access approved
- [ ] IAM user created with SES permissions
- [ ] Local testing successful
- [ ] Firebase emulator testing successful
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] Email monitoring set up
- [ ] All email functions working correctly

**Congratulations! 🎉 Your AWS SES migration is complete.**