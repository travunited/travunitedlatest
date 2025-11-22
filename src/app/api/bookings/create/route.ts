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
  advancePercentage: z.number().nullable().optional(), // Accept null, undefined, or number
  travelDate: z.string(),
  numberOfAdults: z.number().int().min(1, "At least one adult is required"),
  numberOfChildren: z.number().int().min(0).nullable().optional(), // Accept null or number
  primaryContact: z.object({
    name: z.string().min(1, "Primary contact name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().nullable().optional(), // Accept null, undefined, or string
  }),
  travellers: z.array(
    z.object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      age: z.string().min(1, "Age is required"),
      gender: z.string().nullable().optional(), // Accept null, undefined, or string
    })
  ).min(1, "At least one traveller is required"),
  paymentType: z.enum(["full", "advance"]),
  customizations: z.record(z.boolean()).nullable().optional(), // Accept null or object
  hotelCategory: z.string().nullable().optional(), // Accept null, undefined, or string
});

export async function POST(req: Request) {
  try {
    // Log the incoming request for debugging
    const body = await req.json();
    console.log("Booking creation request received:", {
      tourId: body.tourId,
      tourName: body.tourName,
      travelDate: body.travelDate,
      numberOfAdults: body.numberOfAdults,
      numberOfChildren: body.numberOfChildren,
      travellersCount: body.travellers?.length,
      primaryContactEmail: body.primaryContact?.email,
      paymentType: body.paymentType,
      hasCustomizations: !!body.customizations,
      hasHotelCategory: !!body.hotelCategory,
    });

    // Validate request body with detailed error messages
    let data;
    try {
      data = bookingSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errorMessages = validationError.errors.map((err) => {
          const path = err.path.join(".");
          return `${path}: ${err.message}`;
        });
        
        const errorMessage = `Validation failed: ${errorMessages.join(", ")}`;
        console.error("Booking validation error:", {
          errors: validationError.errors,
          body: {
            tourId: body.tourId,
            travelDate: body.travelDate,
            numberOfAdults: body.numberOfAdults,
            numberOfChildren: body.numberOfChildren,
            travellersLength: body.travellers?.length,
            primaryContact: body.primaryContact ? { name: body.primaryContact.name, email: body.primaryContact.email } : null,
          },
        });

        return NextResponse.json(
          {
            error: errorMessage,
            details: validationError.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

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
  } catch (error: any) {
    // Handle Zod validation errors (should already be caught above, but as a fallback)
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => {
        const path = err.path.join(".");
        return `${path}: ${err.message}`;
      });
      
      console.error("Booking validation error (catch block):", {
        errors: error.errors,
      });

      return NextResponse.json(
        {
          error: `Validation failed: ${errorMessages.join(", ")}`,
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Log full error details for debugging
    console.error("Error creating booking:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      meta: error?.meta,
    });

    // Return user-friendly error message
    return NextResponse.json(
      {
        error: error?.message || "Failed to create booking. Please try again.",
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

