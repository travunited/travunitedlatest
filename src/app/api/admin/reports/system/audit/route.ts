import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { generatePDF } from "@/lib/pdf-export";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
    const actionType = searchParams.get("actionType");
    const format = searchParams.get("format");

    // Build filters
    const where: any = {};

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

    if (adminId) {
      where.adminId = adminId;
    }

    if (actionType && actionType !== "all") {
      where.action = actionType;
    }

    // Get audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        admin: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Export handling
    if (format === "pdf") {
      const headers = ["Timestamp", "Actor", "Action", "Entity Type", "Entity ID", "Description"];
      const rows = auditLogs.slice(0, 500).map((log) => [
        log.timestamp.toISOString(),
        log.admin?.name || log.admin?.email || "System",
        log.action,
        log.entityType,
        log.entityId || "N/A",
        log.description.substring(0, 100), // Truncate long descriptions
      ]);

      const pdfBuffer = await generatePDF({
        title: "Audit Log Export",
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          admin: adminId || undefined,
          actionType: actionType || undefined,
        },
        summary: {
          "Total Logs": auditLogs.length,
          "By Admin": adminId ? "Filtered" : "All",
        },
        headers,
        rows,
        maxRows: 500,
      });

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=audit-log-${new Date().toISOString().split("T")[0]}.pdf`,
        },
      });
    }

    if (format === "xlsx" || format === "csv") {
      const exportData = auditLogs.map((log) => ({
        "Timestamp": log.timestamp.toISOString(),
        "Actor": log.admin?.name || log.admin?.email || "System",
        "Action": log.action,
        "Entity Type": log.entityType,
        "Entity ID": log.entityId || "N/A",
        "Description": log.description,
        "Metadata": log.metadata ? JSON.stringify(log.metadata) : "N/A",
      }));

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Audit Log");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=audit-log-${new Date().toISOString().split("T")[0]}.xlsx`,
          },
        });
      } else {
        const csv = [
          Object.keys(exportData[0] || {}).join(","),
          ...exportData.map((row) =>
            Object.values(row).map((v) => {
              const str = String(v);
              return str.includes(",") || str.includes('"') || str.includes("\n") 
                ? `"${str.replace(/"/g, '""')}"` 
                : str;
            }).join(",")
          ),
        ].join("\n");
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=audit-log-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    // JSON response with pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedLogs = auditLogs.slice(start, end);

    // Group by action type for summary
    const actionCounts: Record<string, number> = {};
    auditLogs.forEach((log) => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    return NextResponse.json({
      summary: {
        totalLogs: auditLogs.length,
        actionCounts,
      },
      rows: paginatedLogs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        actor: log.admin?.name || log.admin?.email || "System",
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        metadata: log.metadata,
      })),
      pagination: {
        page,
        limit,
        total: auditLogs.length,
        totalPages: Math.ceil(auditLogs.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching audit log report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

