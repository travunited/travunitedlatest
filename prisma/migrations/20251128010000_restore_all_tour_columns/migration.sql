-- Comprehensive migration to restore all Tour table columns
-- This is idempotent - safe to run multiple times

DO $$ 
BEGIN
    -- Core fields (from initial schema)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='name') THEN
        ALTER TABLE "Tour" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='destination') THEN
        ALTER TABLE "Tour" ADD COLUMN "destination" TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='duration') THEN
        ALTER TABLE "Tour" ADD COLUMN "duration" TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='price') THEN
        ALTER TABLE "Tour" ADD COLUMN "price" INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Fields from 20251116191043_cms_models
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='slug') THEN
        ALTER TABLE "Tour" ADD COLUMN "slug" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='subtitle') THEN
        ALTER TABLE "Tour" ADD COLUMN "subtitle" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='overview') THEN
        ALTER TABLE "Tour" ADD COLUMN "overview" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='basePriceInInr') THEN
        ALTER TABLE "Tour" ADD COLUMN "basePriceInInr" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='countryId') THEN
        ALTER TABLE "Tour" ADD COLUMN "countryId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='heroImageUrl') THEN
        ALTER TABLE "Tour" ADD COLUMN "heroImageUrl" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='galleryImageUrls') THEN
        ALTER TABLE "Tour" ADD COLUMN "galleryImageUrls" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='importantNotes') THEN
        ALTER TABLE "Tour" ADD COLUMN "importantNotes" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='isFeatured') THEN
        ALTER TABLE "Tour" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='metaTitle') THEN
        ALTER TABLE "Tour" ADD COLUMN "metaTitle" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='metaDescription') THEN
        ALTER TABLE "Tour" ADD COLUMN "metaDescription" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='allowAdvance') THEN
        ALTER TABLE "Tour" ADD COLUMN "allowAdvance" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Fields from 20251120185544_add_tour_fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='availableDates') THEN
        ALTER TABLE "Tour" ADD COLUMN "availableDates" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='bestFor') THEN
        ALTER TABLE "Tour" ADD COLUMN "bestFor" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='bookingDeadline') THEN
        ALTER TABLE "Tour" ADD COLUMN "bookingDeadline" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='bookingPolicies') THEN
        ALTER TABLE "Tour" ADD COLUMN "bookingPolicies" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='cancellationTerms') THEN
        ALTER TABLE "Tour" ADD COLUMN "cancellationTerms" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='canonicalUrl') THEN
        ALTER TABLE "Tour" ADD COLUMN "canonicalUrl" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='categoryId') THEN
        ALTER TABLE "Tour" ADD COLUMN "categoryId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='citiesCovered') THEN
        ALTER TABLE "Tour" ADD COLUMN "citiesCovered" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='currency') THEN
        ALTER TABLE "Tour" ADD COLUMN "currency" TEXT DEFAULT 'INR';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='customizationOptions') THEN
        ALTER TABLE "Tour" ADD COLUMN "customizationOptions" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='destinationCountry') THEN
        ALTER TABLE "Tour" ADD COLUMN "destinationCountry" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='destinationState') THEN
        ALTER TABLE "Tour" ADD COLUMN "destinationState" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='difficultyLevel') THEN
        ALTER TABLE "Tour" ADD COLUMN "difficultyLevel" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='durationDays') THEN
        ALTER TABLE "Tour" ADD COLUMN "durationDays" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='durationNights') THEN
        ALTER TABLE "Tour" ADD COLUMN "durationNights" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='featuredImage') THEN
        ALTER TABLE "Tour" ADD COLUMN "featuredImage" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='groupSizeMax') THEN
        ALTER TABLE "Tour" ADD COLUMN "groupSizeMax" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='groupSizeMin') THEN
        ALTER TABLE "Tour" ADD COLUMN "groupSizeMin" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='highlights') THEN
        ALTER TABLE "Tour" ADD COLUMN "highlights" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='hotelCategories') THEN
        ALTER TABLE "Tour" ADD COLUMN "hotelCategories" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='images') THEN
        ALTER TABLE "Tour" ADD COLUMN "images" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='maximumTravelers') THEN
        ALTER TABLE "Tour" ADD COLUMN "maximumTravelers" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='metaKeywords') THEN
        ALTER TABLE "Tour" ADD COLUMN "metaKeywords" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='minimumTravelers') THEN
        ALTER TABLE "Tour" ADD COLUMN "minimumTravelers" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='ogDescription') THEN
        ALTER TABLE "Tour" ADD COLUMN "ogDescription" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='ogImage') THEN
        ALTER TABLE "Tour" ADD COLUMN "ogImage" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='ogTitle') THEN
        ALTER TABLE "Tour" ADD COLUMN "ogTitle" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='originalPrice') THEN
        ALTER TABLE "Tour" ADD COLUMN "originalPrice" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='packageType') THEN
        ALTER TABLE "Tour" ADD COLUMN "packageType" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='primaryDestination') THEN
        ALTER TABLE "Tour" ADD COLUMN "primaryDestination" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='region') THEN
        ALTER TABLE "Tour" ADD COLUMN "region" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='regionTags') THEN
        ALTER TABLE "Tour" ADD COLUMN "regionTags" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='seasonalPricing') THEN
        ALTER TABLE "Tour" ADD COLUMN "seasonalPricing" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='shortDescription') THEN
        ALTER TABLE "Tour" ADD COLUMN "shortDescription" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='status') THEN
        ALTER TABLE "Tour" ADD COLUMN "status" TEXT DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='themes') THEN
        ALTER TABLE "Tour" ADD COLUMN "themes" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='tourSubType') THEN
        ALTER TABLE "Tour" ADD COLUMN "tourSubType" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='tourType') THEN
        ALTER TABLE "Tour" ADD COLUMN "tourType" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='twitterDescription') THEN
        ALTER TABLE "Tour" ADD COLUMN "twitterDescription" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='twitterImage') THEN
        ALTER TABLE "Tour" ADD COLUMN "twitterImage" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='twitterTitle') THEN
        ALTER TABLE "Tour" ADD COLUMN "twitterTitle" TEXT;
    END IF;

    -- Fields from 20251127000000_add_policies_child_pricing_documents
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='childPricingType') THEN
        ALTER TABLE "Tour" ADD COLUMN "childPricingType" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='childPricingValue') THEN
        ALTER TABLE "Tour" ADD COLUMN "childPricingValue" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='childAgeLimit') THEN
        ALTER TABLE "Tour" ADD COLUMN "childAgeLimit" INTEGER DEFAULT 12;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='requiredDocuments') THEN
        ALTER TABLE "Tour" ADD COLUMN "requiredDocuments" JSONB;
    END IF;

    -- Additional fields that might be missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='description') THEN
        ALTER TABLE "Tour" ADD COLUMN "description" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='itinerary') THEN
        ALTER TABLE "Tour" ADD COLUMN "itinerary" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='inclusions') THEN
        ALTER TABLE "Tour" ADD COLUMN "inclusions" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='exclusions') THEN
        ALTER TABLE "Tour" ADD COLUMN "exclusions" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='imageUrl') THEN
        ALTER TABLE "Tour" ADD COLUMN "imageUrl" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='advancePercentage') THEN
        ALTER TABLE "Tour" ADD COLUMN "advancePercentage" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='requiresPassport') THEN
        ALTER TABLE "Tour" ADD COLUMN "requiresPassport" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='isActive') THEN
        ALTER TABLE "Tour" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- Ensure createdAt and updatedAt exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='createdAt') THEN
        ALTER TABLE "Tour" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tour' AND column_name='updatedAt') THEN
        ALTER TABLE "Tour" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

END $$;

-- Create unique index on slug if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "Tour_slug_key" ON "Tour"("slug") WHERE "slug" IS NOT NULL;

-- Add foreign key constraint for countryId if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Tour_countryId_fkey' 
        AND table_name = 'Tour'
    ) THEN
        ALTER TABLE "Tour" ADD CONSTRAINT "Tour_countryId_fkey" 
        FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

