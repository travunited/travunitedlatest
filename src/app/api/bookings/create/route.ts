import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
export const dynamic = "force-dynamic";



const bookingSchema = z.object({
  tourId: z.string(),
  tourName: z.string(),
  tourPrice: z.number(),
  advancePercentage: z.number().optional(),
  travelDate: z.string(),
  numberOfAdults: z.number(),
  numberOfChildren: z.number().optional(),
  primaryContact: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  travellers: z.array(
    z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.string(),
      gender: z.string().optional(),
    })
  ),
  paymentType: z.enum(["full", "advance"]),
  customizations: z.record(z.boolean()).optional(),
  hotelCategory: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = bookingSchema.parse(body);

    const tourRecord = await prisma.tour.findFirst({
      where: {
        OR: [{ id: data.tourId }, { slug: data.tourId }],
      },
      select: {
        id: true,
        name: true,
        price: true,
        advancePercentage: true,
      },
    });

    if (!tourRecord) {
      return NextResponse.json(
        { error: "Selected tour not found. Please refresh and try again." },
        { status: 400 }
      );
    }

    // Get user - must be logged in
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please login or signup to continue" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Use the provided tourPrice (which already includes customizations)
    // If not provided or invalid, calculate from base price
    const totalTravellers = data.numberOfAdults + (data.numberOfChildren || 0);
    let totalAmount = 0;
    
    if (typeof data.tourPrice === "number" && data.tourPrice > 0) {
      // Use the final amount from frontend (includes customizations)
      totalAmount = data.tourPrice;
    } else {
      // Fallback: calculate from base price
      const basePrice = tourRecord.price || 0;
      totalAmount = basePrice * totalTravellers;
    }

    // Ensure we have at least one traveller
    if (totalTravellers < 1) {
      return NextResponse.json(
        { error: "At least one traveller is required" },
        { status: 400 }
      );
    }

    // Validate travellers array matches count
    if (data.travellers.length !== totalTravellers) {
      return NextResponse.json(
        { error: "Number of travellers does not match traveller details provided" },
        { status: 400 }
      );
    }

    // Validate travel date is not in past
    const travelDate = new Date(data.travelDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (travelDate < today) {
      return NextResponse.json(
        { error: "Travel date cannot be in the past" },
        { status: 400 }
      );
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        tourId: tourRecord.id,
        tourName: data.tourName || tourRecord.name,
        status: "DRAFT",
        totalAmount: Math.round(totalAmount), // Store full amount (will be updated after payment)
        currency: "INR",
        travelDate: travelDate,
      },
    });

    // Create travellers (simplified - no passport details for tours)
    for (const travellerData of data.travellers) {
      // Validate required fields
      if (!travellerData.firstName || !travellerData.lastName || !travellerData.age) {
        return NextResponse.json(
          { error: "All traveller details (first name, last name, age) are required" },
          { status: 400 }
        );
      }

      // For tours, we can create simple traveller records or store in booking directly
      // For now, we'll create a basic traveller record
      let traveller = await prisma.traveller.findFirst({
        where: {
          userId,
          firstName: travellerData.firstName,
          lastName: travellerData.lastName,
        },
      });

      if (!traveller) {
        traveller = await prisma.traveller.create({
          data: {
            userId,
            firstName: travellerData.firstName.trim(),
            lastName: travellerData.lastName.trim(),
            email: data.primaryContact.email,
            phone: data.primaryContact.phone || null,
          },
        });
      }

      // Link traveller to booking
      await prisma.bookingTraveller.create({
        data: {
          bookingId: booking.id,
          travellerId: traveller.id,
        },
      });
    }

    return NextResponse.json({
      bookingId: booking.id,
      message: "Booking created successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

