-- AlterTable
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Booking' AND column_name = 'cancellationReason'
  ) THEN
    ALTER TABLE "Booking" ADD COLUMN "cancellationReason" TEXT;
  END IF;
END $$;

