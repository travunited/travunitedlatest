import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        User_Application_userIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        ApplicationTraveller: {
          include: {
            Traveller: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        ApplicationDocument: {
          include: {
            VisaDocumentRequirement: true,
            Traveller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        Payment: {
          orderBy: {
            createdAt: "desc",
          },
        },
        User_Application_processedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Visa: {
          include: {
            Country: {
              select: {
                id: true,
                name: true,
                code: true,
                flagUrl: true,
              },
            },
          },
        },
        VisaSubType: {
          select: {
            id: true,
            label: true,
            code: true,
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

    // Generate reference number from ID (format: TRV-YYYY-XXXXX)
    const year = new Date(application.createdAt).getFullYear();
    const refSuffix = application.id.slice(-5).toUpperCase();
    const referenceNumber = `TRV-${year}-${refSuffix}`;

    // Get activities/timeline
    const activities = await prisma.auditLog.findMany({
      where: {
        entityType: "APPLICATION",
        entityId: params.id,
      },
      include: {
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // Format response with additional computed fields
    const response = {
      ...application,
      user: application.User_Application_userIdToUser,
      travellers: application.ApplicationTraveller,
      documents: application.ApplicationDocument,
      processedBy: application.User_Application_processedByIdToUser,
      visa: application.Visa,
      visaSubType: application.VisaSubType,
      referenceNumber,
      timeline: activities.map((activity) => ({
        id: activity.id,
        time: activity.timestamp,
        event: activity.description,
        adminName: activity.User?.name || activity.User?.email || "System",
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Get application info for audit log before deletion
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        country: true,
        visaType: true,
        userId: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Delete in proper order within a transaction to handle foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete documents first
      await tx.applicationDocument.deleteMany({
        where: {
          applicationId: params.id,
        },
      });

      // 2. Delete application travellers
      await tx.applicationTraveller.deleteMany({
        where: {
          applicationId: params.id,
        },
      });

      // 3. Delete payments (optional FK, but delete anyway)
      await tx.payment.deleteMany({
        where: {
          applicationId: params.id,
        },
      });

      // 4. Delete reviews (optional FK)
      await tx.review.deleteMany({
        where: {
          applicationId: params.id,
        },
      });

      // 5. Finally delete application
      await tx.application.delete({
        where: {
          id: params.id,
        },
      });
    });

    // Log audit event (non-blocking)
    try {
      await logAuditEvent({
        adminId: session.user.id,
        entityType: AuditEntityType.APPLICATION,
        entityId: application.id,
        action: AuditAction.DELETE,
        description: `Application deleted: ${application.country || "N/A"} ${application.visaType || "N/A"}`,
        metadata: {
          country: application.country,
          visaType: application.visaType,
          userId: application.userId,
        },
      });
    } catch (auditError) {
      console.error(`Failed to log audit event for application ${application.id}:`, auditError);
      // Don't fail the deletion if audit logging fails
    }

    return NextResponse.json({
      message: "Application deleted successfully"
    });
  } catch (error: any) {
    console.error("Error deleting application:", error);

    // Provide more specific error messages
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete: Foreign key constraint violation. Please contact support." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

