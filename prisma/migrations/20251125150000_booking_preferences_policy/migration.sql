-- Alter table Booking to store add-on selections, preferences, and policy consent
ALTER TABLE "Booking"
ADD COLUMN     "foodPreference" TEXT,
ADD COLUMN     "foodPreferenceNotes" TEXT,
ADD COLUMN     "languagePreference" TEXT,
ADD COLUMN     "languagePreferenceOther" TEXT,
ADD COLUMN     "driverPreference" TEXT,
ADD COLUMN     "specialRequests" TEXT,
ADD COLUMN     "policyAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "policyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "policyAcceptedByUserId" TEXT,
ADD COLUMN     "policyVersion" TEXT,
ADD COLUMN     "policyAcceptedIp" TEXT,
ADD COLUMN     "policyAcceptedUserAgent" TEXT;

-- Extend BookingTraveller with per-booking traveller + passport metadata
ALTER TABLE "BookingTraveller"
ALTER COLUMN "travellerId" DROP NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "passportNumber" TEXT,
ADD COLUMN     "passportExpiry" TIMESTAMP(3),
ADD COLUMN     "passportIssuingCountry" TEXT,
ADD COLUMN     "passportFileKey" TEXT,
ADD COLUMN     "isPassportRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

