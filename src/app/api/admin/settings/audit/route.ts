import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const adminId = searchParams.get("adminId");
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");

    const where: Prisma.AuditLogWhereInput = {};
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) {
        where.timestamp.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.timestamp.lte = toDate;
      }
    }

    if (adminId && adminId !== "ALL") {
      where.adminId = adminId;
    }

    if (action && action !== "ALL") {
      where.action = action as AuditAction;
    }

    if (entityType && entityType !== "ALL") {
      where.entityType = entityType as AuditEntityType;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 500,
    });

    const formatted = logs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      adminUser: log.admin
        ? {
            id: log.admin.id,
            name: log.admin.name,
            email: log.admin.email,
          }
        : {
            id: null,
            name: "System",
            email: "system@travunited.com",
          },
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      description: log.description,
      metadata: log.metadata,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

