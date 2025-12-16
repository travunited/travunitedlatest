/**
 * Database Schema Verification Script
 * 
 * This script verifies that all tables and columns in the database match the Prisma schema.
 * Run with: npx tsx scripts/verify-schema.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Expected tables from Prisma schema
const EXPECTED_TABLES = [
  "User",
  "Application",
  "ApplicationTraveller",
  "ApplicationDocument",
  "Traveller",
  "Booking",
  "BookingTraveller",
  "BookingDocument",
  "Country",
  "Visa",
  "VisaDocumentRequirement",
  "VisaFaq",
  "VisaSubType",
  "TourDay",
  "Tour",
  "TourAddOn",
  "BookingAddOn",
  "Payment",
  "Review",
  "AuditLog",
  "CorporateLead",
  "Setting",
  "BlogPost",
  "Notification",
  "UserNotificationSettings",
  "CareerApplication",
  "ContactMessage",
  "CustomTourRequest",
  "TeamMember",
  "SitePolicy",
  "PasswordReset",
  "EmailEvent",
  "VisaType",
];

// Expected columns for critical tables
const EXPECTED_COLUMNS: Record<string, string[]> = {
  Application: [
    "id",
    "userId",
    "visaTypeId",
    "country",
    "visaType",
    "visaId",
    "visaSubTypeId",
    "status",
    "totalAmount",
    "currency",
    "processedById",
    "visaDocumentUrl",
    "invoiceUrl",
    "invoiceUploadedAt",
    "invoiceUploadedByAdminId",
    "notes",
    "feedbackEmailSentAt",
    "createdAt",
    "updatedAt",
  ],
  Booking: [
    "id",
    "userId",
    "tourId",
    "tourName",
    "status",
    "totalAmount",
    "currency",
    "travelDate",
    "foodPreference",
    "foodPreferenceNotes",
    "languagePreference",
    "languagePreferenceOther",
    "driverPreference",
    "specialRequests",
    "policyAccepted",
    "policyAcceptedAt",
    "policyAcceptedByUserId",
    "policyVersion",
    "policyAcceptedIp",
    "policyAcceptedUserAgent",
    "documents",
    "processedById",
    "voucherUrl",
    "invoiceUrl",
    "invoiceUploadedAt",
    "invoiceUploadedByAdminId",
    "notes",
    "source",
    "createdAt",
    "updatedAt",
  ],
  Visa: [
    "id",
    "countryId",
    "name",
    "slug",
    "subtitle",
    "category",
    "isActive",
    "isFeatured",
    "priceInInr",
    "processingTime",
    "stayDuration",
    "validity",
    "entryTypeLegacy",
    "visaMode",
    "entryType",
    "stayType",
    "visaSubTypeLabel",
    "overview",
    "eligibility",
    "importantNotes",
    "rejectionReasons",
    "whyTravunited",
    "statistics",
    "heroImageUrl",
    "sampleVisaImageUrl",
    "metaTitle",
    "metaDescription",
    "stayDurationDays",
    "validityDays",
    "govtFee",
    "serviceFee",
    "currency",
    "createdAt",
    "updatedAt",
  ],
  Tour: [
    "id",
    "countryId",
    "name",
    "slug",
    "subtitle",
    "destination",
    "duration",
    "overview",
    "price",
    "basePriceInInr",
    "description",
    "shortDescription",
    "originalPrice",
    "currency",
    "durationDays",
    "durationNights",
    "destinationCountry",
    "citiesCovered",
    "images",
    "featuredImage",
    "itinerary",
    "inclusions",
    "exclusions",
    "importantNotes",
    "difficultyLevel",
    "groupSizeMin",
    "groupSizeMax",
    "availableDates",
    "bookingDeadline",
    "status",
    "isActive",
    "isFeatured",
    "categoryId",
    "imageUrl",
    "heroImageUrl",
    "galleryImageUrls",
    "allowAdvance",
    "advancePercentage",
    "requiresPassport",
    "requiredDocuments",
    "childPricingType",
    "childPricingValue",
    "childAgeLimit",
    "metaTitle",
    "metaDescription",
    "metaKeywords",
    "canonicalUrl",
    "ogTitle",
    "ogDescription",
    "ogImage",
    "twitterTitle",
    "twitterDescription",
    "twitterImage",
    "packageType",
    "minimumTravelers",
    "maximumTravelers",
    "hotelCategories",
    "customizationOptions",
    "seasonalPricing",
    "bookingPolicies",
    "cancellationTerms",
    "highlights",
    "bestFor",
    "destinationState",
    "tourType",
    "tourSubType",
    "region",
    "primaryDestination",
    "regionTags",
    "themes",
    "createdAt",
    "updatedAt",
  ],
  Country: [
    "id",
    "name",
    "code",
    "region",
    "flagUrl",
    "isActive",
    "createdAt",
    "updatedAt",
  ],
};

async function verifySchema() {
  console.log("🔍 Verifying database schema...\n");

  try {
    // Test connection
    await prisma.$connect();
    console.log("✓ Database connection successful\n");

    // Check if we can query each expected table
    const missingTables: string[] = [];
    const existingTables: string[] = [];

    for (const table of EXPECTED_TABLES) {
      try {
        // Try to query the table (using raw SQL)
        const result = await prisma.$queryRawUnsafe(
          `SELECT 1 FROM "${table}" LIMIT 1`
        );
        existingTables.push(table);
        console.log(`✓ Table "${table}" exists`);
      } catch (error: any) {
        if (error.code === "42P01") {
          // Table does not exist
          missingTables.push(table);
          console.log(`✗ Table "${table}" is MISSING`);
        } else {
          console.log(`? Table "${table}" - Error: ${error.message}`);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Found: ${existingTables.length} tables`);
    console.log(`   Missing: ${missingTables.length} tables`);

    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing tables:`);
      missingTables.forEach((table) => console.log(`   - ${table}`));
    }

    // Verify critical columns
    console.log(`\n🔍 Verifying critical table columns...\n`);

    for (const [tableName, expectedColumns] of Object.entries(EXPECTED_COLUMNS)) {
      try {
        const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = $1
           ORDER BY ordinal_position`,
          tableName
        );

        const existingColumnNames = columns.map((c) => c.column_name);
        const missingColumns = expectedColumns.filter(
          (col) => !existingColumnNames.includes(col)
        );

        if (missingColumns.length === 0) {
          console.log(`✓ Table "${tableName}" - All columns present`);
        } else {
          console.log(`✗ Table "${tableName}" - Missing columns:`);
          missingColumns.forEach((col) => console.log(`   - ${col}`));
        }
      } catch (error: any) {
        console.log(`? Table "${tableName}" - Error: ${error.message}`);
      }
    }

    console.log(`\n✅ Schema verification complete!`);
  } catch (error: any) {
    console.error(`\n❌ Error during verification:`, error.message);
    if (error.code === "P1001") {
      console.error(`\n💡 Tip: Make sure your database is running and DATABASE_URL is correct.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifySchema();

