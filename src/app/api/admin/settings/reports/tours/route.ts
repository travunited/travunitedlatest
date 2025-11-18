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

    // Get bookings with payments
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        // Note: Payment relation doesn't exist, so we'll calculate from booking amounts
        // In production, join with Payment table
      },
    });

    // Group by tour
    const tourMap = new Map<string, {
      tourName: string;
      bookings: number;
      revenue: number;
      fullPayment: number;
      advancePayment: number;
    }>();

    bookings.forEach((booking) => {
      const tourName = booking.tourName || "Unknown";
      const existing = tourMap.get(tourName) || {
        tourName,
        bookings: 0,
        revenue: 0,
        fullPayment: 0,
        advancePayment: 0,
      };

      existing.bookings += 1;
      existing.revenue += booking.totalAmount;

      // For now, assume all bookings are full payment
      // In production, check Payment records to determine full vs advance
      if (booking.status === "COMPLETED" || booking.status === "CONFIRMED") {
        existing.fullPayment += booking.totalAmount;
      } else {
        existing.advancePayment += booking.totalAmount;
      }

      tourMap.set(tourName, existing);
    });

    const tours = Array.from(tourMap.values()).sort((a, b) => b.revenue - a.revenue);

    if (format === "csv") {
      let csv = "Tour Name,Bookings,Revenue,Full Payment,Advance Payment\n";
      tours.forEach((tour) => {
        csv += `${tour.tourName},${tour.bookings},${tour.revenue},${tour.fullPayment},${tour.advancePayment}\n`;
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="tour-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ tours });
  } catch (error) {
    console.error("Error generating tour report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

