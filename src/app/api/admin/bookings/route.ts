import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    
    // Filter unconfirmed bookings (booked but not confirmed)
    if (unconfirmed) {
      where.status = "BOOKED";
    }
    
    // Date range filter
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

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        processedBy: {
          select: {
            name: true,
            email: true,
          },
        },
        payments: {
          where: {
            status: "COMPLETED",
          },
          select: {
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate amount paid and pending balance for each booking
    const bookingsWithPayment = bookings.map((booking) => {
      const amountPaid = booking.payments.reduce((sum, p) => sum + p.amount, 0);
      const pendingBalance = booking.totalAmount - amountPaid;
      return {
        ...booking,
        amountPaid,
        pendingBalance: pendingBalance > 0 ? pendingBalance : 0,
      };
    });

    return NextResponse.json(bookingsWithPayment);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

