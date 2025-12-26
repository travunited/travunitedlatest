-- AlterTable
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Tour' AND column_name = 'optionalActivities'
  ) THEN
    ALTER TABLE "Tour" ADD COLUMN "optionalActivities" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Tour' AND column_name = 'showOptionalActivities'
  ) THEN
    ALTER TABLE "Tour" ADD COLUMN "showOptionalActivities" BOOLEAN DEFAULT false;
  END IF;
END $$;

