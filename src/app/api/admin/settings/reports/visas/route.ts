import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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
    const format = searchParams.get("format"); // csv or json

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

    // Count by status
    const statusCounts = await prisma.application.groupBy({
      by: ["status"],
      where,
      _count: {
        id: true,
      },
    });

    const statusCountsMap: Record<string, number> = {};
    statusCounts.forEach((item) => {
      statusCountsMap[item.status] = item._count.id;
    });

    // Top countries
    const topCountries = await prisma.application.groupBy({
      by: ["country"],
      where: {
        ...where,
        country: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    });

    // Conversion stats
    const allApplications = await prisma.application.findMany({
      where,
      select: {
        status: true,
      },
    });

    const started = allApplications.length;
    const paid = allApplications.filter((app) =>
      ["SUBMITTED", "IN_PROCESS", "APPROVED", "REJECTED"].includes(app.status)
    ).length;
    const approved = allApplications.filter((app) => app.status === "APPROVED").length;
    const conversionRate = started > 0 ? (approved / started) * 100 : 0;

    const report = {
      statusCounts: statusCountsMap,
      topCountries: topCountries.map((item) => ({
        country: item.country || "Unknown",
        count: item._count.id,
      })),
      conversion: {
        started,
        paid,
        approved,
        conversionRate,
      },
    };

    if (format === "csv") {
      // Generate CSV
      let csv = "Status,Count\n";
      Object.entries(statusCountsMap).forEach(([status, count]) => {
        csv += `${status},${count}\n`;
      });
      csv += "\nTop Countries\nCountry,Count\n";
      topCountries.forEach((item) => {
        csv += `${item.country || "Unknown"},${item._count.id}\n`;
      });
      csv += "\nConversion\nMetric,Value\n";
      csv += `Started,${started}\n`;
      csv += `Paid,${paid}\n`;
      csv += `Approved,${approved}\n`;
      csv += `Conversion Rate,${conversionRate.toFixed(2)}%\n`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="visa-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating visa report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

