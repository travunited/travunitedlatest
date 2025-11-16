import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

const GENERAL_KEY = "GENERAL";
const EMAIL_SNIPPETS_KEY = "EMAIL_SNIPPETS";
const ANALYTICS_KEY = "ANALYTICS";
const SYSTEM_FLAGS_KEY = "SYSTEM_FLAGS";

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
          in: [GENERAL_KEY, EMAIL_SNIPPETS_KEY, ANALYTICS_KEY, SYSTEM_FLAGS_KEY],
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

    const settings = {
      companyName: (general.companyName as string) || "",
      companyLogo: (general.companyLogo as string) || "",
      companyAddress: (general.companyAddress as string) || "",
      gstin: (general.gstin as string) || "",
      supportEmail: (general.supportEmail as string) || "",
      supportPhone: (general.supportPhone as string) || "",
      emailVisaSubmitted: (emailSnippets.emailVisaSubmitted as string) || "",
      emailDocsRejected: (emailSnippets.emailDocsRejected as string) || "",
      emailVisaApproved: (emailSnippets.emailVisaApproved as string) || "",
      emailTourBooked: (emailSnippets.emailTourBooked as string) || "",
      emailTourConfirmed: (emailSnippets.emailTourConfirmed as string) || "",
      emailVouchersReady: (emailSnippets.emailVouchersReady as string) || "",
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
      paymentModes: "All modes enabled",
      googleAnalyticsId: (analytics.googleAnalyticsId as string) || "",
      metaPixelId: (analytics.metaPixelId as string) || "",
      analyticsEnabled: (analytics.analyticsEnabled as boolean) ?? false,
      registrationsEnabled: (systemFlags.registrationsEnabled as boolean) ?? true,
      maintenanceMode: (systemFlags.maintenanceMode as boolean) ?? false,
      maintenanceMessage: (systemFlags.maintenanceMessage as string) || "",
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
      emailVisaSubmitted = "",
      emailDocsRejected = "",
      emailVisaApproved = "",
      emailTourBooked = "",
      emailTourConfirmed = "",
      emailVouchersReady = "",
      googleAnalyticsId = "",
      metaPixelId = "",
      analyticsEnabled = false,
      registrationsEnabled = true,
      maintenanceMode = false,
      maintenanceMessage = "",
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
          },
        },
        create: {
          key: GENERAL_KEY,
          value: {
            companyName,
            companyLogo,
            companyAddress,
            gstin,
            supportEmail,
            supportPhone,
          },
        },
      }),
      prisma.setting.upsert({
        where: { key: EMAIL_SNIPPETS_KEY },
        update: {
          value: {
            emailVisaSubmitted,
            emailDocsRejected,
            emailVisaApproved,
            emailTourBooked,
            emailTourConfirmed,
            emailVouchersReady,
          },
        },
        create: {
          key: EMAIL_SNIPPETS_KEY,
          value: {
            emailVisaSubmitted,
            emailDocsRejected,
            emailVisaApproved,
            emailTourBooked,
            emailTourConfirmed,
            emailVouchersReady,
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
          key: SYSTEM_FLAGS_KEY,
          value: {
            registrationsEnabled,
            maintenanceMode,
            maintenanceMessage,
          },
        },
      }),
    ]);

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

