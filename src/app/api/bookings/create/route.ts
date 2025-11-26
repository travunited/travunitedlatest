import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
export const dynamic = "force-dynamic";

const travellerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  age: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  passportNumber: z.string().nullable().optional(),
  passportExpiry: z.string().nullable().optional(),
  passportIssuingCountry: z.string().nullable().optional(),
  passportFileKey: z.string().nullable().optional(),
  passportFileName: z.string().nullable().optional(),
});

const bookingSchema = z.object({
  tourId: z.string(),
  tourName: z.string(),
  travelDate: z.string(),
  numberOfAdults: z.number().int().min(1, "At least one adult is required"),
  numberOfChildren: z.number().int().min(0).nullable().optional(),
  paymentType: z.enum(["full", "advance"]),
  tourPrice: z.number().nonnegative(),
  advancePercentage: z.number().nullable().optional(),
  primaryContact: z.object({
    name: z.string().min(1, "Primary contact name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().nullable().optional(),
  }),
  travellers: z.array(travellerSchema).min(1, "At least one traveller is required"),
  selectedAddOns: z.array(
    z.object({
      addOnId: z.string(),
      quantity: z.number().int().min(1).optional(),
    })
  ).optional(),
  preferences: z.object({
    foodPreference: z.string().max(100).nullable().optional(),
    foodPreferenceNotes: z.string().max(500).nullable().optional(),
    languagePreference: z.string().max(100).nullable().optional(),
    languagePreferenceOther: z.string().max(100).nullable().optional(),
    driverPreference: z.string().max(200).nullable().optional(),
    specialRequests: z.string().max(1000).nullable().optional(),
  }).optional(),
  policyAccepted: z.boolean(),
  policyVersion: z.string().nullable().optional(),
  customizations: z.record(z.boolean()).nullable().optional(),
  customisedPackage: z.object({
    isCustomisedPackage: z.boolean(),
    customRequestNotes: z.string().min(1, "Custom request notes are required for customised packages"),
    customBasePrice: z.number().nullable().optional(),
    customAddOnsPrice: z.number().nullable().optional(),
    customDiscount: z.number().nullable().optional(),
  }).nullable().optional(),
  hotelCategory: z.string().nullable().optional(),
});

const startOfDayUTC = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

export async function POST(req: Request) {
  try {
    const body = await req.json();

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

    if (!data.policyAccepted) {
      return NextResponse.json(
        { error: "You must accept the refund & cancellation policy before continuing." },
        { status: 400 }
      );
    }

    const tourRecord = await prisma.tour.findFirst({
      where: {
        OR: [{ id: data.tourId }, { slug: data.tourId }],
      },
      include: {
        addOns: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
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

    const totalTravellers = data.numberOfAdults + (data.numberOfChildren || 0);
    const baseUnitPrice = tourRecord.basePriceInInr ?? tourRecord.price ?? 0;
    let baseAmount = baseUnitPrice * totalTravellers;

    if (totalTravellers < 1) {
      return NextResponse.json(
        { error: "At least one traveller is required" },
        { status: 400 }
      );
    }

    if (data.travellers.length !== totalTravellers) {
      return NextResponse.json(
        { error: "Number of travellers does not match traveller details provided" },
        { status: 400 }
      );
    }

    const travelDate = startOfDayUTC(new Date(data.travelDate));
    const today = startOfDayUTC(new Date());
    if (travelDate < today) {
      return NextResponse.json(
        { error: "Travel date cannot be in the past" },
        { status: 400 }
      );
    }

    const requiresPassport =
      tourRecord.requiresPassport ||
      (tourRecord.tourType?.toLowerCase() === "international");

    const travellerValidationErrors: Array<{ field: string; message: string }> = [];

    data.travellers.forEach((traveller, index) => {
      if (!traveller.firstName || !traveller.lastName) {
        travellerValidationErrors.push({
          field: `travellers[${index}].name`,
          message: `Traveller ${index + 1}: First and last name are required.`,
        });
      }

      if (!traveller.dateOfBirth) {
        travellerValidationErrors.push({
          field: `travellers[${index}].dateOfBirth`,
          message: `Traveller ${index + 1}: Date of birth is required.`,
        });
      } else {
        const dob = startOfDayUTC(new Date(traveller.dateOfBirth));
        if (dob >= today) {
          travellerValidationErrors.push({
            field: `travellers[${index}].dateOfBirth`,
            message: `Traveller ${index + 1}: Date of birth must be in the past.`,
          });
        }
      }

      if (requiresPassport) {
        const passportNumberMissing = !traveller.passportNumber;
        const passportExpiryMissing = !traveller.passportExpiry;
        const passportCountryMissing = !traveller.passportIssuingCountry;

        if (passportNumberMissing) {
          travellerValidationErrors.push({
            field: `travellers[${index}].passportNumber`,
            message: `Traveller ${index + 1}: Passport number is required.`,
          });
        }

        if (passportCountryMissing) {
          travellerValidationErrors.push({
            field: `travellers[${index}].passportIssuingCountry`,
            message: `Traveller ${index + 1}: Passport issuing country is required.`,
          });
        }

        if (passportExpiryMissing) {
          travellerValidationErrors.push({
            field: `travellers[${index}].passportExpiry`,
            message: `Traveller ${index + 1}: Passport expiry date is required.`,
          });
        } else if (traveller.passportExpiry) {
          const expiryDate = startOfDayUTC(new Date(traveller.passportExpiry));
          if (expiryDate <= today) {
            travellerValidationErrors.push({
              field: `travellers[${index}].passportExpiry`,
              message: `Traveller ${index + 1}: Passport already expired.`,
            });
          }
          const minValidDate = new Date(travelDate);
          minValidDate.setUTCMonth(minValidDate.getUTCMonth() + 6);
          if (expiryDate < minValidDate) {
            travellerValidationErrors.push({
              field: `travellers[${index}].passportExpiry`,
              message: `Traveller ${index + 1}: Passport must be valid for at least 6 months from travel date.`,
            });
          }
        }

        if (!traveller.passportFileKey) {
          travellerValidationErrors.push({
            field: `travellers[${index}].passportFileKey`,
            message: `Traveller ${index + 1}: Passport copy upload is required.`,
          });
        }
      } else if (traveller.passportExpiry) {
        const expiryDate = startOfDayUTC(new Date(traveller.passportExpiry));
        if (expiryDate <= today) {
          travellerValidationErrors.push({
            field: `travellers[${index}].passportExpiry`,
            message: `Traveller ${index + 1}: Passport already expired.`,
          });
        }
      }
    });

    if (travellerValidationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Traveller validation failed",
          details: travellerValidationErrors,
        },
        { status: 400 }
      );
    }

    const tourAddOns = tourRecord.addOns ?? [];
    const requestedAddOns = new Map<string, number>();
    (data.selectedAddOns || []).forEach((selection) => {
      const current = requestedAddOns.get(selection.addOnId) ?? 0;
      requestedAddOns.set(selection.addOnId, current + (selection.quantity ?? 1));
    });

    const addOnById = new Map(tourAddOns.map((addOn) => [addOn.id, addOn]));
    const addOnErrors: string[] = [];
    const bookingAddOnPayload: Array<{
      addOnId: string;
      name: string;
      pricingType: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      metadata: Prisma.InputJsonValue;
    }> = [];

    let addOnsTotal = 0;
    const perPersonQty = Math.max(totalTravellers, 1);

    const includeAddOn = (
      addOnId: string,
      requestedQuantity: number | undefined,
      reason: "selected" | "required"
    ) => {
      const addOn = addOnById.get(addOnId);
      if (!addOn) {
        addOnErrors.push(`Invalid add-on selected (${addOnId}).`);
        return;
      }
      const unitPrice = addOn.price ?? 0;
      const quantity =
        addOn.pricingType === "PER_PERSON"
          ? perPersonQty
          : Math.max(1, requestedQuantity ?? 1);
      const totalPrice = unitPrice * quantity;
      addOnsTotal += totalPrice;
      bookingAddOnPayload.push({
        addOnId: addOn.id,
        name: addOn.name,
        pricingType: addOn.pricingType,
        quantity,
        unitPrice,
        totalPrice,
        metadata: {
          reason,
        } as Prisma.InputJsonValue,
      });
    };

    requestedAddOns.forEach((quantity, addOnId) => {
      includeAddOn(addOnId, quantity, "selected");
    });

    tourAddOns
      .filter((addOn) => addOn.isRequired)
      .forEach((addOn) => includeAddOn(addOn.id, 1, "required"));

    if (addOnErrors.length > 0) {
      return NextResponse.json(
        { error: "Invalid add-ons provided", details: addOnErrors },
        { status: 400 }
      );
    }

    const totalAmount = Math.round(baseAmount + addOnsTotal);
    const preferences = data.preferences || {};
    const consentTimestamp = new Date();
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // Determine booking status based on customised package
    const isCustomisedPackage = data.customisedPackage?.isCustomisedPackage || false;
    const initialStatus = isCustomisedPackage ? "REQUEST_RECEIVED" : "DRAFT";
    
    // Calculate total amount for customised packages
    let finalTotalAmount = totalAmount;
    if (isCustomisedPackage && data.customisedPackage) {
      const customBase = data.customisedPackage.customBasePrice || baseAmount;
      const customAddOns = data.customisedPackage.customAddOnsPrice || addOnsTotal;
      const discount = data.customisedPackage.customDiscount || 0;
      finalTotalAmount = customBase + customAddOns - discount;
    }

    const booking = await prisma.$transaction(async (tx) => {
      // Build special requests with custom package info if applicable
      let specialRequestsText = preferences.specialRequests || "";
      if (isCustomisedPackage && data.customisedPackage) {
        const customInfo = `\n\n[CUSTOMISED PACKAGE REQUEST]\n${data.customisedPackage.customRequestNotes}`;
        if (data.customisedPackage.customBasePrice) {
          specialRequestsText += `${customInfo}\nCustom Base Price: ₹${data.customisedPackage.customBasePrice.toLocaleString()}`;
        }
        if (data.customisedPackage.customAddOnsPrice) {
          specialRequestsText += `\nCustom Add-ons Price: ₹${data.customisedPackage.customAddOnsPrice.toLocaleString()}`;
        }
        if (data.customisedPackage.customDiscount) {
          specialRequestsText += `\nDiscount: ₹${data.customisedPackage.customDiscount.toLocaleString()}`;
        }
        specialRequestsText += customInfo;
      }

      const bookingRecord = await tx.booking.create({
        data: {
          userId,
          tourId: tourRecord.id,
          tourName: data.tourName || tourRecord.name,
          status: initialStatus,
          totalAmount: finalTotalAmount,
          currency: "INR",
          travelDate,
          foodPreference: preferences.foodPreference || null,
          foodPreferenceNotes: preferences.foodPreferenceNotes || null,
          languagePreference: preferences.languagePreference || null,
          languagePreferenceOther: preferences.languagePreferenceOther || null,
          driverPreference: preferences.driverPreference || null,
          specialRequests: specialRequestsText || null,
          policyAccepted: true,
          policyAcceptedAt: consentTimestamp,
          policyAcceptedByUserId: userId,
          policyVersion: data.policyVersion || null,
          policyAcceptedIp: ipAddress,
          policyAcceptedUserAgent: userAgent,
        },
      });

      if (bookingAddOnPayload.length > 0) {
        for (const payload of bookingAddOnPayload) {
          await tx.bookingAddOn.create({
            data: {
              bookingId: bookingRecord.id,
              ...payload,
            },
          });
        }
      }

      for (const travellerData of data.travellers) {
        let traveller = null;
        if (travellerData.passportNumber) {
          traveller = await tx.traveller.findFirst({
            where: {
              userId,
              passportNumber: travellerData.passportNumber,
            },
          });
        }

        if (!traveller) {
          traveller = await tx.traveller.findFirst({
            where: {
              userId,
              firstName: travellerData.firstName,
              lastName: travellerData.lastName,
            },
          });
        }

        if (traveller) {
          await tx.traveller.update({
            where: { id: traveller.id },
            data: {
              email: data.primaryContact.email,
              phone: data.primaryContact.phone || null,
              dateOfBirth: travellerData.dateOfBirth
                ? new Date(travellerData.dateOfBirth)
                : traveller.dateOfBirth,
              passportNumber: travellerData.passportNumber || traveller.passportNumber,
              passportExpiry: travellerData.passportExpiry
                ? new Date(travellerData.passportExpiry)
                : traveller.passportExpiry,
            },
          });
        } else {
          traveller = await tx.traveller.create({
            data: {
              userId,
              firstName: travellerData.firstName.trim(),
              lastName: travellerData.lastName.trim(),
              email: data.primaryContact.email,
              phone: data.primaryContact.phone || null,
              dateOfBirth: travellerData.dateOfBirth
                ? new Date(travellerData.dateOfBirth)
                : null,
              passportNumber: travellerData.passportNumber || null,
              passportExpiry: travellerData.passportExpiry
                ? new Date(travellerData.passportExpiry)
                : null,
            },
          });
        }

        await tx.bookingTraveller.create({
          data: {
            bookingId: bookingRecord.id,
            travellerId: traveller.id,
            firstName: travellerData.firstName.trim(),
            lastName: travellerData.lastName.trim(),
            dateOfBirth: travellerData.dateOfBirth
              ? new Date(travellerData.dateOfBirth)
              : null,
            gender: travellerData.gender || null,
            nationality: travellerData.nationality || null,
            passportNumber: travellerData.passportNumber || null,
            passportExpiry: travellerData.passportExpiry
              ? new Date(travellerData.passportExpiry)
              : null,
            passportIssuingCountry: travellerData.passportIssuingCountry || null,
            passportFileKey: travellerData.passportFileKey || null,
            isPassportRequired: requiresPassport,
          },
        });
      }

      return bookingRecord;
    });

    // Send notifications
    try {
      const { notify } = await import("@/lib/notifications");
      const { sendEmail } = await import("@/lib/email");

      // Notify customer
      if (isCustomisedPackage) {
        await notify({
          userId,
          type: "TOUR_BOOKING_CREATED",
          title: "Custom Package Request Received",
          message: `Your custom package request for ${data.tourName || tourRecord.name} has been received. Our team will review and get back to you soon.`,
          link: `/dashboard/bookings/${booking.id}`,
        });

        // Send email to customer
        await sendEmail({
          to: data.primaryContact.email,
          subject: `Custom Package Request Received - ${data.tourName || tourRecord.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>Custom Package Request Received</h1>
              <p>Thank you for your custom package request for <strong>${data.tourName || tourRecord.name}</strong>.</p>
              <p>Our team will review your request and get back to you with a personalized quote within 24-48 hours.</p>
              <p><a href="${process.env.NEXTAUTH_URL}/dashboard/bookings/${booking.id}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Request</a></p>
              <p>Best regards,<br>The Travunited Team</p>
            </div>
          `,
        });

        // Notify admins about custom package request
        await sendEmail({
          to: "info@travunited.com",
          subject: `New Custom Package Request - ${data.tourName || tourRecord.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>New Custom Package Request</h1>
              <p>A new custom package request has been received:</p>
              <ul>
                <li><strong>Tour:</strong> ${data.tourName || tourRecord.name}</li>
                <li><strong>Customer:</strong> ${data.primaryContact.name} (${data.primaryContact.email})</li>
                <li><strong>Travel Date:</strong> ${new Date(data.travelDate).toLocaleDateString()}</li>
                <li><strong>Booking ID:</strong> ${booking.id}</li>
              </ul>
              <p><strong>Custom Request:</strong></p>
              <p style="background: #f5f5f5; padding: 15px; border-radius: 4px;">${data.customisedPackage?.customRequestNotes || "N/A"}</p>
              <p><a href="${process.env.NEXTAUTH_URL}/admin/bookings/${booking.id}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Review Request</a></p>
            </div>
          `,
        });
      } else {
        // Regular booking - notify admins
        await sendEmail({
          to: "info@travunited.com",
          subject: `New Tour Booking - ${data.tourName || tourRecord.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1>New Tour Booking</h1>
              <p>A new tour booking has been created:</p>
              <ul>
                <li><strong>Tour:</strong> ${data.tourName || tourRecord.name}</li>
                <li><strong>Customer:</strong> ${data.primaryContact.name} (${data.primaryContact.email})</li>
                <li><strong>Travel Date:</strong> ${new Date(data.travelDate).toLocaleDateString()}</li>
                <li><strong>Total Amount:</strong> ₹${finalTotalAmount.toLocaleString()}</li>
                <li><strong>Booking ID:</strong> ${booking.id}</li>
              </ul>
              <p><a href="${process.env.NEXTAUTH_URL}/admin/bookings/${booking.id}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Booking</a></p>
            </div>
          `,
        });
      }
    } catch (notifyError) {
      console.error("Error sending notifications:", notifyError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      bookingId: booking.id,
      totalAmount: finalTotalAmount,
      status: initialStatus,
      message: isCustomisedPackage 
        ? "Custom package request submitted successfully. Our team will review and get back to you soon."
        : "Booking created successfully",
    });
  } catch (error: unknown) {
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode = error && typeof error === "object" && "code" in error ? error.code : undefined;
    const errorMeta = error && typeof error === "object" && "meta" in error ? error.meta : undefined;

    console.error("Error creating booking:", {
      message: errorMessage,
      stack: errorStack,
      code: errorCode,
      meta: errorMeta,
    });

    // Return user-friendly error message
    return NextResponse.json(
      {
        error: errorMessage || "Failed to create booking. Please try again.",
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

