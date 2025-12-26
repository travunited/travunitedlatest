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

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        BookingTraveller: {
          include: {
            Traveller: true,
          },
        },
        User_Booking_userIdToUser: {
          select: {
            name: true,
            email: true,
          },
        },
        PromoCodeUsage: {
          select: {
            id: true,
            promoCodeId: true,
          },
        },
      },
    });

    if (!booking || booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...booking,
      travellers: (booking as any).BookingTraveller,
      user: (booking as any).User_Booking_userIdToUser,
      promoCode: (booking as any).PromoCodeUsage?.[0], // Map single usage back if exists
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

