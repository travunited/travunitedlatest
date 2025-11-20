-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "availableDates" TEXT,
ADD COLUMN     "bestFor" TEXT,
ADD COLUMN     "bookingDeadline" TIMESTAMP(3),
ADD COLUMN     "bookingPolicies" TEXT,
ADD COLUMN     "cancellationTerms" TEXT,
ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "citiesCovered" TEXT,
ADD COLUMN     "currency" TEXT DEFAULT 'INR',
ADD COLUMN     "customizationOptions" TEXT,
ADD COLUMN     "destinationCountry" TEXT,
ADD COLUMN     "destinationState" TEXT,
ADD COLUMN     "difficultyLevel" TEXT,
ADD COLUMN     "durationDays" INTEGER,
ADD COLUMN     "durationNights" INTEGER,
ADD COLUMN     "featuredImage" TEXT,
ADD COLUMN     "groupSizeMax" INTEGER,
ADD COLUMN     "groupSizeMin" INTEGER,
ADD COLUMN     "highlights" TEXT,
ADD COLUMN     "hotelCategories" TEXT,
ADD COLUMN     "images" TEXT,
ADD COLUMN     "maximumTravelers" INTEGER,
ADD COLUMN     "metaKeywords" TEXT,
ADD COLUMN     "minimumTravelers" INTEGER,
ADD COLUMN     "ogDescription" TEXT,
ADD COLUMN     "ogImage" TEXT,
ADD COLUMN     "ogTitle" TEXT,
ADD COLUMN     "originalPrice" INTEGER,
ADD COLUMN     "packageType" TEXT,
ADD COLUMN     "primaryDestination" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "regionTags" TEXT,
ADD COLUMN     "seasonalPricing" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'active',
ADD COLUMN     "themes" TEXT,
ADD COLUMN     "tourSubType" TEXT,
ADD COLUMN     "tourType" TEXT,
ADD COLUMN     "twitterDescription" TEXT,
ADD COLUMN     "twitterImage" TEXT,
ADD COLUMN     "twitterTitle" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleScope" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "link" TEXT,
    "channelEmail" BOOLEAN NOT NULL DEFAULT false,
    "channelInApp" BOOLEAN NOT NULL DEFAULT true,
    "channelPush" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" JSONB NOT NULL DEFAULT '{}',
    "inAppEnabled" JSONB NOT NULL DEFAULT '{}',
    "pushEnabled" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId");
