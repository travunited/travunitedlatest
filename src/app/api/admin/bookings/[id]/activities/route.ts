import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        processedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Generate activity log from booking history
    const activities: any[] = [
      {
        id: "created",
        type: "booking_created",
        description: `Booking created by ${booking.user.email}`,
        createdBy: null,
        createdAt: booking.createdAt,
      },
    ];

    // Add status change if updated
    if (booking.updatedAt > booking.createdAt) {
      activities.push({
        id: "updated",
        type: "status_changed",
        description: `Status changed to ${booking.status}`,
        createdBy: booking.processedBy?.name || booking.processedBy?.email || null,
        createdAt: booking.updatedAt,
      });
    }

    // Add payment activities
    booking.payments.forEach((payment) => {
      if (payment.status === "COMPLETED") {
        const isAdvance = payment.amount < booking.totalAmount;
        activities.push({
          id: payment.id,
          type: "payment_received",
          description: `Payment received: ₹${payment.amount.toLocaleString()}${isAdvance ? " (Advance)" : " (Full Payment)"}`,
          createdBy: null,
          createdAt: payment.createdAt,
        });
      }
    });

    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

