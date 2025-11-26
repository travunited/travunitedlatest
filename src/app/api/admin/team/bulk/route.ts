import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";

export const dynamic = "force-dynamic";

function ensureAdmin(session: any) {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Forbidden - Admin access required" },
      { status: 403 }
    );
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureAdmin(session);
    if (authError) return authError;

    // TypeScript guard: session is guaranteed to be non-null after ensureAdmin check
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, ids } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Action and ids array are required" },
        { status: 400 }
      );
    }

    const teamMembers = await prisma.teamMember.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });

    if (teamMembers.length === 0) {
      return NextResponse.json(
        { error: "No team members found" },
        { status: 404 }
      );
    }

    let result;
    switch (action) {
      case "delete":
        // Soft delete
        result = await prisma.teamMember.updateMany({
          where: { id: { in: ids } },
          data: {
            isActive: false,
            updatedBy: session.user.id,
          },
        });
        break;

      case "feature":
        result = await prisma.teamMember.updateMany({
          where: { id: { in: ids } },
          data: {
            isFeatured: true,
            updatedBy: session.user.id,
          },
        });
        break;

      case "unfeature":
        result = await prisma.teamMember.updateMany({
          where: { id: { in: ids } },
          data: {
            isFeatured: false,
            updatedBy: session.user.id,
          },
        });
        break;

      case "activate":
        result = await prisma.teamMember.updateMany({
          where: { id: { in: ids } },
          data: {
            isActive: true,
            updatedBy: session.user.id,
          },
        });
        break;

      case "deactivate":
        result = await prisma.teamMember.updateMany({
          where: { id: { in: ids } },
          data: {
            isActive: false,
            updatedBy: session.user.id,
          },
        });
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Log audit event for bulk action
    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.TEAM,
      entityId: null,
      action: AuditAction.UPDATE,
      description: `Bulk ${action} on ${teamMembers.length} team members`,
      metadata: {
        action,
        count: teamMembers.length,
        ids,
        names: teamMembers.map((tm) => tm.name),
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      affected: teamMembers.length,
    });
  } catch (error) {
    console.error("Error performing bulk action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

