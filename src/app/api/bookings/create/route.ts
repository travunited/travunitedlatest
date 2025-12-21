import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  calculateAge,
  getTravellerType,
  calculateChildPrice,
  isDomesticDestination,
  getRequiredDocuments,
  validatePassportExpiry,
} from "@/lib/booking-helpers";
import { getTourAdminEmail, getSupportAdminEmail } from "@/lib/admin-contacts";
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
  panNumber: z.string().nullable().optional(), // PAN for Indian travellers
  aadharFileKey: z.string().nullable().optional(), // Aadhaar file for Indian travellers
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
  promoCodeId: z.string().optional(),
  discountAmount: z.number().int().nonnegative().optional(),
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
        { error: "TERMS_NOT_ACCEPTED", message: "Please accept Terms & Conditions and Refund & Cancellation Policy before continuing." },
        { status: 400 }
      );
    }

    // Validate policy versions - check both Terms & Conditions and Refund & Cancellation
    // Handle gracefully if SitePolicy table doesn't exist yet
    let refundPolicy = null;
    let termsPolicy = null;
    
    try {
      [refundPolicy, termsPolicy] = await Promise.all([
        prisma.sitePolicy.findUnique({ where: { key: "refund_cancellation" } }),
        prisma.sitePolicy.findUnique({ where: { key: "terms_conditions" } }),
      ]);
    } catch (error: any) {
      // If table doesn't exist, log warning but allow payment to proceed
      console.warn("SitePolicy table not found, skipping policy version validation:", error.message);
      // Continue without policy validation
    }

    // If refund policy exists, validate version
    if (refundPolicy) {
      if (!data.policyVersion || data.policyVersion !== refundPolicy.version) {
        return NextResponse.json(
          {
            error: "POLICY_VERSION_MISMATCH",
            message: "Policy has changed. Please review and accept the latest policy version.",
            policyVersion: refundPolicy.version,
          },
          { status: 400 }
        );
      }
    }

    // If terms policy exists and has a different version, also validate it
    // For now, we'll use the refund policy version as the primary version
    // In the future, you might want to track both versions separately

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

    // Calculate pricing with child discounts
    const baseUnitPrice = tourRecord.basePriceInInr ?? tourRecord.price ?? 0;
    const childAgeLimit = tourRecord.childAgeLimit ?? 12;
    const childPricingType = tourRecord.childPricingType;
    const childPricingValue = tourRecord.childPricingValue;

    // Classify travellers and calculate pricing
    let adultCount = 0;
    let childCount = 0;
    const travellerClassifications: Array<{ index: number; type: "adult" | "child" | "infant"; age: number }> = [];

    data.travellers.forEach((traveller, index) => {
      let age: number;
      if (traveller.dateOfBirth) {
        age = calculateAge(traveller.dateOfBirth);
      } else if (traveller.age) {
        // Use parseFloat to handle fractional ages for infants (e.g., 0.5 for 6 months)
        age = parseFloat(traveller.age) || 0;
      } else {
        age = 18; // Default to adult if no age/DOB provided
      }

      const travellerType = getTravellerType(age, childAgeLimit);
      travellerClassifications.push({ index, type: travellerType, age });

      if (travellerType === "adult") {
        adultCount++;
      } else if (travellerType === "child") {
        childCount++;
      }
    });

    // Calculate base amount with child pricing
    const adultPrice = baseUnitPrice;
    const childPrice = calculateChildPrice(baseUnitPrice, childPricingType, childPricingValue);
    let baseAmount = (adultPrice * adultCount) + (childPrice * childCount);

    const totalTravellers = data.travellers.length;

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

    // Determine if destination is domestic
    const isDomestic = isDomesticDestination(
      tourRecord.destinationCountry || null,
      "IN" // Company country - adjust if needed
    );

    // Get required documents
    const requiredDocs = getRequiredDocuments(
      tourRecord.requiredDocuments,
      isDomestic
    );

    const travellerValidationErrors: Array<{ field: string; message: string; code?: string }> = [];

    data.travellers.forEach((traveller, index) => {
      const classification = travellerClassifications[index];
      const travellerType = classification?.type || "adult";
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
            message: `Traveller ${index + 1}: Date of birth cannot be today or in the future.`,
          });
        }
      }

      // Check nationality for document requirements
      const isIndian = (traveller.nationality || "").toLowerCase().trim() === "india" || 
                       (traveller.nationality || "").toLowerCase().trim() === "indian";
      
      // Indian travellers: require PAN + Aadhaar (unless tour requires passport)
      if (isIndian) {
        if (requiresPassport) {
          // Tour requires passport even for Indians (e.g., international tour)
          const passportNumberMissing = !traveller.passportNumber;
          const passportExpiryMissing = !traveller.passportExpiry;
          const passportCountryMissing = !traveller.passportIssuingCountry;

          if (passportNumberMissing) {
            travellerValidationErrors.push({
              field: `travellers[${index}].passportNumber`,
              message: `Traveller ${index + 1}: Passport number is required for this tour.`,
            });
          } else if (traveller.passportNumber && traveller.passportNumber.length > 20) {
            travellerValidationErrors.push({
              field: `travellers[${index}].passportNumber`,
              message: `Traveller ${index + 1}: Passport number must be 20 characters or less.`,
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
            const validation = validatePassportExpiry(
              traveller.passportExpiry,
              travelDate,
              6 // 6 months minimum validity
            );
            if (!validation.valid) {
              travellerValidationErrors.push({
                field: `travellers[${index}].passportExpiry`,
                message: `Traveller ${index + 1}: ${validation.error}`,
              });
            }
          }

          if (!traveller.passportFileKey) {
            travellerValidationErrors.push({
              field: `travellers[${index}].passportFileKey`,
              message: `Traveller ${index + 1}: Passport copy upload is required.`,
            });
          }
        } else {
          // Domestic tour for Indian: require PAN + Aadhaar
          if (!traveller.panNumber || traveller.panNumber.trim().length === 0) {
            travellerValidationErrors.push({
              field: `travellers[${index}].panNumber`,
              message: `Traveller ${index + 1}: PAN number is required for Indian travellers.`,
              code: "PAN_REQUIRED",
            });
          } else {
            // Basic PAN validation (10 alphanumeric characters)
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
            if (!panRegex.test(traveller.panNumber.trim())) {
              travellerValidationErrors.push({
                field: `travellers[${index}].panNumber`,
                message: `Traveller ${index + 1}: Invalid PAN format. PAN must be 10 alphanumeric characters.`,
              });
            }
          }

          if (!traveller.aadharFileKey) {
            travellerValidationErrors.push({
              field: `travellers[${index}].aadharFileKey`,
              message: `Traveller ${index + 1}: Aadhaar document upload is required for Indian travellers.`,
              code: "AADHAAR_REQUIRED",
            });
          }
        }
      } else {
        // Non-Indian travellers: always require passport
        const passportNumberMissing = !traveller.passportNumber;
        const passportExpiryMissing = !traveller.passportExpiry;
        const passportCountryMissing = !traveller.passportIssuingCountry;

        if (passportNumberMissing) {
          travellerValidationErrors.push({
            field: `travellers[${index}].passportNumber`,
            message: `Traveller ${index + 1}: Passport number is required for non-Indian travellers.`,
            code: "PASSPORT_REQUIRED",
          });
        } else if (traveller.passportNumber && traveller.passportNumber.length > 20) {
          travellerValidationErrors.push({
            field: `travellers[${index}].passportNumber`,
            message: `Traveller ${index + 1}: Passport number must be 20 characters or less.`,
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
          const validation = validatePassportExpiry(
            traveller.passportExpiry,
            travelDate,
            6 // 6 months minimum validity
          );
          if (!validation.valid) {
            travellerValidationErrors.push({
              field: `travellers[${index}].passportExpiry`,
              message: `Traveller ${index + 1}: ${validation.error}`,
              code: "PASSPORT_EXPIRY_TOO_SOON",
            });
          }
        }

        if (!traveller.passportFileKey) {
          travellerValidationErrors.push({
            field: `travellers[${index}].passportFileKey`,
            message: `Traveller ${index + 1}: Passport copy upload is required.`,
            code: "PASSPORT_COPY_REQUIRED",
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
          promoCodeId: data.promoCodeId || null,
          discountAmount: data.discountAmount || 0,
          // documents field is optional (Json?) and will be null by default
          // If the column doesn't exist, the migration needs to be run
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

        // Calculate age and traveller type
        let age: number | null = null;
        let travellerType: "adult" | "child" | "infant" | null = null;

        if (travellerData.dateOfBirth) {
          age = calculateAge(travellerData.dateOfBirth);
          travellerType = getTravellerType(age, tourRecord.childAgeLimit ?? 12);
        } else if (travellerData.age) {
          // Use parseFloat to handle fractional ages for infants (e.g., 0.5 for 6 months)
          age = parseFloat(travellerData.age) || null;
          if (age !== null) {
            travellerType = getTravellerType(age, tourRecord.childAgeLimit ?? 12);
          }
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
            age: age,
            travellerType: travellerType,
            gender: travellerData.gender || null,
            nationality: travellerData.nationality || null,
            passportNumber: travellerData.passportNumber || null,
            passportExpiry: travellerData.passportExpiry
              ? new Date(travellerData.passportExpiry)
              : null,
            passportIssuingCountry: travellerData.passportIssuingCountry || null,
            passportFileKey: travellerData.passportFileKey || null,
            panNumber: travellerData.panNumber ? travellerData.panNumber.trim().toUpperCase() : null,
            aadharFileKey: travellerData.aadharFileKey || null,
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
      const tourAdminEmail = getTourAdminEmail();
      const supportEmail = getSupportAdminEmail();

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
        try {
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
        } catch (emailError) {
          console.error("Error sending custom package confirmation email:", emailError);
          // Don't fail the request if email fails
        }

        // Notify admins about custom package request
        if (!tourAdminEmail) {
          console.warn("Tour admin email not configured; skipping custom package admin notification.");
        } else {
          try {
            await sendEmail({
              to: tourAdminEmail,
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
              category: "tours",
            });
          } catch (emailError) {
            console.error("Error sending custom package admin notification email:", emailError);
            // Don't fail the request if email fails
          }
        }
      } else {
        // Regular booking - send email to user
        const paymentMessage = initialStatus === "DRAFT" ? "Please complete payment to secure your booking." : "";
        await notify({
          userId,
          type: "TOUR_BOOKING_CREATED",
          title: "Tour Booking Confirmed",
          message: `Your booking for ${data.tourName || tourRecord.name} has been confirmed. ${paymentMessage}`,
          link: `/dashboard/bookings/${booking.id}`,
        });

        // Send email to customer
        try {
          const { sendTourConfirmedEmail } = await import("@/lib/email");
          const userRole = (session.user.role as "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN") || "CUSTOMER";
          await sendTourConfirmedEmail(
            data.primaryContact.email,
            booking.id,
            data.tourName || tourRecord.name,
            userRole
          );
        } catch (emailError) {
          console.error("Error sending tour confirmation email:", emailError);
          // Don't fail the request if email fails
        }

        // Regular booking - notify admins with document information
        if (!tourAdminEmail) {
          console.warn("Tour admin email not configured; skipping tour booking admin notification.");
        } else {
          try {
            // Get document information
            const documentsInfo = data.travellers.map((t, idx) => {
              const docs = [];
              if (t.passportFileKey) docs.push(`Passport: Uploaded`);
              if (t.aadharFileKey) docs.push(`Aadhaar: Uploaded`);
              return `${idx + 1}. ${t.firstName} ${t.lastName}${docs.length > 0 ? ` - Documents: ${docs.join(", ")}` : " - No documents uploaded yet"}`;
            }).join("<br>");

            const travellersList = data.travellers.map((t, idx) => 
              `${idx + 1}. ${t.firstName} ${t.lastName} (Age: ${t.age || "N/A"}, Gender: ${t.gender || "N/A"}, Passport: ${t.passportNumber || "N/A"})`
            ).join("<br>");

            await sendEmail({
              to: tourAdminEmail,
              subject: `New Tour Booking - ${data.tourName || tourRecord.name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1>New Tour Booking</h1>
                  <p>A new tour booking has been created:</p>
                  <ul>
                    <li><strong>Tour:</strong> ${data.tourName || tourRecord.name}</li>
                    <li><strong>Customer:</strong> ${data.primaryContact.name} (${data.primaryContact.email})</li>
                    <li><strong>Phone:</strong> ${data.primaryContact.phone || "N/A"}</li>
                    <li><strong>Travel Date:</strong> ${new Date(data.travelDate).toLocaleDateString()}</li>
                    <li><strong>Total Amount:</strong> ₹${finalTotalAmount.toLocaleString()}</li>
                    <li><strong>Payment Type:</strong> ${data.paymentType === "full" ? "Full Payment" : `Advance Payment (${data.advancePercentage || 0}%)`}</li>
                    <li><strong>Booking ID:</strong> ${booking.id}</li>
                    <li><strong>Status:</strong> ${initialStatus}</li>
                    <li><strong>Number of Travellers:</strong> ${data.travellers.length} (${adultCount} adults, ${childCount} children)</li>
                  </ul>
                  <h3>Travellers:</h3>
                  <p>${travellersList}</p>
                  <h3>Documents:</h3>
                  <p>${documentsInfo || "No documents uploaded yet"}</p>
                  ${data.preferences?.specialRequests ? `<p><strong>Special Requests:</strong> ${data.preferences.specialRequests}</p>` : ""}
                  ${data.preferences?.foodPreference ? `<p><strong>Food Preference:</strong> ${data.preferences.foodPreference}</p>` : ""}
                  <p><a href="${process.env.NEXTAUTH_URL || "https://travunited.com"}/admin/bookings/${booking.id}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Booking</a></p>
                  <p>Best regards,<br>Travunited System</p>
                </div>
              `,
              category: "tours",
            });
          } catch (emailError) {
            console.error("Error sending tour booking admin notification email:", emailError);
            // Don't fail the request if email fails
          }
        }
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

