# Email Templates & Functionality Guide

## Email Service Status

The email system is **functional** and uses **AWS SES** for sending emails. To verify configuration:

1. Go to **Admin → Settings → Email Service Configuration**
2. Ensure AWS SES credentials are configured:
   - AWS Access Key ID
   - AWS Secret Access Key
   - AWS Region
   - Sender email addresses (General, Visa, Tours)

3. Test email functionality using the "Test Email" button in admin settings

---

## Available Email Functions

### 1. **Welcome Email** (`sendWelcomeEmail`)
**Trigger:** User registration/signup  
**Category:** General  
**Recipient:** New user

**Sample Format:**
```
Subject: Welcome to Travunited!

Welcome to Travunited, John!

Thank you for joining Travunited. We're here to make your travel dreams come true.

You can now:
• Apply for visas to multiple countries
• Book amazing tour packages
• Track your applications and bookings

Get started by browsing our visa services or tour packages.

Best regards,
The Travunited Team
```

---

### 2. **Password Reset Email** (`sendPasswordResetEmail`)
**Trigger:** User requests password reset  
**Category:** General  
**Recipient:** User (always sent to actual email, never routed to admin)

**Sample Format:**
```
Subject: Reset Your Travunited Password

Password Reset Request

You requested to reset your password. Click the link below to set a new password:

[Reset Password Button]

If the button doesn't work, copy and paste this link into your browser:
https://travunited.com/reset-password?token=abc123xyz

This link will expire in 24 hours.

If you didn't request this, please ignore this email.

Best regards,
The Travunited Team
```

---

### 3. **Email Verification Email** (`sendEmailVerificationEmail`)
**Trigger:** User requests email verification  
**Category:** General  
**Recipient:** User

**Sample Format:**
```
Subject: Verify Your Travunited Email

Verify Your Email Address

Hi John,

Thank you for signing up with Travunited! Please verify your email address by clicking the link below:

[Verify Email Button]

This link will expire in 7 days.

If you didn't create an account, please ignore this email.

Best regards,
The Travunited Team
```

---

## Visa Application Emails

### 4. **Visa Payment Success Email** (`sendVisaPaymentSuccessEmail`)
**Trigger:** Successful visa application payment  
**Category:** Visa  
**Recipient:** Applicant

**Sample Format:**
```
Subject: Payment Successful - USA Tourist Visa

Payment Successful!

Your payment for USA Tourist Visa has been received successfully.

Amount Paid: ₹15,000
Application ID: abc12345...

Your application is now submitted and will be processed shortly. You can track the status in your dashboard.

Best regards,
The Travunited Team
```

---

### 5. **Visa Payment Failed Email** (`sendVisaPaymentFailedEmail`)
**Trigger:** Failed visa payment  
**Category:** Visa  
**Recipient:** Applicant

**Sample Format:**
```
Subject: Payment Failed - USA Tourist Visa

Payment Failed

Your payment attempt for USA Tourist Visa could not be completed.

Amount: ₹15,000
Reason: Insufficient funds

Please try again from your application dashboard. If the issue persists, contact support.

Best regards,
The Travunited Team
```

---

### 6. **Visa Status Update Email** (`sendVisaStatusUpdateEmail`)
**Trigger:** Admin updates application status  
**Category:** Visa  
**Recipient:** Applicant

**Sample Format:**
```
Subject: Status Update - USA Tourist Visa

Application Status Updated

Your USA Tourist Visa application status has been updated to: UNDER_REVIEW

View details in your dashboard.

Best regards,
The Travunited Team
```

---

### 7. **Visa Document Rejected Email** (`sendVisaDocumentRejectedEmail`)
**Trigger:** Admin rejects uploaded documents  
**Category:** Visa  
**Recipient:** Applicant

**Sample Format:**
```
Subject: Documents Need Re-upload - USA Tourist Visa

Documents Rejected

Some documents for your USA Tourist Visa application need to be re-uploaded:

• Passport: Image quality is too low. Please upload a clear, high-resolution scan.
  [Re-upload this document]

• Bank Statement: Document is expired. Please upload a recent statement (within 3 months).

[Open Application Button]

Best regards,
The Travunited Team
```

---

### 8. **Visa Approved Email** (`sendVisaApprovedEmail`)
**Trigger:** Admin approves visa application  
**Category:** Visa  
**Recipient:** Applicant

**Sample Format:**
```
Subject: Visa Approved! - USA Tourist Visa

🎉 Your Visa is Approved!

Great news! Your USA Tourist Visa has been approved.

You can now download your visa from your dashboard.

Best regards,
The Travunited Team
```

---

