import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
export const dynamic = "force-dynamic";

// Schema for draft data - more lenient than full application
const draftSchema = z.object({
  country: z.string().optional(),
  visaType: z.string().optional(),
  visaId: z.string().optional(),
  travelDate: z.string().optional(),
  tripType: z.string().optional(),
  primaryContact: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  travellers: z.array(
    z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.string().optional(),
      passportNumber: z.string().optional(),
      passportIssueDate: z.string().optional(),
      passportExpiryDate: z.string().optional(),
      nationality: z.string().optional(),
      currentCity: z.string().optional(),
    })
  ).optional(),
  draftId: z.string().optional(), // If updating existing draft
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = draftSchema.parse(body);

    // Get session - draft can be saved even without login, but we'll create/find user
    const session = await getServerSession(authOptions);

    let userId: string;

    if (session?.user?.id) {
      // User is logged in
      userId = session.user.id;
    } else if (data.primaryContact?.email) {
      // User is not logged in but provided email - find or create user
      let user = await prisma.user.findUnique({
        where: { email: data.primaryContact.email },
      });

      if (!user) {
        // Create a guest user account (they'll need to set password later)
        // Generate a random password hash (user will need to reset password to access)
        const bcrypt = await import("bcryptjs");
        const randomPassword = Math.random().toString(36).slice(-12);
        const passwordHash = await bcrypt.default.hash(randomPassword, 10);

        user = await prisma.user.create({
          data: {
            id: crypto.randomUUID(),
            updatedAt: new Date(),
            email: data.primaryContact.email,
            name: data.primaryContact.name || null,
            phone: data.primaryContact.phone || null,
            passwordHash,
            role: "CUSTOMER",
            emailVerified: false,
          },
        });
      }
      userId = user.id;
    } else {
      // No email provided and not logged in - can't save draft
      return NextResponse.json(
        { error: "Email is required to save draft" },
        { status: 400 }
      );
    }

    // If draftId is provided, update existing draft
    if (data.draftId) {
      const existingDraft = await prisma.application.findUnique({
        where: { id: data.draftId },
      });

      if (existingDraft && existingDraft.userId === userId && existingDraft.status === "DRAFT") {
        // Update existing draft
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (data.country) updateData.country = data.country;
        if (data.visaType) updateData.visaType = data.visaType;
        if (data.visaId) updateData.visaId = data.visaId;

        const updated = await prisma.application.update({
          where: { id: data.draftId },
          data: updateData,
        });

        // Update user info if provided
        if (data.primaryContact) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              name: data.primaryContact.name || undefined,
              phone: data.primaryContact.phone || undefined,
            },
          });
        }

        // Update travellers if provided
        if (data.travellers && data.travellers.length > 0) {
          // Delete existing travellers for this draft
          await prisma.applicationTraveller.deleteMany({
            where: { applicationId: data.draftId },
          });

          // Create new travellers
          for (const travellerData of data.travellers) {
            if (travellerData.firstName && travellerData.lastName) {
              // Find or create traveller
              let traveller = await prisma.traveller.findFirst({
                where: {
                  userId,
                  firstName: travellerData.firstName,
                  lastName: travellerData.lastName,
                  passportNumber: travellerData.passportNumber || undefined,
                },
              });

              if (!traveller) {
                traveller = await prisma.traveller.create({
                  data: {
                    id: crypto.randomUUID(),
                    updatedAt: new Date(),
                    userId,
                    firstName: travellerData.firstName,
                    lastName: travellerData.lastName,
                    dateOfBirth: travellerData.dateOfBirth ? new Date(travellerData.dateOfBirth) : null,
                    passportNumber: travellerData.passportNumber || null,
                    passportExpiry: travellerData.passportExpiryDate ? new Date(travellerData.passportExpiryDate) : null,
                    email: data.primaryContact?.email || null,
                    phone: data.primaryContact?.phone || null,
                  },
                });
              }

              // Link traveller to application
              await prisma.applicationTraveller.create({
                data: {
                  id: crypto.randomUUID(),
                  applicationId: data.draftId,
                  travellerId: traveller.id,
                },
              });
            }
          }
        }

        return NextResponse.json({
          success: true,
          draftId: updated.id,
          message: "Draft updated",
        });
      }
    }

    // Create new draft application
    if (!data.country || !data.visaType) {
      return NextResponse.json(
        { error: "Country and visa type are required" },
        { status: 400 }
      );
    }

    // Get visa type ID if visaId not provided
    let visaId = data.visaId;
    if (!visaId && data.country && data.visaType) {
      const visa = await prisma.visa.findFirst({
        where: {
          slug: data.visaType,
          Country: {
            code: data.country.toUpperCase(),
          },
        },
      });
      visaId = visa?.id;
    }

    const draft = await prisma.application.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        userId,
        visaTypeId: visaId || "",
        country: data.country,
        visaType: data.visaType,
        visaId: visaId || null,
        status: "DRAFT",
        totalAmount: 0,
        currency: "INR",
      },
    });

    // Update user info if provided
    if (data.primaryContact) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.primaryContact.name || undefined,
          phone: data.primaryContact.phone || undefined,
        },
      });
    }

    // Create travellers if provided
    if (data.travellers && data.travellers.length > 0) {
      for (const travellerData of data.travellers) {
        if (travellerData.firstName && travellerData.lastName) {
          // Find or create traveller
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
                id: crypto.randomUUID(),
                updatedAt: new Date(),
                userId,
                firstName: travellerData.firstName,
                lastName: travellerData.lastName,
                dateOfBirth: travellerData.dateOfBirth ? new Date(travellerData.dateOfBirth) : null,
                passportNumber: travellerData.passportNumber || null,
                passportExpiry: travellerData.passportExpiryDate ? new Date(travellerData.passportExpiryDate) : null,
                email: data.primaryContact?.email || null,
                phone: data.primaryContact?.phone || null,
              },
            });
          }

          // Link traveller to application
          await prisma.applicationTraveller.create({
            data: {
              id: crypto.randomUUID(),
              applicationId: draft.id,
              travellerId: traveller.id,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      draftId: draft.id,
      message: "Draft saved",
    });
  } catch (error) {
    console.error("Error saving draft:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid draft data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }
}

