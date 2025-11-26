-- AlterTable: Booking preferences and policy consent
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "driverPreference" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "foodPreference" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "foodPreferenceNotes" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "languagePreference" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "languagePreferenceOther" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "policyAccepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "policyAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "policyAcceptedByUserId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "policyAcceptedIp" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "policyAcceptedUserAgent" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "policyVersion" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "specialRequests" TEXT;

-- AlterTable: BookingTraveller passport + metadata
-- Drop NOT NULL constraint safely (only if column exists and is NOT NULL)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='travellerId' AND is_nullable='NO') THEN
        ALTER TABLE "BookingTraveller" ALTER COLUMN "travellerId" DROP NOT NULL;
    END IF;
END $$;

-- Add columns using IF NOT EXISTS (more reliable than information_schema checks)
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "age" INTEGER;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "fullName" TEXT;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "isPassportRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "passportExpiry" TIMESTAMP(3);
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "passportFileKey" TEXT;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "passportIssuingCountry" TEXT;
ALTER TABLE "BookingTraveller" ADD COLUMN IF NOT EXISTS "passportNumber" TEXT;

-- AlterTable: Tour passport rule
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "requiresPassport" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: TourAddOn
CREATE TABLE IF NOT EXISTS "TourAddOn" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "pricingType" TEXT NOT NULL DEFAULT 'PER_BOOKING',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BookingAddOn
CREATE TABLE IF NOT EXISTS "BookingAddOn" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "addOnId" TEXT,
    "name" TEXT NOT NULL,
    "pricingType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "totalPrice" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex & Foreign Keys
CREATE INDEX IF NOT EXISTS "TourAddOn_tourId_idx" ON "TourAddOn"("tourId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'TourAddOn_tourId_fkey'
    ) THEN
        ALTER TABLE "TourAddOn"
        ADD CONSTRAINT "TourAddOn_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "BookingAddOn_bookingId_idx" ON "BookingAddOn"("bookingId");
CREATE INDEX IF NOT EXISTS "BookingAddOn_addOnId_idx" ON "BookingAddOn"("addOnId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'BookingAddOn_bookingId_fkey'
    ) THEN
        ALTER TABLE "BookingAddOn"
        ADD CONSTRAINT "BookingAddOn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'BookingAddOn_addOnId_fkey'
    ) THEN
        ALTER TABLE "BookingAddOn"
        ADD CONSTRAINT "BookingAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "TourAddOn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

