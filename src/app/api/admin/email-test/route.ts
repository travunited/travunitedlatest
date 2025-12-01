import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendVisaPaymentSuccessEmail,
  sendVisaStatusUpdateEmail,
  sendVisaDocumentRejectedEmail,
  sendVisaApprovedEmail,
  sendVisaRejectedEmail,
  sendTourPaymentSuccessEmail,
  sendTourConfirmedEmail,
  sendTourPaymentReminderEmail,
  sendTourStatusUpdateEmail,
  sendTourVouchersReadyEmail,
  sendCorporateLeadAdminEmail,
  sendCorporateLeadConfirmationEmail,
  getEmailServiceConfig,
  getLastEmailError,
} from "@/lib/email";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { testId, email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required" },
        { status: 400 }
      );
    }

    if (!testId) {
      return NextResponse.json(
        { success: false, error: "Test ID is required" },
        { status: 400 }
      );
    }

    // Test data
    const testApplicationId = "test-app-12345678";
    const testBookingId = "test-booking-12345678";
    const testCountry = "United States";
    const testVisaType = "Tourist Visa";
    const testTourName = "Amazing Europe Tour";
    const testAmount = 50000; // ₹500.00 in paise
    const testResetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=test-token-123`;
    const testVerificationLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/verify-email?token=test-token-123`;

    // Check email configuration first
    const emailServiceConfig = await getEmailServiceConfig();
    if (!emailServiceConfig.awsAccessKeyId || !emailServiceConfig.awsSecretAccessKey || !emailServiceConfig.awsRegion) {
      return NextResponse.json(
        {
          success: false,
          message: "Email service not configured",
          error:
            "AWS SES credentials are not set. Please configure AWS Access Key ID, Secret Access Key, and Region in Admin → Settings → Email Service Configuration.",
        },
        { status: 500 }
      );
    }

    if (!emailServiceConfig.emailFromGeneral) {
      return NextResponse.json(
        {
          success: false,
          message: "Email service not configured",
          error:
            "General sender email is not set. Please configure it in Admin → Settings → Email Service Configuration.",
        },
        { status: 500 }
      );
    }

    let result: { success: boolean; message: string; error?: string };

    const failWithLastEmailError = () => {
      const lastError = getLastEmailError();
      throw new Error(
        lastError ||
          "Email provider rejected the request. Check AWS SES configuration or server logs."
      );
    };

    try {
      let emailSent = false;
      
      switch (testId) {
        case "password-reset":
          emailSent = await sendPasswordResetEmail(email, testResetLink);
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Password reset email sent successfully" };
          break;

        case "email-verification":
          emailSent = await sendEmailVerificationEmail(email, testVerificationLink, "Test User");
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Email verification email sent successfully" };
          break;

        case "visa-payment-success":
          emailSent = await sendVisaPaymentSuccessEmail(
            email,
            testApplicationId,
            testCountry,
            testVisaType,
            testAmount,
            "CUSTOMER"
          );
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Visa payment success email sent successfully" };
          break;

        case "visa-status-update":
          emailSent = await sendVisaStatusUpdateEmail(
            email,
            testApplicationId,
            testCountry,
            testVisaType,
            "IN_PROCESS"
          );
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Visa status update email sent successfully" };
          break;

        case "visa-document-rejected":
          emailSent = await sendVisaDocumentRejectedEmail(
            email,
            testApplicationId,
            testCountry,
            testVisaType,
            [
              { type: "Passport Copy", reason: "Image quality is too low. Please upload a clear, high-resolution scan." },
              { type: "Photo", reason: "Photo does not meet requirements. Please use a recent passport-size photo." },
            ]
          );
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Visa document rejected email sent successfully" };
          break;

        case "visa-approved":
          emailSent = await sendVisaApprovedEmail(
            email,
            testApplicationId,
            testCountry,
            testVisaType
          );
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Visa approved email sent successfully" };
          break;

        case "visa-rejected":
          emailSent = await sendVisaRejectedEmail(
            email,
            testApplicationId,
            testCountry,
            testVisaType,
            "Incomplete documentation provided"
          );
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Visa rejected email sent successfully" };
          break;

        case "tour-payment-success":
          emailSent = await sendTourPaymentSuccessEmail(
            email,
            testBookingId,
            testTourName,
            testAmount,
            false, // isAdvance
            0, // pendingBalance
            "CUSTOMER"
          );
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Tour payment success email sent successfully" };
          break;

        case "tour-confirmed":
          emailSent = await sendTourConfirmedEmail(email, testBookingId, testTourName);
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Tour confirmed email sent successfully" };
          break;

        case "tour-payment-reminder":
          emailSent = await sendTourPaymentReminderEmail(
            email,
            testBookingId,
            testTourName,
            25000, // pendingBalance
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
          );
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Tour payment reminder email sent successfully" };
          break;

        case "tour-status-update":
          emailSent = await sendTourStatusUpdateEmail(
            email,
            testBookingId,
            testTourName,
            "CONFIRMED"
          );
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Tour status update email sent successfully" };
          break;

        case "tour-vouchers-ready":
          emailSent = await sendTourVouchersReadyEmail(email, testBookingId, testTourName);
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Tour vouchers ready email sent successfully" };
          break;

        case "corporate-lead-admin":
          emailSent = await sendCorporateLeadAdminEmail({
            companyName: "Test Company Ltd",
            contactName: "John Doe",
            email: email,
            phone: "+91 1234567890",
            message: "This is a test corporate lead message. We are interested in corporate travel solutions for our team.",
            createdAt: new Date(),
          });
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Corporate lead admin email sent successfully" };
          break;

        case "corporate-lead-confirmation":
          emailSent = await sendCorporateLeadConfirmationEmail(
            email,
            "Test Company Ltd",
            "John Doe"
          );
          if (!emailSent) {
            failWithLastEmailError();
          }
          result = { success: true, message: "Corporate lead confirmation email sent successfully" };
          break;

        default:
          return NextResponse.json(
            { success: false, error: `Unknown test ID: ${testId}` },
            { status: 400 }
          );
      }

      return NextResponse.json(result);
    } catch (emailError) {
      const detailedError = getLastEmailError();
      console.error(`Error sending test email ${testId}:`, emailError, {
        detailedError,
      });
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send email",
          error:
            detailedError ||
            (emailError instanceof Error ? emailError.message : "Unknown error"),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in email test API:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

