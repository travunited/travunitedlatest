import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVisaStatusUpdateEmail, sendVisaApprovedEmail, sendVisaRejectedEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
import { notify } from "@/lib/notifications";
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

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { applicationIds, status } = body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { error: "No applications provided" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Get applications with user info for notifications
    const applications = await prisma.application.findMany({
      where: {
        id: {
          in: applicationIds,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Bulk update status
    await prisma.application.updateMany({
      where: {
        id: {
          in: applicationIds,
        },
      },
      data: {
        status,
      },
    });

    // Send email notifications, in-app notifications, and log
    for (const app of applications) {
      try {
        const previousStatus = app.status;
        
        // Send appropriate email based on status
        if (status === "APPROVED") {
          await sendVisaApprovedEmail(
            app.user.email,
            app.id,
            app.country || "",
            app.visaType || ""
          );
        } else if (status === "REJECTED") {
          await sendVisaRejectedEmail(
            app.user.email,
            app.id,
            app.country || "",
            app.visaType || "",
            ""
          );
        } else {
          await sendVisaStatusUpdateEmail(
            app.user.email,
            app.id,
            app.country || "",
            app.visaType || "",
            status
          );
        }

        // Send in-app notification
        let notificationTitle = "Visa Application Status Updated";
        let notificationMessage = `Your visa application for ${app.country || ""} ${app.visaType || ""} is now ${status}.`;
        
        if (status === "APPROVED") {
          notificationTitle = "Visa Application Approved";
          notificationMessage = `Good news! Your visa application for ${app.country || ""} ${app.visaType || ""} has been approved.`;
        } else if (status === "REJECTED") {
          notificationTitle = "Visa Application Rejected";
          notificationMessage = `Unfortunately, your visa application for ${app.country || ""} ${app.visaType || ""} was rejected.`;
        }

        await notify({
          userId: app.userId,
          type: "VISA_STATUS_CHANGED",
          title: notificationTitle,
          message: notificationMessage,
          link: `/dashboard/applications/${app.id}`,
          data: {
            applicationId: app.id,
            status,
            country: app.country,
            visaType: app.visaType,
            previousStatus,
          },
          sendEmail: false, // Email already sent above
        });

        await logAuditEvent({
          adminId: session.user.id,
          entityType: AuditEntityType.APPLICATION,
          entityId: app.id,
          action: AuditAction.STATUS_CHANGE,
          description: `Application status changed via bulk action from ${previousStatus} to ${status}`,
          metadata: {
            previousStatus,
            newStatus: status,
            bulk: true,
          },
        });
      } catch (error) {
        console.error(`Error processing notification for application ${app.id}:`, error);
      }
    }

    return NextResponse.json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Error bulk updating status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

