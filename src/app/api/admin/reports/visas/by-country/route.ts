import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "@e965/xlsx";
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
    const format = searchParams.get("format");

    // Build date filter
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

    // Get applications grouped by country
    const applications = await prisma.application.findMany({
      where,
      include: {
        Payment: {
          where: {
            status: "COMPLETED",
          },
        },
        Visa: {
          include: {
            Country: true,
          },
        },
      },
    });

    // Group by country
    const countryMap: Record<string, {
      countryId: string;
      countryName: string;
      totalApplications: number;
      paidApplications: number;
      totalRevenue: number;
      approvedCount: number;
      rejectedCount: number;
      decidedCount: number;
    }> = {};

    applications.forEach((app: any) => {
      const countryId = app.Visa?.countryId || "unknown";
      const countryName = app.Visa?.Country?.name || app.country || "Unknown";

      if (!countryMap[countryId]) {
        countryMap[countryId] = {
          countryId,
          countryName,
          totalApplications: 0,
          paidApplications: 0,
          totalRevenue: 0,
          approvedCount: 0,
          rejectedCount: 0,
          decidedCount: 0,
        };
      }

      countryMap[countryId].totalApplications++;

      if (app.Payment.length > 0) {
        countryMap[countryId].paidApplications++;
        countryMap[countryId].totalRevenue += app.Payment.reduce((sum: number, p: any) => sum + p.amount, 0);
      }

      if (app.status === "APPROVED") {
        countryMap[countryId].approvedCount++;
        countryMap[countryId].decidedCount++;
      } else if (app.status === "REJECTED") {
        countryMap[countryId].rejectedCount++;
        countryMap[countryId].decidedCount++;
      }
    });

    // Filter by countryIds if specified
    let filteredCountries = Object.values(countryMap);
    if (countryIds.length > 0) {
      filteredCountries = filteredCountries.filter((c) => countryIds.includes(c.countryId));
    }

    // Calculate metrics
    const countryData = filteredCountries.map((country) => {
      const avgTicketSize = country.paidApplications > 0
        ? country.totalRevenue / country.paidApplications
        : 0;
      const approvalRate = country.decidedCount > 0
        ? (country.approvedCount / country.decidedCount) * 100
        : 0;

      return {
        ...country,
        avgTicketSize,
        approvalRate,
      };
    }).sort((a, b) => b.totalApplications - a.totalApplications);

    // Export handling
    if (format === "pdf") {
      const headers = ["Country", "Applications", "Paid", "Revenue (INR)", "Avg Ticket Size (INR)", "Approval Rate (%)"];
      const rows = countryData.map((c) => [
        c.countryName,
        c.totalApplications,
        c.paidApplications,
        c.totalRevenue,
        Math.round(c.avgTicketSize),
        c.approvalRate.toFixed(1),
      ]);

      const pdfBuffer = await generatePDF({
        title: "Country-wise Visa Report",
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          country: countryIds.length > 0 ? countryIds.join(", ") : undefined,
        },
        summary: {
          "Total Countries": countryData.length,
          "Total Applications": countryData.reduce((sum, c) => sum + c.totalApplications, 0),
          "Total Revenue": `₹${countryData.reduce((sum, c) => sum + c.totalRevenue, 0).toLocaleString()}`,
        },
        headers,
        rows,
      });

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=visas-by-country-${new Date().toISOString().split("T")[0]}.pdf`,
        },
      });
    }

    if (format === "xlsx" || format === "csv") {
      const exportData = countryData.map((country) => ({
        "Country": country.countryName,
        "Total Applications": country.totalApplications,
        "Paid Applications": country.paidApplications,
        "Total Revenue (INR)": country.totalRevenue,
        "Average Ticket Size (INR)": Math.round(country.avgTicketSize),
        "Approved": country.approvedCount,
        "Rejected": country.rejectedCount,
        "Approval Rate (%)": country.approvalRate.toFixed(1),
      }));

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Country-wise Visas");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=visas-by-country-${new Date().toISOString().split("T")[0]}.xlsx`,
          },
        });
      } else {
        const csv = [
          Object.keys(exportData[0] || {}).join(","),
          ...exportData.map((row) => Object.values(row).join(",")),
        ].join("\n");
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=visas-by-country-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    return NextResponse.json({
      summary: {
        totalCountries: countryData.length,
        totalApplications: countryData.reduce((sum, c) => sum + c.totalApplications, 0),
        totalRevenue: countryData.reduce((sum, c) => sum + c.totalRevenue, 0),
      },
      rows: countryData,
    });
  } catch (error) {
    console.error("Error fetching country-wise visa report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

