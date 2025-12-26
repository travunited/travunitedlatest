-- AlterTable
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Tour' AND column_name = 'amenities'
  ) THEN
    ALTER TABLE "Tour" ADD COLUMN "amenities" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Tour' AND column_name = 'showAmenities'
  ) THEN
    ALTER TABLE "Tour" ADD COLUMN "showAmenities" BOOLEAN DEFAULT false;
  END IF;
END $$;

