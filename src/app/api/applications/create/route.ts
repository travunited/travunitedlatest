import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendVisaStatusUpdateEmail, sendEmail } from "@/lib/email";
import { getVisaAdminEmail, getAdminUserIds } from "@/lib/admin-contacts";
import { notify, notifyMultiple } from "@/lib/notifications";
export const dynamic = "force-dynamic";



// Phone number validation function
const validatePhoneNumber = (phone: string): { valid: boolean; message?: string } => {
  if (!phone || phone.trim() === "") {
    return { valid: true }; // Phone is optional
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, "");
  
  // Check if it's a valid Indian mobile number (10 digits)
  if (digitsOnly.length === 10) {
    // Check if it starts with 6-9 (valid Indian mobile prefixes)
    if (/^[6-9]/.test(digitsOnly)) {
      return { valid: true };
    }
    return { valid: false, message: "Phone number must start with 6, 7, 8, or 9" };
  }
  
  // Check if it's E.164 format (international)
  if (phone.startsWith("+")) {
    const e164Pattern = /^\+[1-9]\d{1,14}$/;
    if (e164Pattern.test(phone)) {
      return { valid: true };
    }
    return { valid: false, message: "Invalid international phone format. Use E.164 format (e.g., +911234567890)" };
  }
  
  // If it has digits but wrong length
  if (digitsOnly.length > 0 && digitsOnly.length < 10) {
    return { valid: false, message: "Phone number must be 10 digits" };
  }
  
  if (digitsOnly.length > 10 && !phone.startsWith("+")) {
    return { valid: false, message: "Phone number must be 10 digits or use international format (+country code)" };
  }
  
  return { valid: false, message: "Invalid phone number format" };
};