### 9. **Visa Rejected Email** (`sendVisaRejectedEmail`)
**Trigger:** Admin rejects visa application  
**Category:** Visa  
**Recipient:** Applicant

**Sample Format:**
```
Subject: Visa Application Update - USA Tourist Visa

Application Status Update

Your USA Tourist Visa application has been rejected.

Reason: Incomplete documentation. Required documents were not submitted within the deadline.

View details in your dashboard.

If you have questions, please contact our support team.

Best regards,
The Travunited Team
```

---

## Tour Booking Emails

### 10. **Tour Payment Success Email** (`sendTourPaymentSuccessEmail`)
**Trigger:** Successful tour booking payment  
**Category:** Tours  
**Recipient:** Customer

**Sample Format:**
```
Subject: Payment Successful - Paris City Tour

Payment Successful!

Your payment for Paris City Tour has been received successfully.

Amount Paid: ₹25,000
Pending Balance: ₹15,000
Booking ID: book12345...

View your booking in your dashboard.

Best regards,
The Travunited Team
```

---

### 11. **Tour Payment Failed Email** (`sendTourPaymentFailedEmail`)
**Trigger:** Failed tour payment  
**Category:** Tours  
**Recipient:** Customer

**Sample Format:**
```
Subject: Payment Failed - Paris City Tour

Payment Failed

Your payment attempt for Paris City Tour could not be completed.

Amount: ₹25,000
Reason: Payment gateway timeout

Please try again from your booking dashboard. If the issue persists, contact support.

Best regards,
The Travunited Team
```

---

### 12. **Tour Confirmed Email** (`sendTourConfirmedEmail`)
**Trigger:** Admin confirms tour booking  
**Category:** Tours  
**Recipient:** Customer

**Sample Format:**
```
Subject: Tour Confirmed! - Paris City Tour

🎉 Your Tour is Confirmed!

Great news! Your Paris City Tour booking has been confirmed.

You can now download your vouchers and itinerary from your dashboard.

Best regards,
The Travunited Team
```

---

### 13. **Tour Payment Reminder Email** (`sendTourPaymentReminderEmail`)
**Trigger:** Pending balance reminder (can be scheduled)  
**Category:** Tours  
**Recipient:** Customer

**Sample Format:**
```
Subject: Payment Reminder - Paris City Tour

Payment Reminder

This is a reminder that you have a pending balance for Paris City Tour.

Pending Balance: ₹15,000
Due Date: December 15, 2024

[Pay Now Button]

Best regards,
The Travunited Team
```

---

### 14. **Tour Status Update Email** (`sendTourStatusUpdateEmail`)
**Trigger:** Admin updates booking status  
**Category:** Tours  
**Recipient:** Customer

**Sample Format:**
```
Subject: Tour Status Update - Paris City Tour

Status Update

Your booking for Paris City Tour is now CONFIRMED.

You can view full details in your dashboard.

Best regards,
The Travunited Team
```

---

### 15. **Tour Vouchers Ready Email** (`sendTourVouchersReadyEmail`)
**Trigger:** Admin uploads tour vouchers  
**Category:** Tours  
**Recipient:** Customer

**Sample Format:**
```
Subject: Your Vouchers Are Ready - Paris City Tour

Vouchers Ready

Your vouchers and itinerary for Paris City Tour are ready for download.

Access them from your dashboard.

Best regards,
The Travunited Team
```

---

## Admin & System Emails

### 16. **Admin Welcome Email** (`sendAdminWelcomeEmail`)
**Trigger:** Super admin creates new admin account  
**Category:** General  
**Recipient:** New admin user

**Sample Format:**
```
Subject: Welcome to Travunited Admin Panel

Welcome to Travunited Admin Panel!

Dear Jane,

Your admin account has been successfully created for the Travunited platform.

Account Details
Email: jane@travunited.com
Role: Staff Admin

[Your Temporary Password Section]
Your Temporary Password: TempPass123!
Please change this password immediately after your first login.

Getting Started:
1. Log in to the admin panel using your email and the temporary password above
2. Once logged in, navigate to your account settings
3. Change your password to something secure and memorable

[Log In to Admin Panel Button]

Or reset your password here

Security Reminder:
• Never share your login credentials with anyone
• Use a strong, unique password
• Log out when finished, especially on shared devices
• Contact support immediately if you notice any suspicious activity

If you did not expect this email, please contact support@travunited.com immediately.
```

---

### 17. **Corporate Lead Admin Email** (`sendCorporateLeadAdminEmail`)
**Trigger:** User submits corporate lead form  
**Category:** General  
**Recipient:** Admin inbox

