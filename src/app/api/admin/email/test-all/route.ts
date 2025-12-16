import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordResetOTPEmail,
  sendVisaPaymentSuccessEmail,
  sendVisaPaymentFailedEmail,
  sendVisaStatusUpdateEmail,
  sendVisaDocumentRejectedEmail,
  sendVisaApprovedEmail,
  sendVisaRejectedEmail,
  sendVisaFeedbackEmail,
  sendTourPaymentSuccessEmail,
  sendTourPaymentFailedEmail,
  sendTourConfirmedEmail,
  sendTourPaymentReminderEmail,
  sendTourStatusUpdateEmail,
  sendTourVouchersReadyEmail,
  sendEmailVerificationEmail,
  sendCorporateLeadAdminEmail,
  sendCorporateLeadConfirmationEmail,
  sendCareerApplicationStatusEmail,
  sendAdminWelcomeEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { emailType, testEmail, ...params } = body;

    if (!testEmail || !emailType) {
      return NextResponse.json(
        { error: "Missing required fields: emailType and testEmail" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
    let success = false;
    let error: string | null = null;

    try {
      switch (emailType) {
        case "welcome":
          success = await sendWelcomeEmail(testEmail, params.name || "Test User", "CUSTOMER");
          break;

        case "passwordReset":
          const resetLink = `${baseUrl}/reset-password?token=test-token-123`;
          success = await sendPasswordResetEmail(testEmail, resetLink, "CUSTOMER");
          break;

        case "passwordResetOTP":
          success = await sendPasswordResetOTPEmail(testEmail, "123456", "CUSTOMER");
          break;

        case "emailVerification":
          const verifyLink = `${baseUrl}/verify-email?token=test-token-123`;
          success = await sendEmailVerificationEmail(testEmail, verifyLink, "Test User", "CUSTOMER");
          break;

        case "visaPaymentSuccess":
          success = await sendVisaPaymentSuccessEmail(
            testEmail,
            "test-app-123",
            params.country || "United States",
            params.visaType || "Tourist Visa",
            params.amount || 5000,
            "CUSTOMER"
          );
          break;

        case "visaPaymentFailed":
          success = await sendVisaPaymentFailedEmail(
            testEmail,
            "test-app-123",
            params.country || "United States",
            params.visaType || "Tourist Visa",
            params.amount || 5000,
            params.reason || "Insufficient funds",
            "CUSTOMER"
          );
          break;

        case "visaStatusUpdate":
          success = await sendVisaStatusUpdateEmail(
            testEmail,
            "test-app-123",
            params.country || "United States",
            params.visaType || "Tourist Visa",
            params.status || "UNDER_REVIEW",
            "CUSTOMER"
          );
          break;

        case "visaDocumentRejected":
          success = await sendVisaDocumentRejectedEmail(
            testEmail,
            "test-app-123",
            params.country || "United States",
            params.visaType || "Tourist Visa",
            [{ type: params.documentName || "Passport", reason: params.reason || "Document is not clear" }],
            "CUSTOMER"
          );
          break;

        case "visaApproved":
          success = await sendVisaApprovedEmail(
            testEmail,
            "test-app-123",
            params.country || "United States",
            params.visaType || "Tourist Visa"
          );
          break;

        case "visaRejected":
          success = await sendVisaRejectedEmail(
            testEmail,
            "test-app-123",
            params.country || "United States",
            params.visaType || "Tourist Visa",
            params.reason || "Application does not meet requirements"
          );
          break;

        case "visaFeedback":
          success = await sendVisaFeedbackEmail(
            testEmail,
            "test-app-123",
            params.country || "United States",
            params.visaType || "Tourist Visa",
            params.googleReviewUrl || "https://g.page/r/YOUR_GOOGLE_BUSINESS_REVIEW_LINK",
            "CUSTOMER"
          );
          break;

        case "tourPaymentSuccess":
          success = await sendTourPaymentSuccessEmail(
            testEmail,
            "test-booking-123",
            params.tourName || "Amazing Europe Tour",
            params.amount || 50000,
            params.isAdvance === "true" || params.isAdvance === true,
            params.pendingBalance ? Number(params.pendingBalance) : undefined,
            "CUSTOMER"
          );
          break;

        case "tourPaymentFailed":
          success = await sendTourPaymentFailedEmail(
            testEmail,
            "test-booking-123",
            params.tourName || "Amazing Europe Tour",
            params.amount || 50000,
            params.reason || "Payment declined",
            "CUSTOMER"
          );
          break;

        case "tourConfirmed":
          success = await sendTourConfirmedEmail(
            testEmail,
            "test-booking-123",
            params.tourName || "Amazing Europe Tour",
            "CUSTOMER"
          );
          break;

        case "tourPaymentReminder":
          success = await sendTourPaymentReminderEmail(
            testEmail,
            "test-booking-123",
            params.tourName || "Amazing Europe Tour",
            params.amount || 25000,
            params.dueDate || new Date().toISOString().split("T")[0],
            "CUSTOMER"
          );
          break;

        case "tourStatusUpdate":
          success = await sendTourStatusUpdateEmail(
            testEmail,
            "test-booking-123",
            params.tourName || "Amazing Europe Tour",
            params.status || "CONFIRMED",
            "CUSTOMER"
          );
          break;

        case "tourVouchersReady":
          success = await sendTourVouchersReadyEmail(
            testEmail,
            "test-booking-123",
            params.tourName || "Amazing Europe Tour",
            "CUSTOMER"
          );
          break;

        case "corporateLeadAdmin":
          success = await sendCorporateLeadAdminEmail({
            companyName: params.companyName || "Test Company",
            contactName: params.contactName || "John Doe",
            email: params.email || testEmail,
            phone: params.phone || "+1234567890",
            message: params.message || "Test corporate lead message",
            createdAt: new Date(),
          });
          break;

        case "corporateLeadConfirmation":
          success = await sendCorporateLeadConfirmationEmail(
            testEmail,
            params.contactName || "John Doe",
            params.companyName || "Test Company"
          );
          break;

        case "careerApplicationStatus":
          success = await sendCareerApplicationStatusEmail(
            testEmail,
            params.name || "John Doe",
            params.positionTitle || "Software Engineer",
            params.status || "SHORTLISTED",
            "test-app-123"
          );
          break;

        case "adminWelcome":
          success = await sendAdminWelcomeEmail(
            testEmail,
            params.name || "Admin User",
            "STAFF_ADMIN",
            params.password || "TempPassword123!",
            `${baseUrl}/login`
          );
          break;

        default:
          return NextResponse.json(
            { error: `Unknown email type: ${emailType}` },
            { status: 400 }
          );
      }

      if (success) {
        return NextResponse.json({
          success: true,
          message: `${emailType} email sent successfully`,
          timestamp: new Date().toISOString(),
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to send ${emailType} email. Check server logs for details.`,
          },
          { status: 500 }
        );
      }
    } catch (emailError: any) {
      console.error(`Error sending ${emailType} email:`, emailError);
      return NextResponse.json(
        {
          success: false,
          error: `Error sending email: ${emailError.message || String(emailError)}`,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in test-all email route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

