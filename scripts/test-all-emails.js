#!/usr/bin/env node

/**
 * Comprehensive Email Testing Script
 * Tests all email types to ensure they're working correctly
 * 
 * Usage: node scripts/test-all-emails.js <test-email>
 * Example: node scripts/test-all-emails.js test@example.com
 */

const EMAIL_TYPES = [
  {
    name: "Welcome Email",
    type: "welcome",
    params: { name: "Test User" },
  },
  {
    name: "Password Reset Email",
    type: "passwordReset",
    params: {},
  },
  {
    name: "Password Reset OTP Email",
    type: "passwordResetOTP",
    params: {},
  },
  {
    name: "Email Verification Email",
    type: "emailVerification",
    params: { name: "Test User" },
  },
  {
    name: "Visa Payment Success Email",
    type: "visaPaymentSuccess",
    params: { country: "United States", visaType: "Tourist Visa", amount: 5000 },
  },
  {
    name: "Visa Payment Failed Email",
    type: "visaPaymentFailed",
    params: { country: "United States", visaType: "Tourist Visa", amount: 5000, reason: "Insufficient funds" },
  },
  {
    name: "Visa Status Update Email",
    type: "visaStatusUpdate",
    params: { country: "United States", visaType: "Tourist Visa", status: "UNDER_REVIEW" },
  },
  {
    name: "Visa Document Rejected Email",
    type: "visaDocumentRejected",
    params: { country: "United States", visaType: "Tourist Visa", documentName: "Passport", reason: "Document is not clear" },
  },
  {
    name: "Visa Approved Email",
    type: "visaApproved",
    params: { country: "United States", visaType: "Tourist Visa" },
  },
  {
    name: "Visa Rejected Email",
    type: "visaRejected",
    params: { country: "United States", visaType: "Tourist Visa", reason: "Application does not meet requirements" },
  },
  {
    name: "Visa Feedback Email",
    type: "visaFeedback",
    params: { country: "United States", visaType: "Tourist Visa", googleReviewUrl: "https://g.page/r/YOUR_GOOGLE_BUSINESS_REVIEW_LINK" },
  },
  {
    name: "Tour Payment Success Email",
    type: "tourPaymentSuccess",
    params: { tourName: "Amazing Europe Tour", amount: 50000, isAdvance: false },
  },
  {
    name: "Tour Payment Failed Email",
    type: "tourPaymentFailed",
    params: { tourName: "Amazing Europe Tour", amount: 50000, reason: "Payment declined" },
  },
  {
    name: "Tour Confirmed Email",
    type: "tourConfirmed",
    params: { tourName: "Amazing Europe Tour" },
  },
  {
    name: "Tour Payment Reminder Email",
    type: "tourPaymentReminder",
    params: { tourName: "Amazing Europe Tour", amount: 25000, dueDate: new Date().toISOString().split("T")[0] },
  },
  {
    name: "Tour Status Update Email",
    type: "tourStatusUpdate",
    params: { tourName: "Amazing Europe Tour", status: "CONFIRMED" },
  },
  {
    name: "Tour Vouchers Ready Email",
    type: "tourVouchersReady",
    params: { tourName: "Amazing Europe Tour" },
  },
  {
    name: "Corporate Lead Admin Email",
    type: "corporateLeadAdmin",
    params: { companyName: "Test Company", contactName: "John Doe", email: "", phone: "+1234567890", message: "Test corporate lead message" },
  },
  {
    name: "Corporate Lead Confirmation Email",
    type: "corporateLeadConfirmation",
    params: { contactName: "John Doe", companyName: "Test Company" },
  },
  {
    name: "Career Application Status Email",
    type: "careerApplicationStatus",
    params: { name: "John Doe", positionTitle: "Software Engineer", status: "SHORTLISTED" },
  },
  {
    name: "Admin Welcome Email",
    type: "adminWelcome",
    params: { name: "Admin User", password: "TempPassword123!" },
  },
];

async function testEmail(testEmail, emailType, baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/admin/email/test-all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Note: This requires authentication - you'll need to provide a valid session cookie
        // or modify the endpoint to accept an API key for testing
      },
      body: JSON.stringify({
        emailType: emailType.type,
        testEmail,
        ...emailType.params,
      }),
    });

    const result = await response.json();
    return {
      success: response.ok && result.success,
      error: result.error || (response.ok ? null : `HTTP ${response.status}`),
      message: result.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: null,
    };
  }
}

async function checkEmailConfig(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/admin/email/diagnostics`, {
      method: "GET",
    });

    if (response.ok) {
      const config = await response.json();
      return config;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function main() {
  const testEmail = process.argv[2];
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!testEmail) {
    console.error("❌ Error: Test email address is required");
    console.log("\nUsage: node scripts/test-all-emails.js <test-email>");
    console.log("Example: node scripts/test-all-emails.js test@example.com");
    process.exit(1);
  }

  console.log("📧 Email Testing Script");
  console.log("=" .repeat(50));
  console.log(`Test Email: ${testEmail}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log("=" .repeat(50));
  console.log();

  // Check email configuration
  console.log("🔍 Checking email configuration...");
  const config = await checkEmailConfig(baseUrl);
  if (config) {
    console.log("✅ Email configuration found");
    console.log(`   AWS Region: ${config.awsRegion || "Not configured"}`);
    console.log(`   From General: ${config.emailFromGeneral || "Not configured"}`);
    console.log(`   From Visa: ${config.emailFromVisa || "Not configured"}`);
    console.log(`   From Tours: ${config.emailFromTours || "Not configured"}`);
  } else {
    console.log("⚠️  Could not fetch email configuration");
  }
  console.log();

  // Test each email type
  console.log(`🧪 Testing ${EMAIL_TYPES.length} email types...`);
  console.log();

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const emailType of EMAIL_TYPES) {
    process.stdout.write(`Testing ${emailType.name}... `);
    const result = await testEmail(testEmail, emailType, baseUrl);
    
    if (result.success) {
      console.log("✅ Success");
      successCount++;
    } else {
      console.log(`❌ Failed: ${result.error || "Unknown error"}`);
      failCount++;
    }
    
    results.push({
      name: emailType.name,
      type: emailType.type,
      ...result,
    });
    
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log();
  console.log("=" .repeat(50));
  console.log("📊 Test Results Summary");
  console.log("=" .repeat(50));
  console.log(`Total: ${EMAIL_TYPES.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log();

  if (failCount > 0) {
    console.log("❌ Failed Tests:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.error || "Unknown error"}`);
      });
    console.log();
  }

  console.log("💡 Note: This script requires authentication.");
  console.log("   Make sure you're logged in as SUPER_ADMIN or modify the endpoint");
  console.log("   to accept an API key for testing purposes.");
  console.log();

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

