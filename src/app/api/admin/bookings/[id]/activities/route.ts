import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



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

    // Fetch audit logs for this booking
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "BOOKING",
        entityId: params.id,
      },
      include: {
        admin: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    // Generate activity log from booking history and audit logs
    const activities: any[] = [
      {
        id: "created",
        action: "CREATE",
        description: `Booking created by ${booking.user.email}`,
        adminName: null,
        createdAt: booking.createdAt,
      },
    ];

    // Add audit log entries
    auditLogs.forEach((log) => {
      activities.push({
        id: log.id,
        action: log.action,
        description: log.description,
        adminName: log.admin?.name || log.admin?.email || null,
        createdAt: log.timestamp,
      });
    });

    // Add payment activities
    booking.payments.forEach((payment) => {
      const isAdvance = payment.amount < booking.totalAmount;
      activities.push({
        id: `payment-${payment.id}`,
        action: payment.status === "COMPLETED" ? "PAYMENT_RECEIVED" : payment.status,
        description: `Payment ${payment.status.toLowerCase()}: ₹${payment.amount.toLocaleString()}${isAdvance ? " (Advance)" : " (Full Payment)"}`,
        adminName: null,
        createdAt: payment.createdAt,
      });
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

