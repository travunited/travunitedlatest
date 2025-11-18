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
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        travellers: {
          include: {
            traveller: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        processedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tour: {
          include: {
            country: {
              select: {
                id: true,
                name: true,
                code: true,
                flagUrl: true,
              },
            },
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

    const amountPaid = booking.payments
      .filter(p => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingBalance = booking.totalAmount - amountPaid;

    // Generate reference number from ID (format: TRV-YYYY-XXXXX)
    const year = new Date(booking.createdAt).getFullYear();
    const refSuffix = booking.id.slice(-5).toUpperCase();
    const referenceNumber = `TRB-${year}-${refSuffix}`;

    // Get activities/timeline
    const activities = await prisma.auditLog.findMany({
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
        createdAt: "asc",
      },
    });

    // Format response with additional computed fields
    const response = {
      ...booking,
      referenceNumber,
      amountPaid,
      pendingBalance: pendingBalance > 0 ? pendingBalance : 0,
      timeline: activities.map((activity) => ({
        id: activity.id,
        time: activity.createdAt,
        event: activity.description,
        adminName: activity.admin?.name || activity.admin?.email || "System",
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