const applicationSchema = z.object({
  country: z.string(),
  visaType: z.string(),
  visaId: z.string().optional(),
  selectedSubTypeId: z.string().optional(),
  totalAmount: z.number().int().nonnegative().optional(),
  travelDate: z.string().optional(),
  tripType: z.string().optional(),
  promoCodeId: z.string().optional(),
  discountAmount: z.number().int().nonnegative().optional(),
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

    // Validate phone number
    if (data.primaryContact.phone) {
      const phoneValidation = validatePhoneNumber(data.primaryContact.phone);
      if (!phoneValidation.valid) {
        return NextResponse.json(
          {
            error: "Phone number validation failed",
            details: [
              {
                field: "primaryContact.phone",
                message: phoneValidation.message || "Invalid phone number format",
              },
            ],
          },
          { status: 400 }
        );
      }
    }

    // Get user - must be logged in to create application
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please login or signup to continue" },
        { status: 401 }
      );
    }

    // Check if email is verified (required for application submission)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    });

    if (!user?.emailVerified) {
      return NextResponse.json(
        { 
          error: "Email verification required",
          message: "Please verify your email before submitting the application. You can continue filling the form, but verification is required for submission." 
        },
        { status: 403 }
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

    // Validate traveller dates and passport
    for (let i = 0; i < data.travellers.length; i++) {
      const traveller = data.travellers[i];

      // Validate passport number length
      if (traveller.passportNumber && traveller.passportNumber.length > 20) {
        dateErrors.push(`Traveller ${i + 1}: Passport number must be 20 characters or less`);
      }

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

    // Create application with PAYMENT_PENDING status (documents will be uploaded after payment)
    const application = await prisma.application.create({
      data: {
        userId,
        visaId: linkedVisa?.id ?? null,
        visaTypeId: linkedVisa?.slug ?? `${data.country}-${data.visaType}`,
        country: linkedVisa?.countryCode ?? data.country,
        visaType: linkedVisa?.name ?? data.visaType,
        visaSubTypeId: data.selectedSubTypeId || null,
        status: "PAYMENT_PENDING", // Changed from DRAFT - payment comes before documents
        totalAmount: data.totalAmount ?? 0,
        currency: "INR",
        promoCodeId: data.promoCodeId || null,
        discountAmount: data.discountAmount || 0,
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

    // Send email notifications (non-blocking)
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, role: true },
      });

      if (user) {
        // Send email to user
        await sendVisaStatusUpdateEmail(
          user.email,
          application.id,
          application.country || "",
          application.visaType || "",
          "PAYMENT_PENDING",
          user.role || "CUSTOMER"
        );

        // Send in-app notification to user
        await notify({
          userId,
          type: "VISA_APPLICATION_SUBMITTED",
          title: "Visa Application Created",
          message: `Your ${application.country || ""} ${application.visaType || ""} application has been created. Please proceed to payment.`,
          link: `/dashboard/applications/${application.id}`,
          data: {
            applicationId: application.id,
            country: application.country,
            visaType: application.visaType,
          },
        });

        // Send email to admin with application details
        const visaAdminEmail = getVisaAdminEmail();
        const travellersList = data.travellers.map((t, idx) => 
          `${idx + 1}. ${t.firstName} ${t.lastName} (DOB: ${t.dateOfBirth}, Passport: ${t.passportNumber || "N/A"})`
        ).join("<br>");

        try {
          await sendEmail({
            to: visaAdminEmail,
            subject: `New Visa Application - ${application.country || ""} ${application.visaType || ""}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1>New Visa Application Received</h1>
                <p>A new visa application has been created:</p>
                <ul>
                  <li><strong>Application ID:</strong> ${application.id}</li>
                  <li><strong>Country:</strong> ${application.country || "N/A"}</li>
                  <li><strong>Visa Type:</strong> ${application.visaType || "N/A"}</li>
                  <li><strong>Customer:</strong> ${data.primaryContact.name} (${data.primaryContact.email})</li>
                  <li><strong>Phone:</strong> ${data.primaryContact.phone || "N/A"}</li>
                  <li><strong>Travel Date:</strong> ${data.travelDate ? new Date(data.travelDate).toLocaleDateString() : "Not specified"}</li>
                  <li><strong>Total Amount:</strong> ₹${(data.totalAmount || 0).toLocaleString()}</li>
                  <li><strong>Number of Travellers:</strong> ${data.travellers.length}</li>
                </ul>
                <h3>Travellers:</h3>
                <p>${travellersList}</p>
                <p><strong>Note:</strong> Payment is required before document upload. After successful payment, the customer will be prompted to upload required documents.</p>
                <p><a href="${process.env.NEXTAUTH_URL || "https://travunited.com"}/admin/applications/${application.id}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Application</a></p>
                <p>Best regards,<br>Travunited System</p>
              </div>
            `,
            category: "visa",
          });
        } catch (adminEmailError) {
          console.error("Error sending admin notification email for new application:", adminEmailError);
          // Continue even if admin email fails
        }

        // Notify admins in-app (email already sent above)
        const adminIds = await getAdminUserIds();
        if (adminIds.length > 0) {
          await notifyMultiple(adminIds, {
            type: "ADMIN_APPLICATION_ASSIGNED", // Using this type as it's the closest match for new applications
            title: "New Visa Application",
            message: `New visa application for ${application.country || ""} ${application.visaType || ""} from ${data.primaryContact.name}`,
            link: `/admin/applications/${application.id}`,
            data: {
              applicationId: application.id,
              country: application.country,
              visaType: application.visaType,
            },
            sendEmail: false, // Email already sent above
            roleScope: "STAFF_ADMIN",
          });
        }
      }
    } catch (emailError) {
      console.error("Error sending application creation emails:", emailError);
      // Don't fail the request if emails fail
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
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code?: string; meta?: any; message?: string };
      
      // Handle missing table/column errors
      if (prismaError.code === "P2021" || prismaError.code === "P2019") {
        console.error("Database schema error:", prismaError);
        return NextResponse.json(
          { 
            error: "Database schema error",
            message: prismaError.message || "A required database table or column is missing. Please run migrations.",
            code: prismaError.code
          },
          { status: 500 }
        );
      }
      
      // Handle foreign key constraint errors
      if (prismaError.code === "P2003") {
        return NextResponse.json(
          { 
            error: "Invalid reference",
            message: prismaError.message || "The selected visa or related entity does not exist."
          },
          { status: 400 }
        );
      }
    }
    
    // Generic error response with more details in development
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: process.env.NODE_ENV === 'development' && error instanceof Error 
          ? error.message 
          : "An unexpected error occurred while creating the application. Please try again.",
        ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
      },
      { status: 500 }
    );
  }
}

