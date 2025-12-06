# 🚀 Amazon SES - Complete Deployment Guide

## ✅ Current Status: PRODUCTION READY

Your system is already configured to use Amazon SES for all email sending. This guide ensures everything is properly set up and nothing bypasses SES.

---

## 📋 Pre-Deployment Checklist

### ✅ AWS SES Configuration (Already Done)
- [x] SES production access granted
- [x] Domain `travunited.in` verified
- [x] DKIM signing enabled
- [x] SPF records configured
- [x] AWS credentials configured
- [x] Custom MAIL FROM domain configured

---

## 🔧 Environment Variables Required

Add these to your `.env` file on your production server:

```bash
# ============================================
# AMAZON SES CONFIGURATION (REQUIRED)
# ============================================

# AWS SDK Configuration (Required)
AWS_ACCESS_KEY_ID=AKIAXXXXX
AWS_SECRET_ACCESS_KEY=********
AWS_REGION=ap-south-1
AWS_SES_REGION=ap-south-1

# Sender Email Addresses
EMAIL_FROM=no-reply@travunited.in
EMAIL_FROM_GENERAL=no-reply@travunited.in
EMAIL_FROM_VISA=visa@travunited.in
EMAIL_FROM_TOURS=tours@travunited.in

# Application URL (for email links)
NEXTAUTH_URL=https://travunited.in
NEXT_PUBLIC_SITE_URL=https://travunited.in
```

---

## 🎯 Centralized Email System

### ✅ Single Email Function

All emails in your codebase flow through **ONE** function:

**File:** `src/lib/email.ts`
**Function:** `sendEmail(options: EmailOptions)`

### Email Flow:
```
Website Event → sendEmail() → AWS SDK → Amazon SES → User Inbox
```

### ✅ All Email Types Use SES:

1. **User Emails:**
   - Welcome emails
   - Password reset
   - Email verification
   - Booking confirmations
   - Visa status updates

2. **Admin Emails:**
   - New booking notifications
   - New application notifications
   - System alerts
   - Corporate leads

3. **Transaction Emails:**
   - Payment success/failure
   - Document upload notifications
   - Status updates

---

## 🔍 Codebase Audit Results

### ✅ No Bypasses Found

**Verified:** All email sending goes through `src/lib/email.ts`

**Checked for:**
- ❌ No direct `mail()` calls
- ❌ No Gmail or third-party email services
- ❌ No third-party email services
- ❌ No local sendmail
- ✅ All emails use `sendEmail()` or helper functions that call it

**Email Helper Functions (All use SES):**
- `sendWelcomeEmail()`
- `sendPasswordResetEmail()`
- `sendVisaStatusUpdateEmail()`
- `sendTourPaymentSuccessEmail()`
- `sendEmailVerificationEmail()`
- ... and 15+ more

---

## 📧 SNS Webhook for Bounce/Complaint Handling

### Current Status
✅ Webhook endpoint exists: `/api/webhooks/ses-sns`

### Setup Instructions

1. **Create SNS Topic in AWS:**
   ```bash
   # In AWS Console:
   # 1. Go to SNS → Topics → Create topic
   # 2. Name: ses-bounce-complaint-notifications
   # 3. Type: Standard
   ```

2. **Configure SES to Send to SNS:**
   ```bash
   # In AWS SES Console:
   # 1. Go to Configuration → Configuration sets
   # 2. Create configuration set (or use default)
   # 3. Add event destination:
   #    - Event types: Bounce, Complaint
   #    - Destination: SNS Topic
   #    - Topic: ses-bounce-complaint-notifications
   ```

3. **Subscribe Your Webhook to SNS:**
   ```bash
   # In SNS Console:
   # 1. Select your topic
   # 2. Create subscription
   # 3. Protocol: HTTPS
   # 4. Endpoint: https://travunited.in/api/webhooks/ses-sns
   # 5. Enable raw message delivery: No
   ```

