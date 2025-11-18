import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVisaStatusUpdateEmail, sendVisaApprovedEmail, sendVisaRejectedEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
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

    // Send email notifications
    if (status === "APPROVED") {
      await sendVisaApprovedEmail(
        application.user.email,
        application.id,
        application.country || "",
        application.visaType || ""
      );
    } else if (status === "REJECTED") {
      await sendVisaRejectedEmail(
        application.user.email,
        application.id,
        application.country || "",
        application.visaType || "",
        rejectionReason || ""
      );
    } else {
      await sendVisaStatusUpdateEmail(
        application.user.email,
        application.id,
        application.country || "",
        application.visaType || "",
        status
      );
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

