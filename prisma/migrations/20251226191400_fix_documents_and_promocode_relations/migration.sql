-- Migration: Fix documents relation and PromoCode issues
-- This ensures the ApplicationDocument table exists and has correct relations
-- Also ensures PromoCodeUsage relations are properly set up
--
-- IMPORTANT: After running this migration, regenerate Prisma client with:
-- npx prisma generate

-- Ensure ApplicationDocument fileSize column exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ApplicationDocument') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'ApplicationDocument' AND column_name = 'fileSize'
        ) THEN
            ALTER TABLE "ApplicationDocument" ADD COLUMN "fileSize" INTEGER;
        END IF;
    END IF;
END $$;

-- Ensure ApplicationDocument foreign key to Application exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ApplicationDocument') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'ApplicationDocument_applicationId_fkey'
        ) THEN
            ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" 
            FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Ensure ApplicationDocument indexes exist
CREATE INDEX IF NOT EXISTS "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");
CREATE INDEX IF NOT EXISTS "ApplicationDocument_status_idx" ON "ApplicationDocument"("status");
CREATE INDEX IF NOT EXISTS "ApplicationDocument_travellerId_idx" ON "ApplicationDocument"("travellerId");

-- Ensure PromoCodeUsage applicationId column exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCodeUsage') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'PromoCodeUsage' AND column_name = 'applicationId'
        ) THEN
            ALTER TABLE "PromoCodeUsage" ADD COLUMN "applicationId" TEXT;
        END IF;
    END IF;
END $$;

-- Ensure PromoCodeUsage foreign key to Application exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCodeUsage') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'PromoCodeUsage_applicationId_fkey'
        ) THEN
            ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_applicationId_fkey" 
            FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Ensure PromoCodeUsage foreign key to PromoCode exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCodeUsage') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'PromoCodeUsage_promoCodeId_fkey'
        ) THEN
            ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_promoCodeId_fkey" 
            FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Ensure PromoCodeUsage foreign key to User exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCodeUsage') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'PromoCodeUsage_userId_fkey'
        ) THEN
            ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Ensure PromoCodeUsage foreign key to Booking exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCodeUsage') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'PromoCodeUsage' AND column_name = 'bookingId'
        ) THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'PromoCodeUsage_bookingId_fkey'
            ) THEN
                ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_bookingId_fkey" 
                FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- Ensure PromoCodeUsage indexes exist
CREATE INDEX IF NOT EXISTS "PromoCodeUsage_promoCodeId_idx" ON "PromoCodeUsage"("promoCodeId");
CREATE INDEX IF NOT EXISTS "PromoCodeUsage_userId_idx" ON "PromoCodeUsage"("userId");
CREATE INDEX IF NOT EXISTS "PromoCodeUsage_applicationId_idx" ON "PromoCodeUsage"("applicationId");
CREATE INDEX IF NOT EXISTS "PromoCodeUsage_bookingId_idx" ON "PromoCodeUsage"("bookingId");

