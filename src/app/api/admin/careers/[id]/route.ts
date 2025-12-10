import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendCareerApplicationStatusEmail } from "@/lib/email";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
export const dynamic = "force-dynamic";

export async function GET(
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

    const application = await prisma.careerApplication.findUnique({
      where: { id: params.id },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    console.log("[Career API] Returning application:", {
      id: application.id,
      name: application.name,
      hasResumeUrl: !!application.resumeUrl,
      resumeUrl: application.resumeUrl?.substring(0, 50),
    });

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error fetching career application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { status, internalNotes } = body;

    const updateData: any = {};
    
    if (status !== undefined) {
      const validStatuses = ["NEW", "REVIEWED", "SHORTLISTED", "REJECTED", "ON_HOLD"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (internalNotes !== undefined) {
      updateData.internalNotes = internalNotes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Get the application before updating to check previous status
    const previousApplication = await prisma.careerApplication.findUnique({
      where: { id: params.id },
    });

    if (!previousApplication) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const application = await prisma.careerApplication.update({
      where: { id: params.id },
      data: updateData,
    });

    // Send email notification if status changed
    if (status !== undefined && status !== previousApplication.status) {
      try {
        await sendCareerApplicationStatusEmail(
          application.email,
          application.name,
          application.positionTitle,
          status,
          application.id
        );
      } catch (emailError) {
        console.error("Error sending career application status email:", emailError);
        // Don't fail the request if email fails
      }

      // Log audit event
      try {
        await logAuditEvent({
          adminId: session.user.id,
          entityType: AuditEntityType.OTHER,
          entityId: application.id,
          action: AuditAction.UPDATE,
          description: `Career application status updated from ${previousApplication.status} to ${status} for ${application.name} (${application.positionTitle})`,
          metadata: {
            applicationId: application.id,
            candidateName: application.name,
            candidateEmail: application.email,
            positionTitle: application.positionTitle,
            previousStatus: previousApplication.status,
            newStatus: status,
          },
        });
      } catch (auditError) {
        console.error("Error logging audit event:", auditError);
        // Don't fail the request if audit logging fails
      }
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error updating career application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

