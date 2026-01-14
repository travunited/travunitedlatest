import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    const countryIds = searchParams.getAll("countryIds");
    const status = searchParams.get("status");
    const format = searchParams.get("format");

    // Build filters
    const where: any = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom && dateFrom.trim() !== "") {
        try {
          where.createdAt.gte = new Date(dateFrom);
          if (isNaN(where.createdAt.gte.getTime())) {
            throw new Error(`Invalid dateFrom: ${dateFrom}`);
          }
        } catch (dateError) {
          console.error("Invalid dateFrom:", dateFrom, dateError);
          return NextResponse.json(
            { error: `Invalid dateFrom parameter: ${dateFrom}` },
            { status: 400 }
          );
        }
      }
      if (dateTo && dateTo.trim() !== "") {
        try {
          const toDate = new Date(dateTo);
          if (isNaN(toDate.getTime())) {
            throw new Error(`Invalid dateTo: ${dateTo}`);
          }
          toDate.setHours(23, 59, 59, 999);
          where.createdAt.lte = toDate;
        } catch (dateError) {
          console.error("Invalid dateTo:", dateTo, dateError);
          return NextResponse.json(
            { error: `Invalid dateTo parameter: ${dateTo}` },
            { status: 400 }
          );
        }
      }
    }

    if (status && status !== "all") {
      where.status = status;
    }

    // Get applications with visa details
    let applications;
    try {
      applications = await prisma.application.findMany({
        where,
        include: {
          Visa: {
            include: {
              Country: true,
            },
          },
          ApplicationTraveller: true,
          Payment: {
            where: {
              status: "COMPLETED",
            },
          },
        },
      });
    } catch (dbError) {
      console.error("Database query error:", dbError);
      throw new Error(`Database query failed: ${dbError instanceof Error ? dbError.message : "Unknown error"}`);
    }

    // Filter by country if specified
    let filteredApplications = applications;
    if (countryIds.length > 0) {
      filteredApplications = applications.filter((app: any) => {
        const countryId = app.Visa?.countryId;
        return countryId && countryIds.includes(countryId);
      });
    }

    // Group by visa type
    const visaTypeMap: Record<string, {
      visaId: string;
      visaName: string;
      countryName: string;
      totalApplications: number;
      paidApplications: number;
      totalRevenue: number;
      totalTravellers: number;
      approvedCount: number;
      rejectedCount: number;
      decidedCount: number;
      refundedCount: number;
    }> = {};

    try {
      filteredApplications.forEach((app: any) => {
        const visaId = app.visaId || "unknown";
        const visaName = app.visaType || app.Visa?.name || "Unknown";
        const countryName = app.Visa?.Country?.name || app.country || "Unknown";
        const key = `${visaId}-${visaName}`;

        if (!visaTypeMap[key]) {
          visaTypeMap[key] = {
            visaId,
            visaName,
            countryName,
            totalApplications: 0,
            paidApplications: 0,
            totalRevenue: 0,
            totalTravellers: 0,
            approvedCount: 0,
            rejectedCount: 0,
            decidedCount: 0,
            refundedCount: 0,
          };
        }

        visaTypeMap[key].totalApplications++;
        visaTypeMap[key].totalTravellers += (Array.isArray(app.ApplicationTraveller) ? app.ApplicationTraveller.length : 0);

        if (app.Payment && Array.isArray(app.Payment) && app.Payment.length > 0) {
          visaTypeMap[key].paidApplications++;
          visaTypeMap[key].totalRevenue += app.Payment.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        }

        if (app.status === "APPROVED") {
          visaTypeMap[key].approvedCount++;
          visaTypeMap[key].decidedCount++;
        } else if (app.status === "REJECTED") {
          visaTypeMap[key].rejectedCount++;
          visaTypeMap[key].decidedCount++;
        }

        // Check for refunds
        if (app.Payment && Array.isArray(app.Payment)) {
          const refundedPayments = app.Payment.filter((p: any) => p.status === "REFUNDED");
          if (refundedPayments.length > 0) {
            visaTypeMap[key].refundedCount++;
          }
        }
      });
    } catch (processingError) {
      console.error("Error processing applications:", processingError);
      throw new Error(`Failed to process applications: ${processingError instanceof Error ? processingError.message : "Unknown error"}`);
    }

    // Calculate metrics
    const visaTypeData = Object.values(visaTypeMap).map((visa) => {
      const avgTravellers = visa.totalApplications > 0
        ? visa.totalTravellers / visa.totalApplications
        : 0;
      const approvalRate = visa.decidedCount > 0
        ? (visa.approvedCount / visa.decidedCount) * 100
        : 0;
      const refundRate = visa.paidApplications > 0
        ? (visa.refundedCount / visa.paidApplications) * 100
        : 0;

      return {
        ...visa,
        avgTravellers,
        approvalRate,
        refundRate,
      };
    }).sort((a, b) => b.totalApplications - a.totalApplications);

    // Ensure we always return a valid response even if there's no data
    if (visaTypeData.length === 0 && filteredApplications.length === 0) {
      // No applications found, return empty result
      return NextResponse.json({
        summary: {
          totalVisaTypes: 0,
          totalApplications: 0,
          totalRevenue: 0,
        },
        rows: [],
      });
    }

    // Export handling
    if (format === "xlsx" || format === "csv") {
      const exportData = visaTypeData.map((visa) => ({
        "Visa Type": visa.visaName,
        "Country": visa.countryName,
        "Total Applications": visa.totalApplications,
        "Paid Applications": visa.paidApplications,
        "Total Revenue (INR)": visa.totalRevenue,
        "Average Travellers per Application": visa.avgTravellers.toFixed(1),
        "Approved": visa.approvedCount,
        "Rejected": visa.rejectedCount,
        "Approval Rate (%)": visa.approvalRate.toFixed(1),
        "Refund Rate (%)": visa.refundRate.toFixed(1),
      }));

      if (format === "xlsx") {
        if (exportData.length === 0) {
          // Return empty Excel file with headers
          const headers = ["Visa Type", "Country", "Total Applications", "Paid Applications", "Total Revenue (INR)", "Average Travellers per Application", "Approved", "Rejected", "Approval Rate (%)", "Refund Rate (%)"];
          const ws = XLSX.utils.aoa_to_sheet([headers]);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Visa Type Performance");
          const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "Content-Disposition": `attachment; filename=visa-type-performance-${new Date().toISOString().split("T")[0]}.xlsx`,
            },
          });
        }
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Visa Type Performance");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=visa-type-performance-${new Date().toISOString().split("T")[0]}.xlsx`,
          },
        });
      } else {
        if (exportData.length === 0) {
          // Return empty CSV with headers
          const headers = ["Visa Type", "Country", "Total Applications", "Paid Applications", "Total Revenue (INR)", "Average Travellers per Application", "Approved", "Rejected", "Approval Rate (%)", "Refund Rate (%)"];
          const csv = headers.join(",") + "\n";
          return new NextResponse(csv, {
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": `attachment; filename=visa-type-performance-${new Date().toISOString().split("T")[0]}.csv`,
            },
          });
        }
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
            "Content-Disposition": `attachment; filename=visa-type-performance-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    return NextResponse.json({
      summary: {
        totalVisaTypes: visaTypeData.length,
        totalApplications: visaTypeData.reduce((sum, v) => sum + v.totalApplications, 0),
        totalRevenue: visaTypeData.reduce((sum, v) => sum + v.totalRevenue, 0),
      },
      rows: visaTypeData,
    });
  } catch (error) {
    console.error("Error fetching visa type performance report:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log full error details for debugging
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });

    return NextResponse.json(
      {
        error: errorMessage,
        // Only include stack in development
        ...(process.env.NODE_ENV === "development" && errorStack ? { details: errorStack } : {})
      },
      { status: 500 }
    );
  }
}

