import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendTourConfirmedEmail,
  sendTourVouchersReadyEmail,
  sendTourPaymentReminderEmail,
  sendTourStatusUpdateEmail,
} from "@/lib/email";

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
    const { emailType } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
        payments: {
          where: {
            status: "COMPLETED",
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

    const amountPaid = booking.payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingBalance = booking.totalAmount - amountPaid;

    // Send appropriate email based on type
    switch (emailType) {
      case "tour_confirmed":
        await sendTourConfirmedEmail(
          booking.user.email,
          booking.id,
          booking.tourName || "",
          booking.user.role || "CUSTOMER"
        );
        break;

      case "vouchers_ready":
        await sendTourVouchersReadyEmail(
          booking.user.email,
          booking.id,
          booking.tourName || "",
          booking.user.role || "CUSTOMER"
        );
        break;

      case "payment_reminder":
        if (pendingBalance > 0) {
          await sendTourPaymentReminderEmail(
            booking.user.email,
            booking.id,
            booking.tourName || "",
            pendingBalance,
            undefined,
            booking.user.role || "CUSTOMER"
          );
        }
        break;

      case "status_update":
        await sendTourStatusUpdateEmail(
          booking.user.email,
          booking.id,
          booking.tourName || "",
          booking.status,
          booking.user.role || "CUSTOMER"
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error resending email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

