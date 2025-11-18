import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTourStatusUpdateEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
export const dynamic = "force-dynamic";



export async function POST(req: Request) {
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

    const body = await req.json();
    const { bookingIds, status } = body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json(
        { error: "No bookings provided" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Get bookings with user emails for notifications
    const bookings = await prisma.booking.findMany({
      where: {
        id: {
          in: bookingIds,
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    // Bulk update status
    await prisma.booking.updateMany({
      where: {
        id: {
          in: bookingIds,
        },
      },
      data: {
        status,
      },
    });

    // Send email notifications
    for (const booking of bookings) {
      try {
        await sendTourStatusUpdateEmail(
          booking.user.email,
          booking.id,
          booking.tourName || "",
          status
        );

        await logAuditEvent({
          adminId: session.user.id,
          entityType: AuditEntityType.BOOKING,
          entityId: booking.id,
          action: AuditAction.STATUS_CHANGE,
          description: `Booking status changed via bulk action to ${status}`,
          metadata: {
            previousStatus: booking.status,
            newStatus: status,
            bulk: true,
          },
        });
      } catch (error) {
        console.error(`Error sending email for booking ${booking.id}:`, error);
      }
    }

    return NextResponse.json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Error bulk updating status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

