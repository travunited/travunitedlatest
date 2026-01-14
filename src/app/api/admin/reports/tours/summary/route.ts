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
    const status = searchParams.get("status");
    const format = searchParams.get("format");
    const selectedColumns = searchParams.getAll("selectedColumns");

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

    // Get bookings with related data
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        User_Booking_userIdToUser: {
          select: {
            name: true,
            email: true,
          },
        },
        BookingTraveller: {
          include: {
            Traveller: true,
          },
        },
        Payment: {
          where: {
            status: "COMPLETED",
          },
        },
        Tour: {
          include: {
            Country: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate summary
    const statusCounts: Record<string, number> = {};
    let paidCount = 0;
    let totalRevenue = 0;
    let totalTravellers = 0;

    bookings.forEach((booking: any) => {
      statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
      totalTravellers += booking.BookingTraveller.length;
      if (booking.Payment.length > 0) {
        paidCount++;
        totalRevenue += booking.Payment.reduce((sum: number, p: any) => sum + p.amount, 0);
      }
    });

    const avgBookingValue = paidCount > 0 ? totalRevenue / paidCount : 0;
    const avgGroupSize = bookings.length > 0 ? totalTravellers / bookings.length : 0;

    // Export handling
    if (format === "xlsx" || format === "csv") {
      const allExportData = bookings.map((booking: any) => {
        const year = new Date(booking.createdAt).getFullYear();
        const refSuffix = booking.id.slice(-5).toUpperCase();
        const referenceNumber = `TRB-${year}-${refSuffix}`;

        return {
          "Booking ID": booking.id,
          "Reference Number": referenceNumber,
          "Date": booking.createdAt.toISOString().split("T")[0],
          "Tour Name": booking.tourName || booking.Tour?.name || "N/A",
          "Country": booking.Tour?.Country?.name || "N/A",
          "Number of Travellers": booking.BookingTraveller.length,
          "Status": booking.status,
          "Payment Status": booking.Payment.length > 0 ? "Paid" : "Unpaid",
          "Total Amount (INR)": booking.totalAmount,
          "Amount Paid (INR)": booking.Payment.reduce((sum: number, p: any) => sum + p.amount, 0),
          "Customer Name": booking.User_Booking_userIdToUser.name || "N/A",
          "Customer Email": booking.User_Booking_userIdToUser.email || "N/A",
          "Travel Date": booking.travelDate ? new Date(booking.travelDate).toISOString().split("T")[0] : "N/A",
        };
      });

      // Filter columns if selectedColumns is provided
      let exportData = allExportData;
      if (selectedColumns.length > 0) {
        exportData = allExportData.map((row: any) => {
          const filteredRow: any = {};
          selectedColumns.forEach((col) => {
            if (row[col] !== undefined) {
              filteredRow[col] = row[col];
            }
          });
          return filteredRow;
        });
      }

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tour Bookings");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=tour-bookings-${new Date().toISOString().split("T")[0]}.xlsx`,
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
            "Content-Disposition": `attachment; filename=tour-bookings-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    // JSON response with pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedBookings = bookings.slice(start, end);

    return NextResponse.json({
      summary: {
        totalBookings: bookings.length,
        paidBookings: paidCount,
        statusCounts,
        totalRevenue,
        avgBookingValue,
        avgGroupSize,
      },
      rows: paginatedBookings.map((booking: any) => {
        const year = new Date(booking.createdAt).getFullYear();
        const refSuffix = booking.id.slice(-5).toUpperCase();
        const referenceNumber = `TRB-${year}-${refSuffix}`;

        return {
          id: booking.id,
          referenceNumber,
          createdAt: booking.createdAt,
          tourName: booking.tourName || booking.Tour?.name,
          country: booking.Tour?.Country?.name,
          travellerCount: booking.BookingTraveller.length,
          status: booking.status,
          paymentStatus: booking.Payment.length > 0 ? "Paid" : "Unpaid",
          totalAmount: booking.totalAmount,
          amountPaid: booking.Payment.reduce((sum: number, p: any) => sum + p.amount, 0),
          customerName: booking.User_Booking_userIdToUser.name,
          customerEmail: booking.User_Booking_userIdToUser.email || "N/A",
          travelDate: booking.travelDate,
        };
      }),
      pagination: {
        page,
        limit,
        total: bookings.length,
        totalPages: Math.ceil(bookings.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tour bookings report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

