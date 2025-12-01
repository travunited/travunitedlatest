import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";
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
    const { notes } = body;

    // Get application with user info for notification
    const application = await prisma.application.findUnique({
      where: { id: params.id },
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

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const previousNotes = application.notes || "";
    const updated = await prisma.application.update({
      where: { id: params.id },
      data: { notes },
    });

    // Log audit event
    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.APPLICATION,
      entityId: params.id,
      action: AuditAction.UPDATE,
      description: "Application notes updated",
      metadata: {
        previousNotesLength: previousNotes.length,
        newNotesLength: notes?.length || 0,
      },
    });

    // Notify user if notes were added or significantly changed
    if (notes && notes.trim() && notes !== previousNotes) {
      try {
        const notesPreview = notes.length > 100 ? notes.substring(0, 100) + "..." : notes;
        await notify({
          userId: application.userId,
          type: "VISA_STATUS_CHANGED",
          title: "Application Notes Updated",
          message: `Admin has added notes to your ${application.country || ""} ${application.visaType || ""} application: ${notesPreview}`,
          link: `/dashboard/applications/${params.id}`,
          data: {
            applicationId: params.id,
            country: application.country,
            visaType: application.visaType,
            hasNotes: true,
          },
          sendEmail: true,
        });
      } catch (notifyError) {
        console.error("Error sending notification for notes update:", notifyError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

