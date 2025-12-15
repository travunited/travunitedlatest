# Email Configuration Guide

This guide helps you configure and test all email functionality in the Travunited application.

## 📧 Email Types Implemented

### User Registration & Authentication
- ✅ **Welcome Email** - Sent when user signs up
- ✅ **Email Verification** - Sent when user signs up (with verification link)
- ✅ **Password Reset Email** - Sent when user requests password reset (with reset link)
- ✅ **Password Reset OTP Email** - Sent when user requests password reset (with OTP code)

### Visa Application Emails
- ✅ **Visa Payment Success** - Sent when visa payment is successful
- ✅ **Visa Payment Failed** - Sent when visa payment fails
- ✅ **Visa Status Update** - Sent when visa application status changes
- ✅ **Visa Document Rejected** - Sent when documents are rejected
- ✅ **Visa Approved** - Sent when visa is approved
- ✅ **Visa Rejected** - Sent when visa is rejected
- ✅ **Visa Feedback Email** - Sent 24 hours after visa approval (via cron job)

### Tour Booking Emails
- ✅ **Tour Payment Success** - Sent when tour payment is successful
- ✅ **Tour Payment Failed** - Sent when tour payment fails
- ✅ **Tour Confirmed** - Sent when tour booking is confirmed
- ✅ **Tour Payment Reminder** - Sent as payment reminder
- ✅ **Tour Status Update** - Sent when tour booking status changes
- ✅ **Tour Vouchers Ready** - Sent when tour vouchers are ready

### Other Emails
- ✅ **Corporate Lead Admin** - Sent to admin when corporate lead is submitted
- ✅ **Corporate Lead Confirmation** - Sent to user when corporate lead is submitted
- ✅ **Career Application Status** - Sent when career application status changes
- ✅ **Admin Welcome Email** - Sent when new admin is created

## 🔧 Configuration

### Environment Variables

Set these in your `.env` file or environment:

```bash
# AWS SES Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1  # or your preferred AWS region

# Email From Addresses
EMAIL_FROM=no-reply@travunited.in  # Default sender
EMAIL_FROM_VISA=visa@travunited.in  # Optional: Visa-specific sender
EMAIL_FROM_TOURS=tours@travunited.in  # Optional: Tours-specific sender

# Admin Email Addresses
ADMIN_SUPPORT_EMAIL=support@travunited.in  # Main admin inbox
ADMIN_VISA_EMAIL=visa@travunited.in  # Optional: Visa-specific admin
ADMIN_TOURS_EMAIL=tours@travunited.in  # Optional: Tours-specific admin

# Application URL
NEXTAUTH_URL=https://travunited.in  # Your production URL
```

### Admin Settings Configuration

You can also configure email settings in the admin panel:
1. Go to **Admin Settings → Email Configuration**
2. Set AWS credentials (optional, uses env vars if not set)
3. Set sender email addresses
4. Configure email templates/snippets

## ✅ Testing Emails

### Method 1: Admin Panel Test

1. Log in as **SUPER_ADMIN**
2. Go to **Admin → Email Test**
3. Select email type
4. Enter test email address
5. Click "Send Test Email"

### Method 2: API Test Endpoint

```bash
# Test all email types
curl -X POST https://travunited.in/api/admin/email/test-all \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "emailType": "welcome",
    "testEmail": "test@example.com",
    "name": "Test User"
  }'
```

### Method 3: Test Script

```bash
# Run comprehensive email test
node scripts/test-all-emails.js test@example.com
```

### Method 4: Check Email Diagnostics

Visit: `https://travunited.in/api/admin/email/diagnostics`

This shows:
- Email configuration status
- Environment variables status
- Last email error (if any)
- Recommendations for fixing issues

## 🔍 Troubleshooting

### Emails Not Sending

1. **Check Email Configuration**
   - Visit `/api/admin/email/diagnostics`
   - Verify AWS credentials are set
   - Verify sender email addresses are configured

2. **Check AWS SES**
   - Verify AWS credentials are correct
   - Check AWS SES is out of sandbox mode (for production)
   - Verify sender email addresses are verified in SES

3. **Check Logs**
   - Check server logs for email errors
   - Look for `[Email]` prefixed log messages
   - Check `getLastEmailError()` for recent errors

4. **Common Issues**
   - **"Email credentials not configured"** → Set AWS credentials
   - **"Sender email not configured"** → Set EMAIL_FROM
   - **"AWS SES API timeout"** → Check network/region settings
   - **"Invalid email parameters"** → Check recipient email format

### Email Routing

- **Admin users** (STAFF_ADMIN, SUPER_ADMIN) → Emails routed to admin inbox
- **Regular customers** → Emails sent to their own email
- **System alerts** → Always sent to admin inbox

### Email Templates

- Default templates are in `src/lib/email-templates.ts`
- Custom templates can be configured in admin settings (EMAIL_SNIPPETS)
- Templates use variable replacement: `{variableName}`

## 📋 Email Flow Checklist

### When User Signs Up
- [ ] Welcome email sent
- [ ] Verification email sent

### When Visa Application is Created
- [ ] Status update email sent (DRAFT status)

### When Visa Payment is Made
- [ ] Payment success email sent (if successful)
- [ ] Payment failed email sent (if failed)
- [ ] Application status updated to SUBMITTED

### When Visa Status Changes
- [ ] Status update email sent
- [ ] Approved email sent (if approved)
- [ ] Rejected email sent (if rejected)
- [ ] Feedback email sent 24 hours after approval (via cron)

### When Documents are Rejected
- [ ] Document rejected email sent
- [ ] Admin notification sent

### When Tour Booking is Created
- [ ] Tour confirmation email sent
- [ ] Admin notification sent

### When Tour Payment is Made
- [ ] Payment success email sent (if successful)
- [ ] Payment failed email sent (if failed)

### When Tour Status Changes
- [ ] Status update email sent
- [ ] Confirmed email sent (if confirmed)
- [ ] Vouchers ready email sent (when vouchers are ready)

## 🚀 Production Checklist

Before going to production:

- [ ] AWS SES is out of sandbox mode
- [ ] All sender email addresses are verified in AWS SES
- [ ] Environment variables are set in production
- [ ] Email configuration is tested
- [ ] Admin email addresses are configured
- [ ] Google Review URL is configured (for feedback emails)
- [ ] Cron job is set up for feedback emails (if using cron)
- [ ] Email templates are customized (if needed)
- [ ] Email delivery is monitored

## 📞 Support

If you encounter issues:
1. Check `/api/admin/email/diagnostics` endpoint
2. Review server logs for `[Email]` messages
3. Verify AWS SES configuration
4. Test with admin panel email test feature

