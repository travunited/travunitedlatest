-- Migration: Add feedbackEmailSentAt column to Application table
-- This fixes the schema mismatch error in the visa performance report

ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "feedbackEmailSentAt" TIMESTAMP(3);

