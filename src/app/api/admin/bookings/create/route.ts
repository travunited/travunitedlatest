import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { notify } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
export const dynamic = "force-dynamic";

const travellerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  passportNumber: z.string().nullable().optional(),
  passportExpiry: z.string().nullable().optional(),
  passportIssuingCountry: z.string().nullable().optional(),
});

const bookingSchema = z.object({
  tourId: z.string(),
  tourName: z.string(),
  travelDate: z.string(),
  numberOfAdults: z.number().int().min(1),
  numberOfChildren: z.number().int().min(0).nullable().optional(),
  paymentType: z.enum(["full", "advance"]),
  tourPrice: z.number().nonnegative(),
  primaryContact: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
  }),
  travellers: z.array(travellerSchema).min(1),
  preferences: z.object({
    foodPreference: z.string().max(100).nullable().optional(),
    foodPreferenceNotes: z.string().max(500).nullable().optional(),
    languagePreference: z.string().max(100).nullable().optional(),
    languagePreferenceOther: z.string().max(100).nullable().optional(),
    driverPreference: z.string().max(200).nullable().optional(),
    specialRequests: z.string().max(1000).nullable().optional(),
  }).optional(),
  paymentMode: z.enum(["pay_later", "offline"]).optional(),
});

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
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = bookingSchema.parse(body);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: data.primaryContact.email },
    });

    if (!user) {
      // Create new user account
      user = await prisma.user.create({
        data: {
          email: data.primaryContact.email,
          name: data.primaryContact.name,
          phone: data.primaryContact.phone || null,
          passwordHash: "", // Will need to set password via password reset
          role: "CUSTOMER",
          emailVerified: false,
        },
      });

      // Send welcome email with password reset link
      // TODO: Implement password reset email
    }

    const tourRecord = await prisma.tour.findFirst({
      where: {
        OR: [{ id: data.tourId }, { slug: data.tourId }],
      },
    });

    if (!tourRecord) {
      return NextResponse.json(
        { error: "Selected tour not found" },
        { status: 400 }
      );
    }

    const totalTravellers = data.numberOfAdults + (data.numberOfChildren || 0);
    const baseUnitPrice = tourRecord.basePriceInInr ?? tourRecord.price ?? 0;
    let baseAmount = baseUnitPrice * totalTravellers;

    // Calculate add-ons total (if any)
    let addOnsTotal = 0;
    // Add-ons would be handled separately if needed

    const totalAmount = baseAmount + addOnsTotal;

    // Create booking
    const booking = await prisma.$transaction(async (tx) => {
      // Create or update primary traveller
      let primaryTraveller = await tx.traveller.findFirst({
        where: {
          userId: user.id,
          email: data.primaryContact.email,
        },
      });

      if (!primaryTraveller) {
        primaryTraveller = await tx.traveller.create({
          data: {
            userId: user.id,
            firstName: data.primaryContact.name.split(" ")[0] || data.primaryContact.name,
            lastName: data.primaryContact.name.split(" ").slice(1).join(" ") || "",
            email: data.primaryContact.email,
            phone: data.primaryContact.phone || null,
          },
        });
      } else {
        await tx.traveller.update({
          where: { id: primaryTraveller.id },
          data: {
            email: data.primaryContact.email,
            phone: data.primaryContact.phone || null,
          },
        });
      }

      // Create booking
      const booking = await tx.booking.create({
        data: {
          userId: user.id,
          tourId: tourRecord.id,
          tourName: data.tourName,
          status: data.paymentMode === "offline" ? "BOOKED" : "PAYMENT_PENDING",
          totalAmount,
          currency: "INR",
          travelDate: new Date(data.travelDate),
          foodPreference: data.preferences?.foodPreference || null,
          foodPreferenceNotes: data.preferences?.foodPreferenceNotes || null,
          languagePreference: data.preferences?.languagePreference || null,
          languagePreferenceOther: data.preferences?.languagePreferenceOther || null,
          driverPreference: data.preferences?.driverPreference || null,
          specialRequests: data.preferences?.specialRequests || null,
          policyAccepted: true,
          processedById: session.user.id, // Assign to creating admin
        },
      });

      // Create booking travellers
      for (const travellerData of data.travellers) {
        let traveller = await tx.traveller.findFirst({
          where: {
            userId: user.id,
            firstName: travellerData.firstName,
            lastName: travellerData.lastName,
          },
        });

        if (!traveller) {
          traveller = await tx.traveller.create({
            data: {
              userId: user.id,
              firstName: travellerData.firstName,
              lastName: travellerData.lastName,
              email: data.primaryContact.email,
              phone: data.primaryContact.phone || null,
              dateOfBirth: travellerData.dateOfBirth ? new Date(travellerData.dateOfBirth) : null,
              passportNumber: travellerData.passportNumber || null,
              passportExpiry: travellerData.passportExpiry ? new Date(travellerData.passportExpiry) : null,
            },
          });
        }

        await tx.bookingTraveller.create({
          data: {
            bookingId: booking.id,
            travellerId: traveller.id,
            firstName: travellerData.firstName,
            lastName: travellerData.lastName,
            dateOfBirth: travellerData.dateOfBirth ? new Date(travellerData.dateOfBirth) : null,
            gender: travellerData.gender || null,
            nationality: travellerData.nationality || null,
            passportNumber: travellerData.passportNumber || null,
            passportExpiry: travellerData.passportExpiry ? new Date(travellerData.passportExpiry) : null,
            passportIssuingCountry: travellerData.passportIssuingCountry || null,
          },
        });
      }

      // If offline payment, create payment record
      if (data.paymentMode === "offline") {
        await tx.payment.create({
          data: {
            userId: user.id,
            bookingId: booking.id,
            amount: totalAmount,
            currency: "INR",
            status: "COMPLETED",
          },
        });
      }

      return booking;
    });

    // Send notification email to customer
    try {
      if (data.paymentMode === "pay_later") {
        await sendEmail({
          to: data.primaryContact.email,
          subject: `Booking Created - ${data.tourName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>Booking Created</h1>
              <p>Your booking for <strong>${data.tourName}</strong> has been created.</p>
              <p><strong>Travel Date:</strong> ${new Date(data.travelDate).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${totalAmount.toLocaleString()}</p>
              <p>You will receive a payment link shortly to complete your booking.</p>
              <p><a href="${process.env.NEXTAUTH_URL}/dashboard/bookings/${booking.id}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Booking</a></p>
              <p>Best regards,<br>The Travunited Team</p>
            </div>
          `,
        });
      } else {
        await sendEmail({
          to: data.primaryContact.email,
          subject: `Booking Confirmed - ${data.tourName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>Booking Confirmed</h1>
              <p>Your booking for <strong>${data.tourName}</strong> has been confirmed.</p>
              <p><strong>Travel Date:</strong> ${new Date(data.travelDate).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${totalAmount.toLocaleString()}</p>
              <p><a href="${process.env.NEXTAUTH_URL}/dashboard/bookings/${booking.id}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Booking</a></p>
              <p>Best regards,<br>The Travunited Team</p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // Don't fail the request if email fails
    }

    // Send in-app notification
    try {
      await notify({
        userId: user.id,
        type: data.paymentMode === "offline" ? "TOUR_BOOKING_CONFIRMED" : "TOUR_BOOKING_CREATED",
        title: data.paymentMode === "offline" ? "Booking Confirmed" : "Booking Created",
        message: `Your booking for ${data.tourName} has been ${data.paymentMode === "offline" ? "confirmed" : "created"}.`,
        link: `/dashboard/bookings/${booking.id}`,
      });
    } catch (notifyError) {
      console.error("Error sending notification:", notifyError);
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create booking",
      },
      { status: 500 }
    );
  }
}

