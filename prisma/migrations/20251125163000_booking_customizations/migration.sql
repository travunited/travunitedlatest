-- AlterTable: Booking preferences and policy consent
ALTER TABLE "Booking"
ADD COLUMN     "driverPreference" TEXT,
ADD COLUMN     "foodPreference" TEXT,
ADD COLUMN     "foodPreferenceNotes" TEXT,
ADD COLUMN     "languagePreference" TEXT,
ADD COLUMN     "languagePreferenceOther" TEXT,
ADD COLUMN     "policyAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "policyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "policyAcceptedByUserId" TEXT,
ADD COLUMN     "policyAcceptedIp" TEXT,
ADD COLUMN     "policyAcceptedUserAgent" TEXT,
ADD COLUMN     "policyVersion" TEXT,
ADD COLUMN     "specialRequests" TEXT;

-- AlterTable: BookingTraveller passport + metadata
ALTER TABLE "BookingTraveller"
ALTER COLUMN "travellerId" DROP NOT NULL,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "isPassportRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "passportExpiry" TIMESTAMP(3),
ADD COLUMN     "passportFileKey" TEXT,
ADD COLUMN     "passportIssuingCountry" TEXT,
ADD COLUMN     "passportNumber" TEXT;

-- AlterTable: Tour passport rule
ALTER TABLE "Tour"
ADD COLUMN     "requiresPassport" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: TourAddOn
CREATE TABLE "TourAddOn" (
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
CREATE TABLE "BookingAddOn" (
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
CREATE INDEX "TourAddOn_tourId_idx" ON "TourAddOn"("tourId");

ALTER TABLE "TourAddOn"
ADD CONSTRAINT "TourAddOn_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "BookingAddOn_bookingId_idx" ON "BookingAddOn"("bookingId");
CREATE INDEX "BookingAddOn_addOnId_idx" ON "BookingAddOn"("addOnId");

ALTER TABLE "BookingAddOn"
ADD CONSTRAINT "BookingAddOn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingAddOn"
ADD CONSTRAINT "BookingAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "TourAddOn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

