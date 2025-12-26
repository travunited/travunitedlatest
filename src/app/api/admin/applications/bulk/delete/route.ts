import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditAction, AuditEntityType } from "@prisma/client";
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
    const { ids, applicationIds } = body; // Support both 'ids' and 'applicationIds' for compatibility

    const idsToDelete = ids || applicationIds;

    if (!idsToDelete || !Array.isArray(idsToDelete) || idsToDelete.length === 0) {
      return NextResponse.json(
        { error: "No applications provided" },
        { status: 400 }
      );
    }

    // Get applications info for audit log before deletion
    const applications = await prisma.application.findMany({
      where: {
        id: {
          in: idsToDelete,
        },
      },
      select: {
        id: true,
        country: true,
        visaType: true,
        userId: true,
      },
    });

    // Delete in proper order within a transaction to handle foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete documents first
      await tx.document.deleteMany({
        where: {
          applicationId: {
            in: idsToDelete,
          },
        },
      });

      // 2. Delete application travellers
      await tx.applicationTraveller.deleteMany({
        where: {
          applicationId: {
            in: idsToDelete,
          },
        },
      });

      // 3. Delete payments (optional FK, but delete anyway)
      await tx.payment.deleteMany({
        where: {
          applicationId: {
            in: idsToDelete,
          },
        },
      });

      // 4. Delete reviews (optional FK)
      await tx.review.deleteMany({
        where: {
          applicationId: {
            in: idsToDelete,
          },
        },
      });

      // 5. Finally delete applications
      await tx.application.deleteMany({
        where: {
          id: {
            in: idsToDelete,
          },
        },
      });
    });

    // Log audit events (non-blocking)
    for (const app of applications) {
      try {
        await logAuditEvent({
          adminId: session.user.id,
          entityType: AuditEntityType.APPLICATION,
          entityId: app.id,
          action: AuditAction.DELETE,
          description: `Application deleted: ${app.country || "N/A"} ${app.visaType || "N/A"}`,
          metadata: {
            country: app.country,
            visaType: app.visaType,
            userId: app.userId,
          },
        });
      } catch (auditError) {
        console.error(`Failed to log audit event for application ${app.id}:`, auditError);
        // Don't fail the deletion if audit logging fails
      }
    }

    return NextResponse.json({
      message: `Successfully deleted ${idsToDelete.length} application(s)`
    });
  } catch (error: any) {
    console.error("Error bulk deleting applications:", error);

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

