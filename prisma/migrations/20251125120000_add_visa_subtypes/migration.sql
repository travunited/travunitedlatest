-- Create new enums for structured visa subtype data
CREATE TYPE "VisaMode" AS ENUM ('EVISA', 'STICKER', 'VOA', 'VFS', 'ETA', 'OTHER');

CREATE TYPE "EntryType" AS ENUM ('SINGLE', 'DOUBLE', 'MULTIPLE');

CREATE TYPE "StayType" AS ENUM ('SHORT_STAY', 'LONG_STAY');

-- Preserve the legacy entryType textual column by renaming it
ALTER TABLE "Visa" RENAME COLUMN "entryType" TO "entryTypeLegacy";

-- Add the new structured subtype columns
ALTER TABLE "Visa"
  ADD COLUMN "visaMode" "VisaMode",
  ADD COLUMN "entryType" "EntryType",
  ADD COLUMN "stayType" "StayType",
  ADD COLUMN "visaSubTypeLabel" TEXT;

