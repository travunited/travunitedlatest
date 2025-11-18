import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVisaStatusUpdateEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
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

    // Get applications with user emails for notifications
    const applications = await prisma.application.findMany({
      where: {
        id: {
          in: applicationIds,
        },
      },
      include: {
        user: {
          select: {
            email: true,
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

    // Send email notifications and log
    for (const app of applications) {
      try {
        await sendVisaStatusUpdateEmail(
          app.user.email,
          app.id,
          app.country || "",
          app.visaType || "",
          status
        );

        await logAuditEvent({
          adminId: session.user.id,
          entityType: AuditEntityType.APPLICATION,
          entityId: app.id,
          action: AuditAction.STATUS_CHANGE,
          description: `Application status changed via bulk action to ${status}`,
          metadata: {
            previousStatus: app.status,
            newStatus: status,
            bulk: true,
          },
        });
      } catch (error) {
        console.error(`Error sending email for application ${app.id}:`, error);
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

