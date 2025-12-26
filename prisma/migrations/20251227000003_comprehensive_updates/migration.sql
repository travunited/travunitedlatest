-- Comprehensive migration for all pending database schema updates

-- ============================================
-- TOUR TABLE UPDATES
-- ============================================

-- Add Tour amenities columns
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

  -- Add mapLogisticsImageUrl column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Tour' AND column_name = 'mapLogisticsImageUrl'
  ) THEN
    ALTER TABLE "Tour" ADD COLUMN "mapLogisticsImageUrl" TEXT;
  END IF;

  -- Add optional activities columns
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

-- ============================================
-- PAYMENT TABLE UPDATES
-- ============================================

-- Add Payment promo code columns
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

-- Add foreign key constraint for Payment.promoCodeId
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

