import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTourStatusUpdateEmail } from "@/lib/email";
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
    const { notificationType } = body;

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

    // Send email notification
    try {
      await sendTourStatusUpdateEmail(
        booking.user.email,
        booking.id,
        booking.tourName || "",
        booking.status
      );
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return NextResponse.json(
        { error: "Failed to send email notification" },
        { status: 500 }
      );
    }

    // Send in-app notification
    try {
      let notificationTitle = "Booking update";
      let notificationMessage = `Your booking for ${booking.tourName || "tour"} has been updated.`;

      if (notificationType === "status_update") {
        notificationTitle = "Booking status updated";
        notificationMessage = `Your booking status has been updated to ${booking.status}.`;
      } else if (notificationType === "payment_reminder") {
        notificationTitle = "Payment reminder";
        notificationMessage = `Please complete payment for your booking.`;
      }

      await notify({
        userId: booking.userId,
        type: "TOUR_BOOKING_STATUS_UPDATE",
        title: notificationTitle,
        message: notificationMessage,
        link: `/bookings/${booking.id}`,
      });
    } catch (notifyError) {
      console.error("Error sending notification:", notifyError);
      // Don't fail if notification fails, email was sent
    }

    return NextResponse.json({ 
      message: "Notification sent successfully" 
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