**Sample Format:**
```
Subject: New Corporate Lead - ABC Corporation

New Corporate Lead

A new corporate lead has been submitted through the corporate page.

Lead Details
Company Name: ABC Corporation
Contact Person: John Smith
Email: john@abccorp.com
Phone: +91 98765 43210
Submitted: December 2, 2024

Requirement/Message:
We are looking for corporate travel packages for our team of 50 employees traveling to Europe in Q1 2025. Please provide a quote.

[View in Admin Panel Button]

This is an automated notification from Travunited.
```

---

### 18. **Corporate Lead Confirmation Email** (`sendCorporateLeadConfirmationEmail`)
**Trigger:** User submits corporate lead form  
**Category:** General  
**Recipient:** User who submitted the form

**Sample Format:**
```
Subject: We received your corporate request

Thank You for Your Interest!

Dear John Smith,

We have received your corporate travel inquiry for ABC Corporation. Our corporate travel team is reviewing your requirements and will get back to you within 24 hours.

In the meantime, if you have any urgent questions, feel free to contact us directly:
• Email: corporate@travunited.com
• Phone: +91 63603 92398

We look forward to helping your organization with its travel needs!

Best regards,
The Travunited Corporate Team

This is an automated confirmation email. Please do not reply to this message.
```

---

## Email Routing Rules

### User Role-Based Routing:
- **CUSTOMER** → Emails sent to their actual email address
- **STAFF_ADMIN** / **SUPER_ADMIN** → Emails routed to admin inbox (except password resets)
- **System/Admin alerts** → Always sent to admin inbox

### Special Cases:
- **Password Reset Emails** → Always sent to user's actual email (never routed to admin)
- **Admin Welcome Emails** → Sent directly to new admin's email
- **Corporate Lead Admin Emails** → Sent to admin inbox
- **Corporate Lead Confirmation** → Sent to user's email

---

## Email Categories

Emails are categorized for proper sender address routing:

1. **General** (`category: "general"`)
   - Welcome emails
   - Password resets
   - Email verification
   - Admin emails
   - Corporate leads

2. **Visa** (`category: "visa"`)
   - All visa application-related emails
   - Payment confirmations
   - Status updates
   - Document rejections
   - Approval/rejection notices

3. **Tours** (`category: "tours"`)
   - All tour booking-related emails
   - Payment confirmations
   - Booking confirmations
   - Voucher notifications
   - Payment reminders

---

## Testing Email Functionality

### Method 1: Admin Settings Test
1. Navigate to **Admin → Settings → Email Service Configuration**
2. Click **"Test Email"** button
3. This sends a test password reset email to your logged-in admin account

### Method 2: API Test Endpoint
- **Endpoint:** `/api/admin/email-test`
- **Method:** POST
- **Auth:** Requires SUPER_ADMIN role
- **Body:** `{ "to": "test@example.com" }`

### Method 3: Check Configuration Status
- **Endpoint:** `/api/admin/email-test/config`
- **Method:** GET
- **Auth:** Requires SUPER_ADMIN role
- **Returns:** Configuration status and credentials check

---

## Configuration Requirements

For emails to work, the following must be configured:

### Required:
- ✅ AWS Access Key ID
- ✅ AWS Secret Access Key
- ✅ AWS Region (e.g., `us-east-1`, `ap-south-1`)
- ✅ General Sender Email (verified in AWS SES)

### Optional:
- Visa Sender Email (defaults to general if not set)
- Tours Sender Email (defaults to general if not set)

### Environment Variables (Alternative):
If not set in admin settings, the system will check:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` or `AWS_SES_REGION`
- `EMAIL_FROM`

---

## Email Template Features

All email templates include:
- ✅ Responsive HTML design
- ✅ Plain text fallback
- ✅ Branded styling (Travunited colors)
- ✅ Action buttons with links
- ✅ Clear call-to-action
- ✅ Professional formatting
- ✅ Mobile-friendly layout

---

## Notes

1. **Email Delivery:** All emails are sent via AWS SES. Ensure your AWS SES account is out of sandbox mode for production use.

2. **Rate Limits:** AWS SES has rate limits. Monitor your sending quota in AWS Console.

3. **Bounce Handling:** Configure bounce and complaint handling in AWS SES for production.

4. **Email Verification:** Sender email addresses must be verified in AWS SES before sending.

5. **Error Handling:** Failed emails are logged with detailed error messages. Check server logs for delivery issues.

---

## Support

For email-related issues:
1. Check AWS SES console for delivery status
2. Verify credentials in Admin → Settings
3. Test using the "Test Email" button
4. Check server logs for detailed error messages
5. Ensure sender email is verified in AWS SES

