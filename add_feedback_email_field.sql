-- Migration: Add feedbackEmailSentAt field to Application table
-- This field tracks when a feedback email was sent to users whose visas were approved

ALTER TABLE "Application" 
ADD COLUMN IF NOT EXISTS "feedbackEmailSentAt" TIMESTAMP(3);

-- Add comment to document the field
COMMENT ON COLUMN "Application"."feedbackEmailSentAt" IS 'Timestamp when feedback email was sent for approved visas (sent 24 hours after approval)';

-- Index for efficient querying (optional but recommended)
CREATE INDEX IF NOT EXISTS "Application_feedbackEmailSentAt_idx" ON "Application"("feedbackEmailSentAt");

-- Index for querying approved visas without feedback email sent
CREATE INDEX IF NOT EXISTS "Application_status_feedbackEmailSentAt_idx" ON "Application"("status", "feedbackEmailSentAt") 
WHERE "status" = 'APPROVED';
