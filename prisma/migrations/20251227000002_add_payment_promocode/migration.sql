-- AlterTable
DO $$
BEGIN
  -- Add promoCodeId column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Payment' AND column_name = 'promoCodeId'
  ) THEN
    ALTER TABLE "Payment" ADD COLUMN "promoCodeId" TEXT;
  END IF;

  -- Add discountAmount column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Payment' AND column_name = 'discountAmount'
  ) THEN
    ALTER TABLE "Payment" ADD COLUMN "discountAmount" INTEGER;
  END IF;
END $$;

-- AddForeignKey (only if PromoCode table exists)
DO $$
BEGIN
  -- Check if PromoCode table exists before adding foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'PromoCode'
  ) THEN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'Payment_promoCodeId_fkey'
      AND table_name = 'Payment'
    ) THEN
      ALTER TABLE "Payment" ADD CONSTRAINT "Payment_promoCodeId_fkey" 
      FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

