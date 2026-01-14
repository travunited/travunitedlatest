import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVisaFeedbackEmail } from "@/lib/email";
import { AuditAction, AuditEntityType } from "@prisma/client";

export const dynamic = "force-dynamic";

function isCronAuthorized(req: Request) {
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret") || "";
  const envSecret = process.env.CRON_SECRET_BLOG || process.env.CRON_SECRET;
  const providedSecret = headerSecret || querySecret;
  return !!envSecret && providedSecret === envSecret;
}

/**
 * Send feedback emails to users whose visas were approved 24+ hours ago
 * This should be called via cron job (e.g., every hour or every few hours)
 */
export async function GET(req: Request) {
  try {
    // Allow either authenticated admin or a cron secret header
    const session = await getServerSession(authOptions);
    const isAdmin =
      session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
    const cronAllowed = isCronAuthorized(req);

    if (!isAdmin && !cronAllowed) {
      return NextResponse.json(
        { error: "Forbidden - Admin access or valid cron secret required" },
        { status: 403 }
      );
    }

    // Check if feedback emails are enabled
    const settingsRow = await prisma.setting.findUnique({
      where: { key: "GENERAL" },
    });

    const generalSettings = (settingsRow?.value as any) || {};
    const feedbackEmailsEnabled = generalSettings.feedbackEmailsEnabled !== false; // Default to true if not set

    if (!feedbackEmailsEnabled) {
      return NextResponse.json({
        message: "Feedback emails are disabled",
        sent: 0,
        checked: 0,
      });
    }

    // Get Google Review URL from settings
    const googleReviewUrl = generalSettings.googleReviewUrl || "";

    if (!googleReviewUrl || googleReviewUrl.trim() === "" || googleReviewUrl === "https://g.page/r/YOUR_GOOGLE_BUSINESS_REVIEW_LINK") {
      return NextResponse.json({
        message: "Google Review URL is not configured. Please set it in Admin Settings → General Settings → Feedback Email Settings",
        sent: 0,
        checked: 0,
        error: "Google Review URL required",
      }, { status: 400 });
    }

    // Calculate 24 hours ago
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find approved visas that haven't received feedback emails yet
    const approvedApplications = await prisma.application.findMany({
      where: {
        status: "APPROVED",
        feedbackEmailSentAt: null,
      },
      include: {
        User_Application_userIdToUser: {
          select: {
            email: true,
            role: true,
          },
        },
      },
      take: 100, // Get more candidates, we'll filter by approval time
    });

    // Filter applications that were approved 24+ hours ago by checking AuditLog
    // This is more reliable than using updatedAt which can change for other reasons
    const eligibleApplications = [];
    
    // Get application IDs for bulk AuditLog query
    const applicationIds = approvedApplications.map(app => app.id);
    
    // Query all relevant audit logs in bulk for better performance
    const approvalLogs = await prisma.auditLog.findMany({
      where: {
        entityType: AuditEntityType.APPLICATION,
        entityId: { in: applicationIds },
        OR: [
          { action: AuditAction.APPROVE },
          { action: AuditAction.STATUS_CHANGE },
        ],
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Group logs by application ID to find the most recent approval for each
    const logsByApplication = new Map<string, typeof approvalLogs>();
    for (const log of approvalLogs) {
      if (!log.entityId) continue;
      if (!logsByApplication.has(log.entityId)) {
        logsByApplication.set(log.entityId, []);
      }
      logsByApplication.get(log.entityId)!.push(log);
    }

    // Filter applications that were approved 24+ hours ago
    const eligibleApplications = [];
    
    for (const application of approvedApplications) {
      const logs = logsByApplication.get(application.id) || [];
      
      // Find the most recent approval log
      let approvalLog = null;
      for (const log of logs) {
        let isApproval = false;
        if (log.action === AuditAction.APPROVE) {
          isApproval = true;
        } else if (log.action === AuditAction.STATUS_CHANGE) {
          // Check metadata to see if newStatus is APPROVED
          const metadata = log.metadata as any;
          if (metadata?.newStatus === "APPROVED") {
            isApproval = true;
          }
        }
        
        if (isApproval) {
          approvalLog = log;
          break; // Found the most recent approval
        }
      }

      // Determine approval time
      const approvalTime = approvalLog?.timestamp || application.updatedAt;
      
      // Only include if approved 24+ hours ago
      if (approvalTime <= twentyFourHoursAgo) {
        eligibleApplications.push(application);
      }
      
      // Limit to 50 to avoid overload
      if (eligibleApplications.length >= 50) {
        break;
      }
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const application of eligibleApplications as any[]) {
      try {
        const userEmail = application.User_Application_userIdToUser.email;
        if (userEmail) {
          await sendVisaFeedbackEmail(
            userEmail,
            application.id,
            application.country || "",
            application.visaType || "",
            googleReviewUrl,
            application.User_Application_userIdToUser.role || "CUSTOMER"
          );
        }

        // Mark as sent (or skipped if no email)
        await prisma.application.update({
          where: { id: application.id },
          data: {
            feedbackEmailSentAt: now,
          },
        });

        if (userEmail) sentCount++;
      } catch (error: any) {
        console.error(`Error sending feedback email for application ${application.id}:`, error);
        errorCount++;
        // Continue with next application even if one fails
      }
    }

    return NextResponse.json({
      message: "Feedback email processing completed",
      sent: sentCount,
      errors: errorCount,
      checked: eligibleApplications.length,
      timestamp: now.toISOString(),
      via: cronAllowed ? "cron" : "admin",
    });
  } catch (error: any) {
    console.error("Error processing feedback emails:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  // POST also works for manual triggers or cron jobs that prefer POST
  return GET(req);
}
