-- AlterTable: Booking preferences and policy consent
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='driverPreference') THEN
        ALTER TABLE "Booking" ADD COLUMN "driverPreference" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='foodPreference') THEN
        ALTER TABLE "Booking" ADD COLUMN "foodPreference" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='foodPreferenceNotes') THEN
        ALTER TABLE "Booking" ADD COLUMN "foodPreferenceNotes" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='languagePreference') THEN
        ALTER TABLE "Booking" ADD COLUMN "languagePreference" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='languagePreferenceOther') THEN
        ALTER TABLE "Booking" ADD COLUMN "languagePreferenceOther" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='policyAccepted') THEN
        ALTER TABLE "Booking" ADD COLUMN "policyAccepted" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='policyAcceptedAt') THEN
        ALTER TABLE "Booking" ADD COLUMN "policyAcceptedAt" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='policyAcceptedByUserId') THEN
        ALTER TABLE "Booking" ADD COLUMN "policyAcceptedByUserId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='policyAcceptedIp') THEN
        ALTER TABLE "Booking" ADD COLUMN "policyAcceptedIp" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='policyAcceptedUserAgent') THEN
        ALTER TABLE "Booking" ADD COLUMN "policyAcceptedUserAgent" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='policyVersion') THEN
        ALTER TABLE "Booking" ADD COLUMN "policyVersion" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Booking' AND column_name='specialRequests') THEN
        ALTER TABLE "Booking" ADD COLUMN "specialRequests" TEXT;
    END IF;
END $$;

-- AlterTable: BookingTraveller passport + metadata
DO $$
BEGIN
    -- Drop NOT NULL constraint safely (only if column exists and is NOT NULL)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='travellerId' AND is_nullable='NO') THEN
        ALTER TABLE "BookingTraveller" ALTER COLUMN "travellerId" DROP NOT NULL;
    END IF;
    
    -- Add columns only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='age') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "age" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='dateOfBirth') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='firstName') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='fullName') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "fullName" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='gender') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "gender" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='isPassportRequired') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "isPassportRequired" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='lastName') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='nationality') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "nationality" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='passportExpiry') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "passportExpiry" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='passportFileKey') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "passportFileKey" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='passportIssuingCountry') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "passportIssuingCountry" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='BookingTraveller' AND column_name='passportNumber') THEN
        ALTER TABLE "BookingTraveller" ADD COLUMN "passportNumber" TEXT;
    END IF;
END $$;

-- AlterTable: Tour passport rule
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='requiresPassport') THEN
        ALTER TABLE "Tour" ADD COLUMN "requiresPassport" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

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

