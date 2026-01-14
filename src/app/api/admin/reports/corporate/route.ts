import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, CorporateLeadStatus } from "@prisma/client";
import * as XLSX from "@e965/xlsx";

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
    const status = searchParams.get("status");
    const search = searchParams.get("q") || searchParams.get("search"); // Support both 'q' and 'search'
    const format = searchParams.get("format");

    // Build filters
    const where: Prisma.CorporateLeadWhereInput = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (status && status !== "all" && status !== "ALL") {
      // Validate that status is a valid enum value
      if (Object.values(CorporateLeadStatus).includes(status as CorporateLeadStatus)) {
        where.status = status as CorporateLeadStatus;
      }
    }

    // Search filter - search across company name, contact name, email, phone
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get corporate leads
    const leads = await prisma.corporateLead.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Export handling
    if (format === "xlsx" || format === "csv") {
      const exportData = leads.map((lead) => ({
        "Company Name": lead.companyName,
        "Contact Person": lead.contactName,
        "Email": lead.email,
        "Phone": lead.phone || "N/A",
        "Message": lead.message || "N/A",
        "Status": lead.status,
        "Created Date": lead.createdAt.toISOString().split("T")[0],
        "Updated Date": lead.updatedAt.toISOString().split("T")[0],
      }));

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Corporate Leads");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=corporate-leads-${new Date().toISOString().split("T")[0]}.xlsx`,
          },
        });
      } else {
        const csv = [
          Object.keys(exportData[0] || {}).join(","),
          ...exportData.map((row) =>
            Object.values(row).map((v) => {
              const str = String(v);
              return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(",")
          ),
        ].join("\n");
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=corporate-leads-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    // JSON response with pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedLeads = leads.slice(start, end);

    // Calculate summary
    const statusCounts: Record<string, number> = {};
    leads.forEach((lead) => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });

    return NextResponse.json({
      summary: {
        totalLeads: leads.length,
        statusCounts,
      },
      rows: paginatedLeads,
      pagination: {
        page,
        limit,
        total: leads.length,
        totalPages: Math.ceil(leads.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching corporate leads report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