4. **Verify Webhook:**
   ```bash
   # AWS will send a subscription confirmation
   # The webhook auto-confirms subscriptions
   # Check logs to verify it worked
   ```

### What the Webhook Does

✅ **Automatically:**
- Logs bounces and complaints to database
- Marks permanent bounces (prevents future emails)
- Handles complaints (unsubscribes users)
- Prevents reputation damage

---

## 🚀 Deployment Steps

### Step 1: Update Environment Variables

```bash
# On your production server
nano .env

# Add AWS SDK configuration variables (see above)
# Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
# Save and exit
```

### Step 2: Restart Application

```bash
# If using PM2:
pm2 restart all

# If using systemd:
sudo systemctl restart your-app

# If using Docker:
docker-compose restart
```

### Step 3: Clear Email Config Cache

```bash
# Clear any cached email configuration
curl -X POST https://travunited.in/api/admin/email/clear-cache
```

### Step 4: Test Email Sending

```bash
# Test endpoint
curl -X POST https://travunited.in/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com"}'
```

Or use the admin panel:
- Go to: `/admin/email-test`
- Select email type
- Enter test email
- Click "Send Test Email"

### Step 5: Verify SNS Webhook

```bash
# Check webhook is accessible
curl https://travunited.in/api/webhooks/ses-sns

# Should return:
# {"message":"SES SNS Webhook endpoint",...}
```

---

## ✅ Final Verification Checklist

Before going live, verify:

- [ ] `.env` has AWS credentials configured
- [ ] `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
- [ ] `AWS_REGION` is set to `ap-south-1`
- [ ] All sender emails use `@travunited.in` domain
- [ ] Application restarted after `.env` update
- [ ] Test email sent successfully
- [ ] Email received in Gmail/Yahoo/Outlook
- [ ] SNS webhook configured (optional but recommended)
- [ ] No old mail() code in codebase
- [ ] Database email config cache cleared

---

## 🔐 Security Best Practices

### ✅ Already Implemented:
- ✅ All emails use verified domain (`travunited.in`)
- ✅ DKIM signing enabled
- ✅ SPF records configured
- ✅ Centralized email function
- ✅ Error handling and logging

### 📝 Recommendations:
- ✅ Monitor bounce rates in SES console
- ✅ Review SNS webhook logs regularly
- ✅ Keep AWS credentials secure (never commit to git)
- ✅ Rotate AWS access keys periodically

---

## 🐛 Troubleshooting

### Issue: "Email address is not verified"
**Solution:**
- Verify `travunited.in` domain in SES console
- Check sender email uses `@travunited.in`
- Clear database email config cache

### Issue: "AWS credentials not configured"
**Solution:**
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
- Check `AWS_REGION` is set to `ap-south-1`
- Verify AWS credentials have SES sending permissions

### Issue: "Emails not being received"
**Solution:**
- Check spam folder
- Verify SES sending limits (check SES console)
- Check SNS webhook for bounce notifications
- Review application logs for errors

---

## 📊 Monitoring

### SES Console Metrics:
- **Sending Statistics:** Monitor daily sending volume
- **Bounce Rate:** Should be < 5%
- **Complaint Rate:** Should be < 0.1%
- **Reputation:** Should be "Good"

### Application Logs:
```bash
# Look for email-related logs:
[Email] Using AWS SDK provider for email sending
[Email] Sent successfully
[SES] BOUNCE logged for email@example.com
```

---

## 🎉 You're Production Ready!

Once all checklist items are verified, your email system is fully operational and using Amazon SES for all email sending.

**Next Steps (Optional):**
- Set up email templates customization
- Configure separate sender addresses for different categories
- Set up email analytics
- Warm up domain for higher sending limits

---

## 📞 Support

If you encounter issues:
1. Check application logs
2. Verify SES console for errors
3. Test email endpoint: `/api/email/test`
4. Review SNS webhook logs

---

**Last Updated:** 2024-12-04
**Status:** ✅ Production Ready

