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

    // Get bookings with tour details
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        tour: {
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
    let filteredBookings = bookings;
    if (countryIds.length > 0) {
      filteredBookings = bookings.filter((booking) => {
        const countryId = booking.tour?.countryId;
        return countryId && countryIds.includes(countryId);
      });
    }

    // Group by tour
    const tourMap: Record<string, {
      tourId: string;
      tourName: string;
      countryName: string;
      totalBookings: number;
      paidBookings: number;
      totalRevenue: number;
      totalTravellers: number;
      cancelledCount: number;
    }> = {};

    filteredBookings.forEach((booking) => {
      const tourId = booking.tourId || "unknown";
      const tourName = booking.tourName || booking.tour?.name || "Unknown";
      const countryName = booking.tour?.country?.name || "Unknown";
      const key = `${tourId}-${tourName}`;

      if (!tourMap[key]) {
        tourMap[key] = {
          tourId,
          tourName,
          countryName,
          totalBookings: 0,
          paidBookings: 0,
          totalRevenue: 0,
          totalTravellers: 0,
          cancelledCount: 0,
        };
      }

      tourMap[key].totalBookings++;
      tourMap[key].totalTravellers += booking.travellers.length;

      if (booking.payments.length > 0) {
        tourMap[key].paidBookings++;
        tourMap[key].totalRevenue += booking.payments.reduce((sum, p) => sum + p.amount, 0);
      }

      if (booking.status === "CANCELLED" || booking.status === "CANCELLED") {
        tourMap[key].cancelledCount++;
      }
    });

    // Calculate metrics
    const tourData = Object.values(tourMap).map((tour) => {
      const avgTravellers = tour.totalBookings > 0
        ? tour.totalTravellers / tour.totalBookings
        : 0;
      const cancellationRate = tour.totalBookings > 0
        ? (tour.cancelledCount / tour.totalBookings) * 100
        : 0;

      return {
        ...tour,
        avgTravellers,
        cancellationRate,
      };
    }).sort((a, b) => b.totalBookings - a.totalBookings);

    // Export handling
    if (format === "pdf") {
      const headers = ["Tour Name", "Country", "Bookings", "Paid", "Revenue (INR)", "Avg Travellers", "Cancellation Rate (%)"];
      const rows = tourData.map((t) => [
        t.tourName,
        t.countryName,
        t.totalBookings,
        t.paidBookings,
        t.totalRevenue,
        t.avgTravellers.toFixed(1),
        t.cancellationRate.toFixed(1),
      ]);

      const pdfBuffer = await generatePDF({
        title: "Tour Performance Report",
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          country: countryIds.length > 0 ? countryIds.join(", ") : undefined,
        },
        summary: {
          "Total Tours": tourData.length,
          "Total Bookings": tourData.reduce((sum, t) => sum + t.totalBookings, 0),
          "Total Revenue": `₹${tourData.reduce((sum, t) => sum + t.totalRevenue, 0).toLocaleString()}`,
        },
        headers,
        rows,
      });

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=tour-performance-${new Date().toISOString().split("T")[0]}.pdf`,
        },
      });
    }

    if (format === "xlsx" || format === "csv") {
      const exportData = tourData.map((tour) => ({
        "Tour Name": tour.tourName,
        "Country": tour.countryName,
        "Total Bookings": tour.totalBookings,
        "Paid Bookings": tour.paidBookings,
        "Total Revenue (INR)": tour.totalRevenue,
        "Average Travellers per Booking": tour.avgTravellers.toFixed(1),
        "Cancelled": tour.cancelledCount,
        "Cancellation Rate (%)": tour.cancellationRate.toFixed(1),
      }));

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tour Performance");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=tour-performance-${new Date().toISOString().split("T")[0]}.xlsx`,
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
            "Content-Disposition": `attachment; filename=tour-performance-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    return NextResponse.json({
      summary: {
        totalTours: tourData.length,
        totalBookings: tourData.reduce((sum, t) => sum + t.totalBookings, 0),
        totalRevenue: tourData.reduce((sum, t) => sum + t.totalRevenue, 0),
      },
      rows: tourData,
    });
  } catch (error) {
    console.error("Error fetching tour performance report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

