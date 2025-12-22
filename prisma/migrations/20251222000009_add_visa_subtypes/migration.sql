-- Create new enums for structured visa subtype data (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VisaMode') THEN
        CREATE TYPE "VisaMode" AS ENUM ('EVISA', 'STICKER', 'VOA', 'VFS', 'ETA', 'OTHER');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EntryType') THEN
        CREATE TYPE "EntryType" AS ENUM ('SINGLE', 'DOUBLE', 'MULTIPLE');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StayType') THEN
        CREATE TYPE "StayType" AS ENUM ('SHORT_STAY', 'LONG_STAY');
    END IF;
END $$;

-- Preserve the legacy entryType textual column by renaming it (only if it exists and hasn't been renamed)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Visa' 
        AND column_name = 'entryType'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Visa' 
        AND column_name = 'entryTypeLegacy'
    ) THEN
        ALTER TABLE "Visa" RENAME COLUMN "entryType" TO "entryTypeLegacy";
    END IF;
END $$;

-- Add the new structured subtype columns (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Visa' 
        AND column_name = 'visaMode'
    ) THEN
        ALTER TABLE "Visa" ADD COLUMN "visaMode" "VisaMode";
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Visa' 
        AND column_name = 'entryType'
    ) THEN
        ALTER TABLE "Visa" ADD COLUMN "entryType" "EntryType";
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Visa' 
        AND column_name = 'stayType'
    ) THEN
        ALTER TABLE "Visa" ADD COLUMN "stayType" "StayType";
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Visa' 
        AND column_name = 'visaSubTypeLabel'
    ) THEN
        ALTER TABLE "Visa" ADD COLUMN "visaSubTypeLabel" TEXT;
    END IF;
END $$;

