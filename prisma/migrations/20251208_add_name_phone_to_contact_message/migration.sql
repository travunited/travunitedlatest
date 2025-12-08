-- Add required name column and optional phone column to ContactMessage
ALTER TABLE "ContactMessage"
ADD COLUMN "name" TEXT NOT NULL,
ADD COLUMN "phone" TEXT;

