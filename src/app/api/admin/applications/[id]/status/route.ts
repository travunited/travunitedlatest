import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVisaStatusUpdateEmail, sendVisaApprovedEmail, sendVisaRejectedEmail, sendVisaFeedbackEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
import { notify } from "@/lib/notifications";
export const dynamic = "force-dynamic";



export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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
    const { status, rejectionReason } = body;

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const previousStatus = application.status;

    // Update status
    const updated = await prisma.application.update({
      where: { id: params.id },
      data: {
        status,
        notes: rejectionReason ? `${application.notes || ""}\nRejection reason: ${rejectionReason}`.trim() : application.notes,
      },
    });

    // Send email notifications and in-app notifications
    try {
      if (status === "APPROVED") {
        try {
          await sendVisaApprovedEmail(
            application.user.email,
            application.id,
            application.country || "",
            application.visaType || ""
          );
        } catch (emailError) {
          console.error("Error sending visa approved email:", emailError);
          // Continue with notification even if email fails
        }
        await notify({
          userId: application.userId,
          type: "VISA_STATUS_CHANGED",
          title: "Visa Application Approved",
          message: `Good news! Your visa application for ${application.country || ""} ${application.visaType || ""} has been approved.`,
          link: `/dashboard/applications/${application.id}`,
          data: {
            applicationId: application.id,
            status: "APPROVED",
            country: application.country,
            visaType: application.visaType,
          },
          sendEmail: false, // Email already sent above
        });
      } else if (status === "REJECTED") {
        try {
          await sendVisaRejectedEmail(
            application.user.email,
            application.id,
            application.country || "",
            application.visaType || "",
            rejectionReason || ""
          );
        } catch (emailError) {
          console.error("Error sending visa rejected email:", emailError);
          // Continue with notification even if email fails
        }
        await notify({
          userId: application.userId,
          type: "VISA_STATUS_CHANGED",
          title: "Visa Application Rejected",
          message: `Unfortunately, your visa application for ${application.country || ""} ${application.visaType || ""} was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
          link: `/dashboard/applications/${application.id}`,
          data: {
            applicationId: application.id,
            status: "REJECTED",
            country: application.country,
            visaType: application.visaType,
            reason: rejectionReason,
          },
          sendEmail: false, // Email already sent above
        });
      } else {
        try {
          await sendVisaStatusUpdateEmail(
            application.user.email,
            application.id,
            application.country || "",
            application.visaType || "",
            status
          );
        } catch (emailError) {
          console.error("Error sending visa status update email:", emailError);
          // Continue with notification even if email fails
        }
        await notify({
          userId: application.userId,
          type: "VISA_STATUS_CHANGED",
          title: "Visa Application Status Updated",
          message: `Your visa application for ${application.country || ""} ${application.visaType || ""} is now ${status}.`,
          link: `/dashboard/applications/${application.id}`,
          data: {
            applicationId: application.id,
            status,
            country: application.country,
            visaType: application.visaType,
          },
          sendEmail: false, // Email already sent above
        });
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
      // Don't fail the status update if notifications fail
    }

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.APPLICATION,
      entityId: params.id,
      action: AuditAction.STATUS_CHANGE,
      description: `Application status changed from ${previousStatus} to ${status}`,
      metadata: {
        previousStatus,
        newStatus: status,
        rejectionReason: rejectionReason || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating application status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

