# Blog Post Scheduling - Hostinger Setup Guide

This guide explains how to set up automatic publishing of scheduled blog posts on Hostinger.

## Overview

Scheduled blog posts need a cron job to automatically publish them at the scheduled time. Since you're on Hostinger, we'll use either:
- **cPanel Cron Jobs** (if you have cPanel access)
- **External Cron Service** (easier, recommended)

## Option 1: External Cron Service (Recommended - Easiest)

This is the simplest method and doesn't require server access.

### Step 1: Set Environment Variable

1. Log in to your Hostinger hosting panel
2. Navigate to **Environment Variables** or **App Settings**
3. Add a new variable:
   - **Name**: `CRON_SECRET_BLOG`
   - **Value**: Generate a secure random string (you can use: https://www.random.org/strings/)
   - Make it at least 32 characters long
   - Example: `a7f3b9c2d4e6f8a1b3c5d7e9f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8`

### Step 2: Use a Free Cron Service

#### Recommended: EasyCron (Free tier available)

1. Sign up at https://www.easycron.com/ (free account allows 2 cron jobs)
2. Click **Add Cron Job**
3. Fill in the details:
   - **Cron Job Name**: Blog Post Auto-Publish
   - **URL**: `https://yourdomain.com/api/admin/content/blog/publish-ready`
   - **HTTP Method**: GET
   - **HTTP Headers**: 
     - Key: `x-cron-secret`
     - Value: `[The secret you set in Step 1]`
   - **Schedule**: 
     - Select **Cron Expression**
     - Enter: `*/5 * * * *` (every 5 minutes)
     - Or use the visual builder: Every 5 minutes
   - **Status**: Active
4. Click **Save**

#### Alternative: cron-job.org (Free)

1. Sign up at https://cron-job.org/
2. Create a new cron job:
   - **Title**: Blog Post Auto-Publish
   - **Address**: `https://yourdomain.com/api/admin/content/blog/publish-ready`
   - **Schedule**: Every 5 minutes
   - **Request Method**: GET
   - **Request Headers**:
     ```
     x-cron-secret: YOUR_SECRET_VALUE
     ```
   - Click **Create cronjob**

### Step 3: Test

1. Create a test blog post scheduled for 2-3 minutes in the future
2. Wait for the scheduled time
3. Check your blog - the post should appear within 5 minutes
4. Check your cron service logs to see if requests are being sent

## Option 2: cPanel Cron Jobs (If Available)

If your Hostinger plan includes cPanel access:

### Step 1: Set Environment Variable

In your Hostinger panel, add the `CRON_SECRET_BLOG` environment variable (same as Option 1, Step 1)

### Step 2: Access cPanel

1. Log in to Hostinger
2. Open **cPanel**
3. Find **Cron Jobs** section

### Step 3: Create Cron Job

1. In the **Command** field, enter:
   ```bash
   curl -X GET -H "x-cron-secret: YOUR_SECRET_VALUE" https://yourdomain.com/api/admin/content/blog/publish-ready
   ```
   Replace `YOUR_SECRET_VALUE` with the value you set in Step 1

2. Set the schedule:
   - **Common Settings**: Every 5 Minutes
   - Or manually enter: `*/5 * * * *`

3. Click **Add New Cron Job**

### Step 4: Test

Same as Option 1, Step 3

## Option 3: SSH/Crontab (Advanced - VPS/Dedicated)

If you have SSH access to your Hostinger server:

### Step 1: SSH into your server

```bash
ssh username@your-server-ip
```

### Step 2: Edit crontab

```bash
crontab -e
```

### Step 3: Add cron job

Add this line (replace YOUR_SECRET_VALUE with your actual secret):

```bash
*/5 * * * * curl -X GET -H "x-cron-secret: YOUR_SECRET_VALUE" https://yourdomain.com/api/admin/content/blog/publish-ready >> /dev/null 2>&1
```

Save and exit (in vi: press `Esc`, type `:wq`, press Enter)

### Step 4: Verify

```bash
crontab -l
```

You should see your cron job listed.

## Verification Steps

1. **Check Environment Variable**:
   - Ensure `CRON_SECRET_BLOG` is set in your hosting panel
   - The value should match what you use in the cron job

2. **Test the Endpoint Manually**:
   Open this URL in your browser (replace YOUR_SECRET with your actual secret):
   ```
   https://yourdomain.com/api/admin/content/blog/publish-ready?x-cron-secret=YOUR_SECRET
   ```
   
   **Note**: GET requests with query params might not work if your server requires headers. Use a tool like Postman or curl instead:
   ```bash
   curl -X GET -H "x-cron-secret: YOUR_SECRET" https://yourdomain.com/api/admin/content/blog/publish-ready
   ```

3. **Check Server Logs**:
   - Look for log entries showing: `[publishReadyPosts] Published X scheduled blog post(s)`
   - This confirms the cron job is working

4. **Create Test Post**:
   - Schedule a post for 2-3 minutes in the future
   - Wait for scheduled time + 5 minutes
   - Verify it appears on your blog

## Troubleshooting

### Posts Not Publishing

1. **Check Secret Match**: The `CRON_SECRET_BLOG` env variable must match the header value exactly
2. **Check Cron Logs**: Look at your cron service logs or server logs for errors
3. **Test Endpoint**: Try calling the endpoint manually with curl to see if it works
4. **Check Server Time**: Ensure your server timezone matches your scheduling timezone

### 403 Forbidden Error

- The `x-cron-secret` header is missing or incorrect
- Verify the environment variable is set correctly
- Check that the header name is exactly `x-cron-secret` (lowercase with hyphen)

### 500 Internal Server Error

- Check your server logs for the actual error
- Ensure your database connection is working
- Verify the `publishReadyPosts` function can access the database

### Cron Not Running

- Verify the cron job is enabled/active
- Check the schedule is correct (`*/5 * * * *` for every 5 minutes)
- For external services, check their status/dashboard
- For cPanel, verify the cron job shows as active

## Schedule Frequency

- **Every 5 minutes** (`*/5 * * * *`): Recommended - posts publish within 5 minutes of scheduled time
- **Every 1 minute** (`*/1 * * * *`): Most precise but uses more resources
- **Every 15 minutes** (`*/15 * * * *`): More efficient but less precise

## Security Notes

- Keep your `CRON_SECRET_BLOG` secret secure and never commit it to git
- Use a strong random string (at least 32 characters)
- Don't share your secret publicly
- The endpoint will reject requests without the correct secret

## Support

If you encounter issues:
1. Check your server/hosting logs
2. Verify the environment variable is set
3. Test the endpoint manually with curl
4. Contact Hostinger support if you need help with cron job setup
