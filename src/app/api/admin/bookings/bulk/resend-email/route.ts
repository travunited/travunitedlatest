import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTourStatusUpdateEmail } from "@/lib/email";
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
    const { bookingIds } = body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json(
        { error: "No bookings provided" },
        { status: 400 }
      );
    }

    // Get bookings with user emails
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
            role: true,
          },
        },
      },
    });

    // Send status update emails
    for (const booking of bookings) {
      try {
        await sendTourStatusUpdateEmail(
          booking.user.email,
          booking.id,
          booking.tourName || "",
          booking.status,
          booking.user.role || "CUSTOMER"
        );
      } catch (error) {
        console.error(`Error sending email for booking ${booking.id}:`, error);
      }
    }

    return NextResponse.json({ message: "Emails sent successfully" });
  } catch (error) {
    console.error("Error resending emails:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

