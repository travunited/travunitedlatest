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
    const countryIds = searchParams.getAll("countryIds");
    const status = searchParams.get("status");
    const format = searchParams.get("format");

    // Build filters
    const where: any = {};

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

    if (status && status !== "all") {
      where.status = status;
    }

    // Get applications with related data
    const applications = await prisma.application.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        travellers: {
          include: {
            traveller: true,
          },
        },
        payments: {
          where: {
            status: "COMPLETED",
          },
        },
        processedBy: {
          select: {
            name: true,
            email: true,
          },
        },
        visa: {
          include: {
            country: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter by country if specified
    let filteredApplications = applications;
    if (countryIds.length > 0) {
      filteredApplications = applications.filter((app) => {
        const countryId = app.visa?.countryId || app.visa?.country?.id;
        return countryId && countryIds.includes(countryId);
      });
    }

    // Calculate summary
    const statusCounts: Record<string, number> = {};
    let paidCount = 0;
    let totalRevenue = 0;

    filteredApplications.forEach((app) => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      if (app.payments.length > 0) {
        paidCount++;
        totalRevenue += app.payments.reduce((sum, p) => sum + p.amount, 0);
      }
    });

    const conversionRate = filteredApplications.length > 0
      ? (paidCount / filteredApplications.length) * 100
      : 0;

    // Export handling
    if (format === "pdf") {
      const headers = ["Reference", "Date", "Country", "Visa Type", "Travellers", "Status", "Assigned To", "Amount (INR)"];
      const rows = filteredApplications.slice(0, 200).map((app) => {
        const year = new Date(app.createdAt).getFullYear();
        const refSuffix = app.id.slice(-5).toUpperCase();
        const referenceNumber = `TRV-${year}-${refSuffix}`;
        
        return [
          referenceNumber,
          app.createdAt.toISOString().split("T")[0],
          app.visa?.country?.name || app.country || "N/A",
          app.visaType || "N/A",
          app.travellers.length,
          app.status,
          app.processedBy?.name || app.processedBy?.email || "Unassigned",
          app.totalAmount,
        ];
      });

      const pdfBuffer = await generatePDF({
        title: "Visa Applications Summary Report",
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          country: countryIds.length > 0 ? countryIds.join(", ") : undefined,
          status: status || undefined,
        },
        summary: {
          "Total Applications": filteredApplications.length,
          "Paid Applications": paidCount,
          "Conversion Rate": `${conversionRate.toFixed(1)}%`,
          "Total Revenue": `₹${totalRevenue.toLocaleString()}`,
        },
        headers,
        rows,
        maxRows: 200,
      });

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=visa-applications-${new Date().toISOString().split("T")[0]}.pdf`,
        },
      });
    }

    if (format === "xlsx" || format === "csv") {
      const exportData = filteredApplications.map((app) => {
        const year = new Date(app.createdAt).getFullYear();
        const refSuffix = app.id.slice(-5).toUpperCase();
        const referenceNumber = `TRV-${year}-${refSuffix}`;
        
        return {
          "Application ID": app.id,
          "Reference Number": referenceNumber,
          "Created Date": app.createdAt.toISOString().split("T")[0],
          "Country": app.visa?.country?.name || app.country || "N/A",
          "Visa Type": app.visaType || "N/A",
          "Number of Travellers": app.travellers.length,
          "Status": app.status,
          "Assigned Admin": app.processedBy?.name || app.processedBy?.email || "Unassigned",
          "Payment Status": app.payments.length > 0 ? "Paid" : "Unpaid",
          "Total Amount (INR)": app.totalAmount,
          "Amount Paid (INR)": app.payments.reduce((sum, p) => sum + p.amount, 0),
          "Customer Name": app.user.name || "N/A",
          "Customer Email": app.user.email,
        };
      });

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Visa Applications");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=visa-applications-${new Date().toISOString().split("T")[0]}.xlsx`,
          },
        });
      } else {
        // CSV
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
            "Content-Disposition": `attachment; filename=visa-applications-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    // JSON response with pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedApplications = filteredApplications.slice(start, end);

    return NextResponse.json({
      summary: {
        totalApplications: filteredApplications.length,
        paidApplications: paidCount,
        statusCounts,
        conversionRate,
        totalRevenue,
      },
      chart: {
        daily: [], // Can be added for daily breakdown
        statusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      },
      rows: paginatedApplications.map((app) => {
        const year = new Date(app.createdAt).getFullYear();
        const refSuffix = app.id.slice(-5).toUpperCase();
        const referenceNumber = `TRV-${year}-${refSuffix}`;
        
        return {
          id: app.id,
          referenceNumber,
          createdAt: app.createdAt,
          country: app.visa?.country?.name || app.country,
          visaType: app.visaType,
          travellerCount: app.travellers.length,
          status: app.status,
          assignedAdmin: app.processedBy?.name || app.processedBy?.email,
          paymentStatus: app.payments.length > 0 ? "Paid" : "Unpaid",
          totalAmount: app.totalAmount,
          amountPaid: app.payments.reduce((sum, p) => sum + p.amount, 0),
          customerName: app.user.name,
          customerEmail: app.user.email,
        };
      }),
      pagination: {
        page,
        limit,
        total: filteredApplications.length,
        totalPages: Math.ceil(filteredApplications.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching visa applications report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

