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

    // Get bookings with tour details
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        Tour: {
          include: {
            Country: true,
          },
        },
        BookingTraveller: true,
        Payment: {
          where: {
            status: "COMPLETED",
          },
        },
      },
    });

    // Filter by country if specified
    let filteredBookings = bookings;
    if (countryIds.length > 0) {
      filteredBookings = bookings.filter((booking: any) => {
        const countryId = booking.Tour?.countryId;
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

    filteredBookings.forEach((booking: any) => {
      const tourId = booking.tourId || "unknown";
      const tourName = booking.tourName || booking.Tour?.name || "Unknown";
      const countryName = booking.Tour?.Country?.name || "Unknown";
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
      tourMap[key].totalTravellers += (Array.isArray(booking.BookingTraveller) ? booking.BookingTraveller.length : 0);

      if (booking.Payment && Array.isArray(booking.Payment) && booking.Payment.length > 0) {
        tourMap[key].paidBookings++;
        tourMap[key].totalRevenue += booking.Payment.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      }

      if (booking.status === "CANCELLED") {
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

