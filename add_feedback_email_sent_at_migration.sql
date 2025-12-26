-- Migration: Add feedbackEmailSentAt column to Application table
-- This fixes the schema mismatch error in the visa performance report

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Application') THEN
        ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "feedbackEmailSentAt" TIMESTAMP(3);
    END IF;
END $$;

