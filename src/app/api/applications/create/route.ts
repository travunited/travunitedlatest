import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
export const dynamic = "force-dynamic";



const applicationSchema = z.object({
  country: z.string(),
  visaType: z.string(),
  visaId: z.string().optional(),
  totalAmount: z.number().int().nonnegative().optional(),
  travelDate: z.string().optional(),
  tripType: z.string().optional(),
  primaryContact: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
  travellers: z.array(
    z.object({
      firstName: z.string(),
      lastName: z.string(),
      dateOfBirth: z.string(),
      gender: z.string(),
      passportNumber: z.string(),
      passportIssueDate: z.string(),
      passportExpiryDate: z.string(),
      nationality: z.string(),
      currentCity: z.string().optional(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = applicationSchema.parse(body);

    // Get user - must be logged in to create application
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please login or signup to continue" },
        { status: 401 }
      );
    }

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateErrors: string[] = [];

    // Validate travel date
    if (data.travelDate) {
      const travelDate = new Date(data.travelDate);
      travelDate.setHours(0, 0, 0, 0);
      if (travelDate < today) {
        dateErrors.push("Travel date cannot be in the past");
      }
    }

    // Validate traveller dates
    for (let i = 0; i < data.travellers.length; i++) {
      const traveller = data.travellers[i];

      // Date of Birth - must be in the past
      if (traveller.dateOfBirth) {
        const dob = new Date(traveller.dateOfBirth);
        dob.setHours(0, 0, 0, 0);
        if (dob >= today) {
          dateErrors.push(`Traveller ${i + 1}: Date of birth cannot be today or in the future`);
        }
        // Check if person is at least 1 year old
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (dob > oneYearAgo) {
          dateErrors.push(`Traveller ${i + 1}: Date of birth must be at least 1 year ago`);
        }
      }

      // Passport Issue Date - must be in the past, before expiry
      if (traveller.passportIssueDate) {
        const issueDate = new Date(traveller.passportIssueDate);
        issueDate.setHours(0, 0, 0, 0);
        if (issueDate >= today) {
          dateErrors.push(`Traveller ${i + 1}: Passport issue date cannot be today or in the future`);
        }
        // Must be before expiry date
        if (traveller.passportExpiryDate) {
          const expiryDate = new Date(traveller.passportExpiryDate);
          expiryDate.setHours(0, 0, 0, 0);
          if (issueDate >= expiryDate) {
            dateErrors.push(`Traveller ${i + 1}: Passport issue date must be before expiry date`);
          }
        }
      }

      // Passport Expiry Date - must be in the future
      if (traveller.passportExpiryDate) {
        const expiryDate = new Date(traveller.passportExpiryDate);
        expiryDate.setHours(0, 0, 0, 0);
        if (expiryDate <= today) {
          dateErrors.push(`Traveller ${i + 1}: Passport expiry date must be in the future`);
        }
        // Must be after issue date
        if (traveller.passportIssueDate) {
          const issueDate = new Date(traveller.passportIssueDate);
          issueDate.setHours(0, 0, 0, 0);
          if (expiryDate <= issueDate) {
            dateErrors.push(`Traveller ${i + 1}: Passport expiry date must be after issue date`);
          }
        }
        // Optional: Check if passport is valid for at least 6 months from travel date
        if (data.travelDate) {
          const travelDate = new Date(data.travelDate);
          travelDate.setHours(0, 0, 0, 0);
          const sixMonthsFromTravel = new Date(travelDate);
          sixMonthsFromTravel.setMonth(sixMonthsFromTravel.getMonth() + 6);
          if (expiryDate < sixMonthsFromTravel) {
            dateErrors.push(`Traveller ${i + 1}: Passport must be valid for at least 6 months from travel date`);
          }
        }
      }
    }

    if (dateErrors.length > 0) {
      return NextResponse.json(
        { error: "Date validation failed", details: dateErrors },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    let linkedVisa: { id: string; slug: string; name: string; countryCode: string } | null =
      null;

    if (data.visaId) {
      const visaRecord = await prisma.visa.findUnique({
        where: { id: data.visaId },
        include: { country: true },
      });

      if (!visaRecord) {
        return NextResponse.json({ error: "Invalid visa selection" }, { status: 400 });
      }

      linkedVisa = {
        id: visaRecord.id,
        slug: visaRecord.slug,
        name: visaRecord.name,
        countryCode: visaRecord.country.code,
      };
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        userId,
        visaId: linkedVisa?.id ?? null,
        visaTypeId: linkedVisa?.slug ?? `${data.country}-${data.visaType}`,
        country: linkedVisa?.countryCode ?? data.country,
        visaType: linkedVisa?.name ?? data.visaType,
        status: "DRAFT",
        totalAmount: data.totalAmount ?? 0,
        currency: "INR",
      },
    });

    // Create travellers
    const travellerMappings: { inputIndex: number; travellerId: string }[] = [];

    for (let index = 0; index < data.travellers.length; index += 1) {
      const travellerData = data.travellers[index];
      // Find or create traveller
      let traveller = await prisma.traveller.findFirst({
        where: {
          userId,
          passportNumber: travellerData.passportNumber,
        },
      });

      if (!traveller) {
        traveller = await prisma.traveller.create({
          data: {
            userId,
            firstName: travellerData.firstName,
            lastName: travellerData.lastName,
            dateOfBirth: new Date(travellerData.dateOfBirth),
            passportNumber: travellerData.passportNumber,
            email: data.primaryContact.email,
          },
        });
      }

      // Link traveller to application
      await prisma.applicationTraveller.create({
        data: {
          applicationId: application.id,
          travellerId: traveller.id,
        },
      });

      travellerMappings.push({
        inputIndex: index,
        travellerId: traveller.id,
      });
    }

    return NextResponse.json({
      applicationId: application.id,
      travellers: travellerMappings,
      message: "Application created successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

