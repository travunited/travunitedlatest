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

    // Get applications with payment and status change tracking
    const applications = await prisma.application.findMany({
      where,
      include: {
        payments: {
          where: {
            status: "COMPLETED",
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        visa: {
          include: {
            country: true,
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

    // Calculate SLA metrics
    const slaMetrics = {
      totalApplications: filteredApplications.length,
      timeToFirstReview: [] as number[],
      timeToDecision: [] as number[],
      slaBreaches: {
        notTouched24h: 0,
        notTouched48h: 0,
        notDecided48h: 0,
        notDecided72h: 0,
      },
    };

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    filteredApplications.forEach((app) => {
      // Time from creation to first review (status change from DRAFT/PAYMENT_PENDING to SUBMITTED/IN_PROCESS)
      if (app.status !== "DRAFT" && app.status !== "PAYMENT_PENDING") {
        const timeToReview = app.updatedAt.getTime() - app.createdAt.getTime();
        slaMetrics.timeToFirstReview.push(timeToReview / (1000 * 60 * 60)); // Convert to hours
      }

      // Time from payment to final decision
      if (app.payments.length > 0 && (app.status === "APPROVED" || app.status === "REJECTED")) {
        const firstPayment = app.payments[0];
        const timeToDecision = app.updatedAt.getTime() - firstPayment.createdAt.getTime();
        slaMetrics.timeToDecision.push(timeToDecision / (1000 * 60 * 60)); // Convert to hours
      }

      // SLA breaches
      if (app.status === "DRAFT" || app.status === "PAYMENT_PENDING" || app.status === "SUBMITTED") {
        if (app.updatedAt < twentyFourHoursAgo) {
          slaMetrics.slaBreaches.notTouched24h++;
        }
        if (app.updatedAt < fortyEightHoursAgo) {
          slaMetrics.slaBreaches.notTouched48h++;
        }
      }

      if (app.payments.length > 0 && app.status !== "APPROVED" && app.status !== "REJECTED") {
        const firstPayment = app.payments[0];
        if (firstPayment.createdAt < fortyEightHoursAgo) {
          slaMetrics.slaBreaches.notDecided48h++;
        }
        if (firstPayment.createdAt < seventyTwoHoursAgo) {
          slaMetrics.slaBreaches.notDecided72h++;
        }
      }
    });

    const avgTimeToFirstReview = slaMetrics.timeToFirstReview.length > 0
      ? slaMetrics.timeToFirstReview.reduce((sum, t) => sum + t, 0) / slaMetrics.timeToFirstReview.length
      : 0;

    const avgTimeToDecision = slaMetrics.timeToDecision.length > 0
      ? slaMetrics.timeToDecision.reduce((sum, t) => sum + t, 0) / slaMetrics.timeToDecision.length
      : 0;

    // Export handling
    if (format === "pdf") {
      const headers = ["Metric", "Value"];
      const rows = [
        ["Average Time to First Review (hours)", avgTimeToFirstReview.toFixed(1)],
        ["Average Time to Decision (hours)", avgTimeToDecision.toFixed(1)],
        ["Applications Not Touched > 24h", slaMetrics.slaBreaches.notTouched24h.toString()],
        ["Applications Not Touched > 48h", slaMetrics.slaBreaches.notTouched48h.toString()],
        ["Applications Not Decided > 48h (after payment)", slaMetrics.slaBreaches.notDecided48h.toString()],
        ["Applications Not Decided > 72h (after payment)", slaMetrics.slaBreaches.notDecided72h.toString()],
      ];

      const pdfBuffer = await generatePDF({
        title: "SLA & Turnaround Time Report",
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          country: countryIds.length > 0 ? countryIds.join(", ") : undefined,
        },
        summary: {
          "Total Applications": slaMetrics.totalApplications,
          "Avg Time to First Review": `${avgTimeToFirstReview.toFixed(1)} hours`,
          "Avg Time to Decision": `${avgTimeToDecision.toFixed(1)} hours`,
        },
        headers,
        rows,
      });

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=sla-turnaround-${new Date().toISOString().split("T")[0]}.pdf`,
        },
      });
    }

    if (format === "xlsx" || format === "csv") {
      const exportData = [
        { "Metric": "Average Time to First Review (hours)", "Value": avgTimeToFirstReview.toFixed(1) },
        { "Metric": "Average Time to Decision (hours)", "Value": avgTimeToDecision.toFixed(1) },
        { "Metric": "Applications Not Touched > 24h", "Value": slaMetrics.slaBreaches.notTouched24h },
        { "Metric": "Applications Not Touched > 48h", "Value": slaMetrics.slaBreaches.notTouched48h },
        { "Metric": "Applications Not Decided > 48h (after payment)", "Value": slaMetrics.slaBreaches.notDecided48h },
        { "Metric": "Applications Not Decided > 72h (after payment)", "Value": slaMetrics.slaBreaches.notDecided72h },
      ];

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SLA Report");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=sla-turnaround-${new Date().toISOString().split("T")[0]}.xlsx`,
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
            "Content-Disposition": `attachment; filename=sla-turnaround-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    return NextResponse.json({
      summary: {
        totalApplications: slaMetrics.totalApplications,
        avgTimeToFirstReview,
        avgTimeToDecision,
        slaBreaches: slaMetrics.slaBreaches,
      },
    });
  } catch (error) {
    console.error("Error fetching SLA report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

