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

    // Get applications with visa details
    const applications = await prisma.application.findMany({
      where,
      include: {
        visa: {
          include: {
            country: true,
          },
        },
        travellers: true,
        payments: {
          where: {
            status: "COMPLETED",
          },
        },
      },
    });

    // Filter by country if specified
    let filteredApplications = applications;
    if (countryIds.length > 0) {
      filteredApplications = applications.filter((app) => {
        const countryId = app.visa?.countryId;
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

    filteredApplications.forEach((app) => {
      const visaId = app.visaId || "unknown";
      const visaName = app.visaType || app.visa?.name || "Unknown";
      const countryName = app.visa?.country?.name || app.country || "Unknown";
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
      visaTypeMap[key].totalTravellers += app.travellers.length;

      if (app.payments.length > 0) {
        visaTypeMap[key].paidApplications++;
        visaTypeMap[key].totalRevenue += app.payments.reduce((sum, p) => sum + p.amount, 0);
      }

      if (app.status === "APPROVED") {
        visaTypeMap[key].approvedCount++;
        visaTypeMap[key].decidedCount++;
      } else if (app.status === "REJECTED") {
        visaTypeMap[key].rejectedCount++;
        visaTypeMap[key].decidedCount++;
      }

      // Check for refunds
      const refundedPayments = app.payments.filter((p) => p.status === "REFUNDED");
      if (refundedPayments.length > 0) {
        visaTypeMap[key].refundedCount++;
      }
    });

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

    // Export handling
    if (format === "pdf") {
      const headers = ["Visa Type", "Country", "Applications", "Paid", "Revenue (INR)", "Avg Travellers", "Approval Rate (%)", "Refund Rate (%)"];
      const rows = visaTypeData.map((v) => [
        v.visaName,
        v.countryName,
        v.totalApplications,
        v.paidApplications,
        v.totalRevenue,
        v.avgTravellers.toFixed(1),
        v.approvalRate.toFixed(1),
        v.refundRate.toFixed(1),
      ]);

      const pdfBuffer = await generatePDF({
        title: "Visa Type Performance Report",
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          country: countryIds.length > 0 ? countryIds.join(", ") : undefined,
        },
        summary: {
          "Total Visa Types": visaTypeData.length,
          "Total Applications": visaTypeData.reduce((sum, v) => sum + v.totalApplications, 0),
          "Total Revenue": `₹${visaTypeData.reduce((sum, v) => sum + v.totalRevenue, 0).toLocaleString()}`,
        },
        headers,
        rows,
      });

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=visa-type-performance-${new Date().toISOString().split("T")[0]}.pdf`,
        },
      });
    }

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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

