# Database Fixes - Complete Guide

This document outlines all database schema fixes that need to be applied to resolve schema mismatches.

## Quick Fix

Run the comprehensive SQL script on your production database:

```bash
psql -h your_host -U your_user -d your_database -f fix_all_database_issues.sql
```

Or execute it directly in your database client.

## Issues Fixed

### 1. Application Table
- ✅ **feedbackEmailSentAt** - Missing column that caused visa performance report errors
  - Type: `TIMESTAMP(3)` (nullable)
  - Purpose: Tracks when feedback email was sent for approved visas

### 2. Booking Table
- ✅ **source** - Missing column for tracking booking source
  - Type: `TEXT` (nullable, default: 'WEBSITE')
  - Purpose: Tracks where bookings come from (WEBSITE, ADMIN, API, etc.)

### 3. BookingTraveller Table
- ✅ **travellerType** - Missing column
- ✅ **lastName** - Missing column (required, default: '')
- ✅ **nationality** - Missing column
- ✅ **passportExpiry** - Missing column
- ✅ **passportFileKey** - Missing column
- ✅ **passportIssuingCountry** - Missing column
- ✅ **passportNumber** - Missing column
- ✅ **isPassportRequired** - Missing column (default: false)
- ✅ **panNumber** - Missing column for Indian travellers
- ✅ **aadharFileKey** - Missing column for Aadhaar file uploads

### 4. ContactMessage Table
- ✅ **name** - Missing column (required)
- ✅ **phone** - Missing column (nullable)
- Note: The script automatically backfills `name` from email for existing records

### 5. ApplicationDocument Table
- ✅ **fileSize** - Missing column for file size tracking

### 6. BookingDocument Table
- ✅ **fileSize** - Missing column for file size tracking

### 7. PasswordReset Table
- ✅ **otp** - Missing column for OTP-based password reset
- ✅ **otpExpiresAt** - Missing column for OTP expiration
- ✅ Indexes for OTP fields

### 8. Tour Table
- ✅ **isActive** - Ensured column exists
- ✅ **requiresPassport** - Ensured column exists
- ✅ **childPricingType** - Ensured column exists
- ✅ **childPricingValue** - Ensured column exists
- ✅ **childAgeLimit** - Ensured column exists
- ✅ **requiredDocuments** - Ensured column exists

## Indexes Created

- `Application_feedbackEmailSentAt_idx` - For efficient querying of feedback emails
- `Application_status_feedbackEmailSentAt_idx` - Composite index for approved visas without feedback
- `PasswordReset_otp_idx` - For OTP lookups
- `PasswordReset_otpExpiresAt_idx` - For expired OTP cleanup

## Verification

The script includes verification checks that will fail if critical columns are missing, helping you identify any remaining issues.

## Migration Files

All fixes are also available as individual migration files:
- `prisma/migrations/20251210000000_add_feedback_email_sent_at/migration.sql`
- `prisma/migrations/20251208_fix_all_missing_columns/migration.sql`
- `prisma/migrations/20251209_add_file_size_to_documents/migration.sql`
- `prisma/migrations/20251206000000_add_otp_to_password_reset/migration.sql`

## After Running the Script

1. **Regenerate Prisma Client** (if needed):
   ```bash
   npx prisma generate
   ```

2. **Verify the fixes**:
   ```bash
   npx prisma validate
   ```

3. **Test your application** to ensure all features work correctly.

## Notes

- All `ALTER TABLE` statements use `IF NOT EXISTS` to prevent errors if columns already exist
- The script is idempotent - safe to run multiple times
- Existing data is preserved - no data loss
- Default values are set where appropriate to ensure data integrity

## Support

If you encounter any issues after running the script, check:
1. Database connection permissions
2. PostgreSQL version compatibility (requires PostgreSQL 9.5+)
3. Schema ownership permissions

