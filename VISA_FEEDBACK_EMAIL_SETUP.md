# Visa Feedback Email System - Setup Guide

This document explains the automatic feedback email system for approved visas.

## Overview

When a visa application is approved and submitted to the user, after 24 hours, a feedback email is automatically sent asking them to rate your service on Google.

## Features

1. **Automatic Timing**: Emails are sent 24 hours after visa approval
2. **Admin Control**: Can be enabled/disabled from admin dashboard
3. **Google Review Link**: Configurable Google Business review URL
4. **Prevents Duplicates**: Tracks which applications have received feedback emails

## Setup Instructions

### Step 1: Run Database Migration

Run the SQL migration to add the `feedbackEmailSentAt` field:

```sql
-- File: add_feedback_email_field.sql
ALTER TABLE "Application" 
ADD COLUMN IF NOT EXISTS "feedbackEmailSentAt" TIMESTAMP(3);
```

Or use Prisma migration:
```bash
npx prisma migrate dev --name add_feedback_email_sent_at
```

### Step 2: Configure Google Review URL

1. Log in to admin panel
2. Go to **Settings → General Settings**
3. Scroll to **Feedback Email Settings** section
4. Enable "Enable Feedback Emails"
5. Enter your Google Business review URL (e.g., `https://g.page/r/YOUR_GOOGLE_BUSINESS_REVIEW_LINK`)
6. Click **Save Settings**

**How to get your Google Review URL:**
1. Go to your Google Business Profile
2. Click "Get more reviews"
3. Copy the review link provided
4. Paste it in the admin settings

### Step 3: Set Up Cron Job (Required for Automatic Sending)

The system needs a cron job to check and send feedback emails automatically.

#### Option 1: External Cron Service (Recommended for Hostinger)

1. Sign up for a free cron service (e.g., EasyCron or cron-job.org)
2. Create a new cron job:
   - **URL**: `https://yourdomain.com/api/admin/visa-feedback/send?secret=YOUR_SECRET`
   - **Method**: GET
   - **Schedule**: Every 6-12 hours (e.g., `0 */6 * * *` for every 6 hours)
   - **Headers**: None needed if using query parameter

3. Set environment variable in Hostinger:
   - **Name**: `CRON_SECRET_BLOG` (or `CRON_SECRET`)
   - **Value**: Generate a secure random string
   - Use the same secret value in your cron job URL

#### Option 2: Server Cron (If you have SSH access)

```bash
# Add to crontab (crontab -e)
0 */6 * * * curl -X GET "https://yourdomain.com/api/admin/visa-feedback/send?secret=YOUR_SECRET"
```

### Step 4: Test the System

1. Go to **Admin Settings → General Settings → Feedback Email Settings**
2. Click **"Test Feedback Email System"** button
3. Check the response to see how many emails would be sent

## How It Works

1. **When visa is approved**: Status is set to `APPROVED` and `updatedAt` is updated
2. **24 hours later**: Cron job runs and finds all applications where:
   - `status = "APPROVED"`
   - `updatedAt <= (now - 24 hours)`
   - `feedbackEmailSentAt IS NULL` (not sent yet)
3. **Email sent**: Feedback email is sent with Google review link
4. **Tracking**: `feedbackEmailSentAt` is set to prevent duplicate emails

## Email Template

The feedback email includes:
- Friendly greeting
- Request for feedback
- Prominent Google review button
- Link to view the visa application

You can customize the template in **Admin Settings → Email Templates** (if needed in the future).

## Admin Settings

Location: **Admin Dashboard → Settings → General Settings → Feedback Email Settings**

**Settings:**
- **Enable Feedback Emails**: Toggle to enable/disable the feature
- **Google Review URL**: Your Google Business review link
- **Test Button**: Manually trigger feedback email check

## Manual Trigger

Admins can manually trigger feedback emails:
- Via the "Test Feedback Email System" button in settings
- By calling the API endpoint: `GET /api/admin/visa-feedback/send` (requires admin authentication)

## Troubleshooting

### Emails not being sent

1. **Check if feature is enabled**: Verify "Enable Feedback Emails" is checked in settings
2. **Check Google Review URL**: Ensure it's configured (not empty or placeholder)
3. **Check cron job**: Verify cron job is running and calling the endpoint
4. **Check server logs**: Look for errors in the feedback email endpoint

### Duplicate emails

- The system tracks `feedbackEmailSentAt` to prevent duplicates
- Once sent, an application won't receive another feedback email

### Wrong timing

- System checks if `updatedAt` is at least 24 hours ago
- If admin updates the application after approval, it uses the latest `updatedAt`
- For precise timing, avoid updating approved applications unnecessarily

## API Endpoint

**GET/POST** `/api/admin/visa-feedback/send`

**Authentication:**
- Requires admin authentication OR
- Cron secret in header (`x-cron-secret`) or query parameter (`?secret=...`)

**Response:**
```json
{
  "message": "Feedback email processing completed",
  "sent": 5,
  "errors": 0,
  "checked": 5,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "via": "cron"
}
```

## Notes

- Emails are processed in batches (max 50 at a time per run)
- Processing continues even if some emails fail
- Failed emails are logged but don't block other emails
- The system uses the same email service configuration as other emails
