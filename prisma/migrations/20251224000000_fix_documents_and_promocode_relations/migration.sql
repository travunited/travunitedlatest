-- Migration: Fix documents relation and PromoCode issues
-- This ensures the ApplicationDocument table exists and has correct relations
-- Also fixes any PromoCodeUsage relation issues

-- Create PromoDiscountType enum if it doesn't exist
DO $$ 
BEGIN
    CREATE TYPE "PromoDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PromoApplicableType enum if it doesn't exist
DO $$ 
BEGIN
    CREATE TYPE "PromoApplicableType" AS ENUM ('VISAS', 'TOURS', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    -- Ensure ApplicationDocument table exists (it should, but check to be safe)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ApplicationDocument') THEN
        CREATE TABLE "ApplicationDocument" (
            "id" TEXT NOT NULL,
            "applicationId" TEXT NOT NULL,
            "travellerId" TEXT,
            "filePath" TEXT NOT NULL,
            "documentType" TEXT,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "rejectionReason" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            "requirementId" TEXT,
            "fileSize" INTEGER,

            CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
        );
        
        -- Add foreign key to Application
        ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" 
        FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        
        -- Add index on applicationId for performance
        CREATE INDEX IF NOT EXISTS "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");
        CREATE INDEX IF NOT EXISTS "ApplicationDocument_status_idx" ON "ApplicationDocument"("status");
    END IF;

    -- Ensure fileSize column exists (added in previous migration, but check to be safe)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ApplicationDocument' AND column_name = 'fileSize'
    ) THEN
        ALTER TABLE "ApplicationDocument" ADD COLUMN "fileSize" INTEGER;
    END IF;

    -- Ensure PromoCodeUsage table exists and has correct structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCodeUsage') THEN
        CREATE TABLE "PromoCodeUsage" (
            "id" TEXT NOT NULL,
            "promoCodeId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "applicationId" TEXT,
            "bookingId" TEXT,
            "originalAmount" INTEGER NOT NULL DEFAULT 0,
            "discountAmount" INTEGER NOT NULL,
            "finalAmount" INTEGER NOT NULL,
            "ipAddress" TEXT,
            "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "PromoCodeUsage_pkey" PRIMARY KEY ("id")
        );

        -- Add foreign keys for PromoCodeUsage
        ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_promoCodeId_fkey" 
        FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        
        ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        
        ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_applicationId_fkey" 
        FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        
        ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_bookingId_fkey" 
        FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

        -- Add indexes
        CREATE INDEX IF NOT EXISTS "PromoCodeUsage_promoCodeId_idx" ON "PromoCodeUsage"("promoCodeId");
        CREATE INDEX IF NOT EXISTS "PromoCodeUsage_userId_idx" ON "PromoCodeUsage"("userId");
        CREATE INDEX IF NOT EXISTS "PromoCodeUsage_applicationId_idx" ON "PromoCodeUsage"("applicationId");
        CREATE INDEX IF NOT EXISTS "PromoCodeUsage_bookingId_idx" ON "PromoCodeUsage"("bookingId");
    END IF;

    -- Ensure PromoCodeUsage has applicationId column if table exists but column is missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCodeUsage') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'PromoCodeUsage' AND column_name = 'applicationId'
        ) THEN
            ALTER TABLE "PromoCodeUsage" ADD COLUMN "applicationId" TEXT;
            
            -- Add foreign key if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'PromoCodeUsage_applicationId_fkey'
            ) THEN
                ALTER TABLE "PromoCodeUsage" ADD CONSTRAINT "PromoCodeUsage_applicationId_fkey" 
                FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;
            
            CREATE INDEX IF NOT EXISTS "PromoCodeUsage_applicationId_idx" ON "PromoCodeUsage"("applicationId");
        END IF;
    END IF;

    -- Ensure PromoCode table exists (should exist, but check)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCode') THEN

        CREATE TABLE "PromoCode" (
            "id" TEXT NOT NULL,
            "code" TEXT NOT NULL,
            "description" TEXT,
            "discountType" "PromoDiscountType" NOT NULL,
            "discountValue" INTEGER NOT NULL,
            "minPurchaseAmount" INTEGER,
            "maxDiscountAmount" INTEGER,
            "applicableTo" "PromoApplicableType" NOT NULL DEFAULT 'BOTH',
            "visaIds" TEXT[],
            "countryIds" TEXT[],
            "tourIds" TEXT[],
            "maxUses" INTEGER,
            "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
            "currentUses" INTEGER NOT NULL DEFAULT 0,
            "restrictedUserIds" TEXT[],
            "restrictedEmails" TEXT[],
            "newUsersOnly" BOOLEAN NOT NULL DEFAULT false,
            "validFrom" TIMESTAMP(3) NOT NULL,
            "validUntil" TIMESTAMP(3) NOT NULL,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdBy" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "PromoCode_code_key" ON "PromoCode"("code");
        CREATE INDEX IF NOT EXISTS "PromoCode_isActive_idx" ON "PromoCode"("isActive");
    END IF;

END $$;

