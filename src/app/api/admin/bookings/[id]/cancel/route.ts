import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTourStatusUpdateEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
import { notify } from "@/lib/notifications";
export const dynamic = "force-dynamic";

export async function POST(
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
    const { reason, status } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Cancellation reason is required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        user: {
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

    // Update booking status and add cancellation reason to notes
    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: { 
        status: status || "CANCELLED",
        notes: booking.notes 
          ? `${booking.notes}\n\n[CANCELLED ${new Date().toISOString()}] Reason: ${reason}`
          : `[CANCELLED ${new Date().toISOString()}] Reason: ${reason}`
      },
    });

    // Send email notification
    try {
      await sendTourStatusUpdateEmail(
        booking.user.email,
        booking.id,
        booking.tourName || "",
        "CANCELLED"
      );
      // TODO: Enhance email template to include cancellation reason
    } catch (emailError) {
      console.error("Error sending cancellation email:", emailError);
    }

    // Send in-app notification
    try {
      await notify({
        userId: booking.userId,
        type: "TOUR_BOOKING_CANCELLED",
        title: "Tour booking cancelled",
        message: `Your booking for ${booking.tourName || "tour"} has been cancelled. Reason: ${reason}`,
        link: `/bookings/${booking.id}`,
      });
    } catch (notifyError) {
      console.error("Error sending notification:", notifyError);
    }

    // Log audit event
    try {
      await logAuditEvent({
        adminId: session.user.id,
        entityType: AuditEntityType.BOOKING,
        entityId: booking.id,
        action: AuditAction.UPDATE,
        description: `Booking cancelled. Reason: ${reason}`,
        metadata: {
          previousStatus,
          newStatus: "CANCELLED",
          reason,
        },
      });
    } catch (auditError) {
      console.error("Error logging audit event:", auditError);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

