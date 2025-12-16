-- Comprehensive Database Fix Script
-- This script fixes all known database schema mismatches
-- Run this script on your production database to ensure all columns and tables exist

-- ============================================
-- Application Table Fixes
-- ============================================

-- Add feedbackEmailSentAt column if missing
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "feedbackEmailSentAt" TIMESTAMP(3);

-- ============================================
-- Booking Table Fixes
-- ============================================

-- Ensure source column exists
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'WEBSITE';

-- ============================================
-- BookingTraveller Table Fixes
-- ============================================

-- Ensure all required columns exist
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "travellerType" TEXT;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "passportExpiry" TIMESTAMP(3);
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "passportFileKey" TEXT;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "passportIssuingCountry" TEXT;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "passportNumber" TEXT;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "isPassportRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "panNumber" TEXT;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "aadharFileKey" TEXT;

-- ============================================
-- ContactMessage Table Fixes
-- ============================================

-- Add name and phone columns if missing
DO $$
BEGIN
    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ContactMessage' AND column_name = 'name'
    ) THEN
        ALTER TABLE "ContactMessage" ADD COLUMN "name" TEXT;
        -- Backfill name from email for existing rows
        UPDATE "ContactMessage" 
        SET "name" = COALESCE(
            SPLIT_PART("email", '@', 1), 
            'Unknown'
        )
        WHERE "name" IS NULL;
        -- Make name NOT NULL after backfill
        ALTER TABLE "ContactMessage" ALTER COLUMN "name" SET NOT NULL;
    END IF;

    -- Add phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ContactMessage' AND column_name = 'phone'
    ) THEN
        ALTER TABLE "ContactMessage" ADD COLUMN "phone" TEXT;
    END IF;
END $$;

-- ============================================
-- ApplicationDocument Table Fixes
-- ============================================

-- Ensure fileSize column exists
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;

-- ============================================
-- BookingDocument Table Fixes
-- ============================================

-- Ensure fileSize column exists
ALTER TABLE "BookingDocument" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;

-- ============================================
-- PasswordReset Table Fixes
-- ============================================

-- Ensure OTP columns exist
ALTER TABLE "PasswordReset" ADD COLUMN IF NOT EXISTS "otp" TEXT;
ALTER TABLE "PasswordReset" ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP(3);

-- Create indexes for OTP if they don't exist
CREATE INDEX IF NOT EXISTS "PasswordReset_otp_idx" ON "PasswordReset"("otp");
CREATE INDEX IF NOT EXISTS "PasswordReset_otpExpiresAt_idx" ON "PasswordReset"("otpExpiresAt");

-- ============================================
-- Tour Table Fixes
-- ============================================

-- Ensure all tour columns exist (these should already exist, but adding IF NOT EXISTS for safety)
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "requiresPassport" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "childPricingType" TEXT;
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "childPricingValue" INTEGER;
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "childAgeLimit" INTEGER DEFAULT 12;
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "requiredDocuments" JSONB;

-- ============================================
-- Indexes
-- ============================================

-- Create indexes for Application.feedbackEmailSentAt if they don't exist
CREATE INDEX IF NOT EXISTS "Application_feedbackEmailSentAt_idx" ON "Application"("feedbackEmailSentAt");
CREATE INDEX IF NOT EXISTS "Application_status_feedbackEmailSentAt_idx" ON "Application"("status", "feedbackEmailSentAt") 
WHERE "status" = 'APPROVED';

-- ============================================
-- Verify Critical Columns
-- ============================================

-- This will fail if critical columns are missing (helpful for debugging)
DO $$
BEGIN
    -- Check Application table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Application' AND column_name = 'feedbackEmailSentAt'
    ) THEN
        RAISE EXCEPTION 'Application.feedbackEmailSentAt column is missing';
    END IF;

    -- Check Booking table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Booking' AND column_name = 'source'
    ) THEN
        RAISE EXCEPTION 'Booking.source column is missing';
    END IF;

    -- Check ContactMessage table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ContactMessage' AND column_name = 'name'
    ) THEN
        RAISE EXCEPTION 'ContactMessage.name column is missing';
    END IF;
END $$;

-- Success message
SELECT 'All database fixes applied successfully!' AS status;

