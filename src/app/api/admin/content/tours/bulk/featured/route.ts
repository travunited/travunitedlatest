import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { ids, featured } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No tour IDs provided" },
        { status: 400 }
      );
    }

    if (typeof featured !== "boolean") {
      return NextResponse.json(
        { error: "Featured must be a boolean" },
        { status: 400 }
      );
    }

    await prisma.tour.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        isFeatured: featured,
      },
    });

    // Log audit event (non-blocking)
    try {
      await logAuditEvent({
        adminId: session.user.id,
        entityType: AuditEntityType.OTHER,
        entityId: "bulk-update",
        action: AuditAction.UPDATE,
        description: `Bulk ${featured ? "featured" : "unfeatured"} ${ids.length} tours`,
        metadata: {
          count: ids.length,
          featured,
        },
      });
    } catch (auditError) {
      // Audit log failure should not block the operation
      console.error("Failed to log audit event for bulk featured update:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully ${featured ? "featured" : "unfeatured"} ${ids.length} tour(s)`,
    });
  } catch (error: any) {
    console.error("Error bulk updating tour featured:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

