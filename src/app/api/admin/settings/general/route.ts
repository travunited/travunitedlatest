import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { refreshEmailConfigCache } from "@/lib/email";
export const dynamic = "force-dynamic";



const GENERAL_KEY = "GENERAL";
const EMAIL_SNIPPETS_KEY = "EMAIL_SNIPPETS";
const ANALYTICS_KEY = "ANALYTICS";
const SYSTEM_FLAGS_KEY = "SYSTEM_FLAGS";
const EMAIL_CONFIG_KEY = "EMAIL_CONFIG";

type SettingRecord = Record<string, unknown>;

function toRecord(value: Prisma.JsonValue | null | undefined): SettingRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as SettingRecord;
  }
  return {};
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const rows = await prisma.setting.findMany({
      where: {
        key: {
          in: [GENERAL_KEY, EMAIL_SNIPPETS_KEY, ANALYTICS_KEY, SYSTEM_FLAGS_KEY, EMAIL_CONFIG_KEY],
        },
      },
    });

    const settingsMap = rows.reduce<Record<string, SettingRecord>>((acc, row) => {
      acc[row.key] = toRecord(row.value);
      return acc;
    }, {});

    const general = settingsMap[GENERAL_KEY] || {};
    const emailSnippets = settingsMap[EMAIL_SNIPPETS_KEY] || {};
    const analytics = settingsMap[ANALYTICS_KEY] || {};
    const systemFlags = settingsMap[SYSTEM_FLAGS_KEY] || {};
    const emailConfig = settingsMap[EMAIL_CONFIG_KEY] || {};

    const settings = {
      companyName: (general.companyName as string) || "",
      companyLogo: (general.companyLogo as string) || "",
      companyAddress: (general.companyAddress as string) || "",
      gstin: (general.gstin as string) || "",
      supportEmail: (general.supportEmail as string) || "",
      supportPhone: (general.supportPhone as string) || "",
      // General emails
      emailWelcome: (emailSnippets.emailWelcome as string) || "",
      emailPasswordReset: (emailSnippets.emailPasswordReset as string) || "",
      emailPasswordResetOTP: (emailSnippets.emailPasswordResetOTP as string) || "",
      emailVerification: (emailSnippets.emailVerification as string) || "",
      // Visa emails
      emailVisaPaymentSuccess: (emailSnippets.emailVisaPaymentSuccess as string) || "",
      emailVisaPaymentFailed: (emailSnippets.emailVisaPaymentFailed as string) || "",
      emailVisaStatusUpdate: (emailSnippets.emailVisaStatusUpdate as string) || "",
      emailVisaDocumentRejected: (emailSnippets.emailVisaDocumentRejected as string) || "",
      emailVisaApproved: (emailSnippets.emailVisaApproved as string) || "",
      emailVisaRejected: (emailSnippets.emailVisaRejected as string) || "",
      emailVisaFeedback: (emailSnippets.emailVisaFeedback as string) || "",
      // Tour emails
      emailTourPaymentSuccess: (emailSnippets.emailTourPaymentSuccess as string) || "",
      emailTourPaymentFailed: (emailSnippets.emailTourPaymentFailed as string) || "",
      emailTourConfirmed: (emailSnippets.emailTourConfirmed as string) || "",
      emailTourPaymentReminder: (emailSnippets.emailTourPaymentReminder as string) || "",
      emailTourStatusUpdate: (emailSnippets.emailTourStatusUpdate as string) || "",
      emailTourVouchersReady: (emailSnippets.emailTourVouchersReady as string) || "",
      // Admin & Corporate emails
      emailAdminWelcome: (emailSnippets.emailAdminWelcome as string) || "",
      emailCorporateLeadAdmin: (emailSnippets.emailCorporateLeadAdmin as string) || "",
      emailCorporateLeadConfirmation: (emailSnippets.emailCorporateLeadConfirmation as string) || "",
      emailCareerApplicationStatus: (emailSnippets.emailCareerApplicationStatus as string) || "",
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
      paymentModes: "All modes enabled",
      googleAnalyticsId: (analytics.googleAnalyticsId as string) || "",
      metaPixelId: (analytics.metaPixelId as string) || "",
      analyticsEnabled: (analytics.analyticsEnabled as boolean) ?? false,
      registrationsEnabled: (systemFlags.registrationsEnabled as boolean) ?? true,
      maintenanceMode: (systemFlags.maintenanceMode as boolean) ?? false,
      maintenanceMessage: (systemFlags.maintenanceMessage as string) || "",
      feedbackEmailsEnabled: (general.feedbackEmailsEnabled as boolean) ?? true,
      googleReviewUrl: (general.googleReviewUrl as string) || "",
      awsAccessKeyId: (emailConfig.awsAccessKeyId as string) || "",
      awsSecretAccessKey: (emailConfig.awsSecretAccessKey as string) || "",
      awsRegion: (emailConfig.awsRegion as string) || "",
      emailFromGeneral: (emailConfig.emailFromGeneral as string) || "",
      emailFromVisa: (emailConfig.emailFromVisa as string) || "",
      emailFromTours: (emailConfig.emailFromTours as string) || "",
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only Super Admin can update settings
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      companyName = "",
      companyLogo = "",
      companyAddress = "",
      gstin = "",
      supportEmail = "",
      supportPhone = "",
      // General emails
      emailWelcome = "",
      emailPasswordReset = "",
      emailPasswordResetOTP = "",
      emailVerification = "",
      // Visa emails
      emailVisaPaymentSuccess = "",
      emailVisaPaymentFailed = "",
      emailVisaStatusUpdate = "",
      emailVisaDocumentRejected = "",
      emailVisaApproved = "",
      emailVisaRejected = "",
      emailVisaFeedback = "",
      // Tour emails
      emailTourPaymentSuccess = "",
      emailTourPaymentFailed = "",
      emailTourConfirmed = "",
      emailTourPaymentReminder = "",
      emailTourStatusUpdate = "",
      emailTourVouchersReady = "",
      // Admin & Corporate emails
      emailAdminWelcome = "",
      emailCorporateLeadAdmin = "",
      emailCorporateLeadConfirmation = "",
      emailCareerApplicationStatus = "",
      googleAnalyticsId = "",
      awsAccessKeyId = "",
      awsSecretAccessKey = "",
      awsRegion = "",
      emailFromGeneral = "",
      emailFromVisa = "",
      emailFromTours = "",
      metaPixelId = "",
      analyticsEnabled = false,
      registrationsEnabled = true,
      maintenanceMode = false,
      maintenanceMessage = "",
      feedbackEmailsEnabled = true,
      googleReviewUrl = "",
    } = body;

    await prisma.$transaction([
      prisma.setting.upsert({
        where: { key: GENERAL_KEY },
        update: {
          value: {
            companyName,
            companyLogo,
            companyAddress,
            gstin,
            supportEmail,
            supportPhone,
            feedbackEmailsEnabled,
            googleReviewUrl,
          },
        },
        create: {
          updatedAt: new Date(),
          key: GENERAL_KEY,
          value: {
            companyName,
            companyLogo,
            companyAddress,
            gstin,
            supportEmail,
            supportPhone,
            feedbackEmailsEnabled,
            googleReviewUrl,
          },
        },
      }),
      prisma.setting.upsert({
        where: { key: EMAIL_SNIPPETS_KEY },
        update: {
          value: {
            // General emails
            emailWelcome,
            emailPasswordReset,
            emailPasswordResetOTP,
            emailVerification,
            // Visa emails
            emailVisaPaymentSuccess,
            emailVisaPaymentFailed,
            emailVisaStatusUpdate,
            emailVisaDocumentRejected,
            emailVisaApproved,
            emailVisaRejected,
            emailVisaFeedback,
            // Tour emails
            emailTourPaymentSuccess,
            emailTourPaymentFailed,
            emailTourConfirmed,
            emailTourPaymentReminder,
            emailTourStatusUpdate,
            emailTourVouchersReady,
            // Admin & Corporate emails
            emailAdminWelcome,
            emailCorporateLeadAdmin,
            emailCorporateLeadConfirmation,
            emailCareerApplicationStatus,
          },
        },
        create: {
          updatedAt: new Date(),
          key: EMAIL_SNIPPETS_KEY,
          value: {
            // General emails
            emailWelcome,
            emailPasswordReset,
            emailPasswordResetOTP,
            emailVerification,
            // Visa emails
            emailVisaPaymentSuccess,
            emailVisaPaymentFailed,
            emailVisaStatusUpdate,
            emailVisaDocumentRejected,
            emailVisaApproved,
            emailVisaRejected,
            emailVisaFeedback,
            // Tour emails
            emailTourPaymentSuccess,
            emailTourPaymentFailed,
            emailTourConfirmed,
            emailTourPaymentReminder,
            emailTourStatusUpdate,
            emailTourVouchersReady,
            // Admin & Corporate emails
            emailAdminWelcome,
            emailCorporateLeadAdmin,
            emailCorporateLeadConfirmation,
            emailCareerApplicationStatus,
          },
        },
      }),
      prisma.setting.upsert({
        where: { key: ANALYTICS_KEY },
        update: {
          value: {
            analyticsEnabled,
            googleAnalyticsId,
            metaPixelId,
          },
        },
        create: {
          updatedAt: new Date(),
          key: ANALYTICS_KEY,
          value: {
            analyticsEnabled,
            googleAnalyticsId,
            metaPixelId,
          },
        },
      }),
      prisma.setting.upsert({
        where: { key: SYSTEM_FLAGS_KEY },
        update: {
          value: {
            registrationsEnabled,
            maintenanceMode,
            maintenanceMessage,
          },
        },
        create: {
          updatedAt: new Date(),
          key: SYSTEM_FLAGS_KEY,
          value: {
            registrationsEnabled,
            maintenanceMode,
            maintenanceMessage,
          },
        },
      }),
      prisma.setting.upsert({
        where: { key: EMAIL_CONFIG_KEY },
        update: {
          value: {
            awsAccessKeyId,
            awsSecretAccessKey,
            awsRegion,
            emailFromGeneral,
            emailFromVisa,
            emailFromTours,
          },
        },
        create: {
          updatedAt: new Date(),
          key: EMAIL_CONFIG_KEY,
          value: {
            awsAccessKeyId,
            awsSecretAccessKey,
            awsRegion,
            emailFromGeneral,
            emailFromVisa,
            emailFromTours,
          },
        },
      }),
    ]);

    await refreshEmailConfigCache();

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.SETTINGS,
      entityId: null,
      action: AuditAction.SETTING_CHANGE,
      description: "Updated general settings",
    });

    return NextResponse.json({ message: "Settings saved successfully" });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

