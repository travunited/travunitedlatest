-- CreateEnum
CREATE TYPE "DocScope" AS ENUM ('PER_TRAVELLER', 'PER_APPLICATION');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "visaId" TEXT;

-- AlterTable
ALTER TABLE "ApplicationDocument" ADD COLUMN     "requirementId" TEXT,
ALTER COLUMN "travellerId" DROP NOT NULL,
ALTER COLUMN "documentType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "tourId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "allowAdvance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "basePriceInInr" INTEGER,
ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "galleryImageUrls" TEXT,
ADD COLUMN     "heroImageUrl" TEXT,
ADD COLUMN     "importantNotes" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "overview" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "subtitle" TEXT;

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "region" TEXT,
    "flagUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visa" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtitle" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "priceInInr" INTEGER NOT NULL,
    "processingTime" TEXT NOT NULL,
    "stayDuration" TEXT NOT NULL,
    "validity" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL,
    "importantNotes" TEXT,
    "rejectionReasons" TEXT,
    "whyTravunited" TEXT,
    "statistics" TEXT,
    "heroImageUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaDocumentRequirement" (
    "id" TEXT NOT NULL,
    "visaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" "DocScope" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaDocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaFaq" (
    "id" TEXT NOT NULL,
    "visaId" TEXT NOT NULL,
    "category" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourDay" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Visa_slug_key" ON "Visa"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_visaId_fkey" FOREIGN KEY ("visaId") REFERENCES "Visa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_travellerId_fkey" FOREIGN KEY ("travellerId") REFERENCES "Traveller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "VisaDocumentRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visa" ADD CONSTRAINT "Visa_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaDocumentRequirement" ADD CONSTRAINT "VisaDocumentRequirement_visaId_fkey" FOREIGN KEY ("visaId") REFERENCES "Visa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaFaq" ADD CONSTRAINT "VisaFaq_visaId_fkey" FOREIGN KEY ("visaId") REFERENCES "Visa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourDay" ADD CONSTRAINT "TourDay_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

