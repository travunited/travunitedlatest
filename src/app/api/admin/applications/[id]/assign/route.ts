import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";
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
    const { adminId } = body;

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin ID is required" },
        { status: 400 }
      );
    }

    // Verify admin exists
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!admin || (admin.role !== "STAFF_ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Invalid admin user" },
        { status: 400 }
      );
    }

    // Get application details before update
    const applicationBefore = await prisma.application.findUnique({
      where: { id: params.id },
      select: {
        country: true,
        visaType: true,
      },
    });

    // Update application
    const application = await prisma.application.update({
      where: { id: params.id },
      data: {
        processedById: adminId,
      },
      include: {
        User_Application_processedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.APPLICATION,
      entityId: params.id,
      action: AuditAction.UPDATE,
      description: `Application assigned to ${admin.name || admin.email}`,
      metadata: {
        assignedToId: adminId,
        assignedToName: admin.name || admin.email,
      },
    });

    // Notify assigned admin
    if (adminId !== session.user.id) {
      await notify({
        userId: adminId,
        type: "ADMIN_APPLICATION_ASSIGNED",
        title: "New Application Assigned",
        message: `A new visa application has been assigned to you: ${applicationBefore?.country || ""} ${applicationBefore?.visaType || ""}`,
        link: `/admin/applications/${params.id}`,
        data: {
          applicationId: params.id,
          country: applicationBefore?.country,
          visaType: applicationBefore?.visaType,
        },
        sendEmail: true,
        roleScope: "STAFF_ADMIN",
      });
    }

    return NextResponse.json({
      message: "Application assigned successfully",
      application,
    });
  } catch (error) {
    console.error("Error assigning application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

