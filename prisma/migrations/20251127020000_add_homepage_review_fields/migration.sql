-- AlterTable: Add homepage review fields to Review model
-- Make userId optional for admin-created reviews
ALTER TABLE "Review" 
  ALTER COLUMN "userId" DROP NOT NULL,
  ADD COLUMN "reviewerName" TEXT,
  ADD COLUMN "imageKey" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "link" TEXT;

-- Add index for featured reviews query
CREATE INDEX IF NOT EXISTS "Review_isFeatured_idx" ON "Review"("isFeatured");

-- Add index for active featured reviews (isFeatured + isVisible)
CREATE INDEX IF NOT EXISTS "Review_isFeatured_isVisible_idx" ON "Review"("isFeatured", "isVisible");

