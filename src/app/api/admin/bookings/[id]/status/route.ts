import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTourConfirmedEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
import { notify } from "@/lib/notifications";
export const dynamic = "force-dynamic";



export async function PUT(
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

    const body = await req.json();
    const { status } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        User_Booking_userIdToUser: {
          select: {
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

    const previousStatus = booking.status;

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: { status },
    });

    // Send email and notification if confirmed
    if (status === "CONFIRMED") {
      const userEmail = booking.User_Booking_userIdToUser.email;
      if (userEmail) {
        await sendTourConfirmedEmail(
          userEmail,
          booking.id,
          booking.tourName || ""
        );
      }
      await notify({
        userId: booking.userId,
        type: "TOUR_BOOKING_CONFIRMED",
        title: "Tour booking confirmed",
        message: `Your tour booking '${booking.tourName || ""}' has been confirmed.`,
        link: `/dashboard/bookings/${booking.id}`,
        data: {
          bookingId: booking.id,
          tourName: booking.tourName,
        },
        sendEmail: true,
      });
    } else if (status === "CANCELLED") {
      await notify({
        userId: booking.userId,
        type: "TOUR_BOOKING_CANCELLED",
        title: "Tour booking cancelled",
        message: `Your tour booking '${booking.tourName || ""}' has been cancelled.`,
        link: `/dashboard/bookings/${booking.id}`,
        data: {
          bookingId: booking.id,
          tourName: booking.tourName,
        },
        sendEmail: true,
      });
    } else if (previousStatus !== status) {
      await notify({
        userId: booking.userId,
        type: "TOUR_BOOKING_UPDATED",
        title: "Tour booking updated",
        message: `Your tour booking '${booking.tourName || ""}' status has been updated to ${status}.`,
        link: `/dashboard/bookings/${booking.id}`,
        data: {
          bookingId: booking.id,
          tourName: booking.tourName,
          status,
        },
        sendEmail: false,
      });
    }

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.BOOKING,
      entityId: params.id,
      action: AuditAction.STATUS_CHANGE,
      description: `Booking status changed from ${previousStatus} to ${status}`,
      metadata: {
        previousStatus,
        newStatus: status,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating booking status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

