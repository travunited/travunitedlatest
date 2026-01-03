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

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const unconfirmed = searchParams.get("unconfirmed") === "true";
    const tour = searchParams.get("tour");
    const unassigned = searchParams.get("unassigned") === "true";
    const assigned = searchParams.get("assigned") === "true";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const travelDateFrom = searchParams.get("travelDateFrom");
    const travelDateTo = searchParams.get("travelDateTo");
    const paymentStatus = searchParams.get("paymentStatus");
    const assignedAdmin = searchParams.get("assignedAdmin");
    const destination = searchParams.get("destination");
    const search = searchParams.get("search");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    if (tour) {
      where.tourName = {
        contains: tour,
        mode: "insensitive",
      };
    }

    // Filter unassigned bookings
    if (unassigned) {
      where.processedById = null;
    }

    // Filter assigned bookings
    if (assigned) {
      where.processedById = {
        not: null,
      };
    }

    // Filter by assigned admin
    if (assignedAdmin) {
      where.processedById = assignedAdmin;
    }

    // Filter unconfirmed bookings (booked but not confirmed)
    if (unconfirmed) {
      where.status = "BOOKED";
    }

    // Date range filter (created date)
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

    // Travel date range filter
    if (travelDateFrom || travelDateTo) {
      where.travelDate = {};
      if (travelDateFrom) {
        where.travelDate.gte = new Date(travelDateFrom);
      }
      if (travelDateTo) {
        const toDate = new Date(travelDateTo);
        toDate.setHours(23, 59, 59, 999);
        where.travelDate.lte = toDate;
      }
    }

    // Destination filter
    if (destination) {
      where.Tour = {
        destination: {
          contains: destination,
          mode: "insensitive",
        },
      };
    }

    // Search filter (Booking ID, phone, email, customer name)
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { User_Booking_userIdToUser: { email: { contains: search, mode: "insensitive" } } },
        { User_Booking_userIdToUser: { name: { contains: search, mode: "insensitive" } } },
        { User_Booking_userIdToUser: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        User_Booking_userIdToUser: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        User_Booking_processedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Payment: {
          select: {
            amount: true,
            status: true,
          },
        },
        BookingTraveller: {
          select: {
            id: true,
          },
        },
        Tour: {
          select: {
            id: true,
            name: true,
            destination: true,
            Country: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate amount paid, pending balance, and payment status for each booking
    const bookingsWithPayment = bookings.map((booking) => {
      const completedPayments = booking.Payment.filter((p) => p.status === "COMPLETED");
      const failedPayments = booking.Payment.filter((p) => p.status === "FAILED");
      const refundedPayments = booking.Payment.filter((p) => p.status === "REFUNDED");

      const amountPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      const amountRefunded = refundedPayments.reduce((sum, p) => sum + p.amount, 0);
      const pendingBalance = booking.totalAmount - amountPaid;

      // Determine payment status
      let paymentStatus = "PENDING";
      if (amountRefunded > 0) {
        paymentStatus = "REFUNDED";
      } else if (amountPaid >= booking.totalAmount) {
        paymentStatus = "PAID";
      } else if (amountPaid > 0) {
        paymentStatus = "PARTIAL";
      } else if (failedPayments.length > 0) {
        paymentStatus = "FAILED";
      }

      // Determine source (if created by admin, there might be a flag - for now assume all are from website)
      const source = booking.source || "WEBSITE";

      // Serialize dates immediately
      const serializeDate = (date: Date | null | undefined): string | null => {
        if (!date) return null;
        return date instanceof Date ? date.toISOString() : (typeof date === 'string' ? date : new Date(date).toISOString());
      };

      return {
        id: booking.id,
        tourName: booking.tourName,
        status: booking.status,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        travelDate: serializeDate(booking.travelDate),
        createdAt: serializeDate(booking.createdAt),
        updatedAt: serializeDate(booking.updatedAt),
        amountPaid,
        pendingBalance: pendingBalance > 0 ? pendingBalance : 0,
        paymentStatus,
        source,
        travellersCount: booking.BookingTraveller.length,
        user: booking.User_Booking_userIdToUser,
        processedBy: booking.User_Booking_processedByIdToUser,
        tour: booking.Tour,
      };
    });

    // Filter by payment status if provided
    let filteredBookings = bookingsWithPayment;
    if (paymentStatus && paymentStatus !== "ALL") {
      filteredBookings = bookingsWithPayment.filter((b) => b.paymentStatus === paymentStatus);
    }

    // Filter out invalid entries and ensure user data is properly formatted
    const transformedBookings = filteredBookings
      .filter((booking) => booking && booking.id && booking.user)
      .map((booking) => ({
        id: booking.id,
        tourName: booking.tourName,
        status: booking.status,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        travelDate: booking.travelDate,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        user: {
          name: booking.user?.name || "Unknown",
          email: booking.user?.email || "",
          phone: booking.user?.phone || null,
        },
        processedBy: booking.processedBy ? {
          id: booking.processedBy.id,
          name: booking.processedBy.name || "Unknown",
          email: booking.processedBy.email || "",
        } : null,
        amountPaid: booking.amountPaid,
        pendingBalance: booking.pendingBalance,
        paymentStatus: booking.paymentStatus,
        source: booking.source,
        travellersCount: booking.travellersCount,
        tour: booking.tour,
      }));

    return NextResponse.json(transformedBookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

