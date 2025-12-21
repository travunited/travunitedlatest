import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { cookies } from "next/headers";
export const dynamic = "force-dynamic";

const guestApplicationSchema = z.object({
  country: z.string(),
  visaType: z.string(),
  visaId: z.string().optional(),
  selectedSubTypeId: z.string().optional(),
  travelDate: z.string().optional(),
  tripType: z.string().optional(),
  nationality: z.string().optional(),
  purposeOfTravel: z.string().optional(),
  stepCompleted: z.number().int().min(1).max(7),
  formData: z.record(z.any()), // Store all form data as JSON
});

// Create or update guest application
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = guestApplicationSchema.parse(body);

    // Get or create guest session ID
    const cookieStore = await cookies();
    let guestId = cookieStore.get("guest_id")?.value;

    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      cookieStore.set("guest_id", guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }

    // Check if guest application exists
    const existingGuestApp = await prisma.guestApplication.findFirst({
      where: {
        guestId,
        country: data.country,
        visaType: data.visaType,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    let guestApplication;
    if (existingGuestApp) {
      // Update existing guest application
      guestApplication = await prisma.guestApplication.update({
        where: { id: existingGuestApp.id },
        data: {
          stepCompleted: data.stepCompleted,
          formData: data.formData as any,
          expiresAt,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new guest application
      guestApplication = await prisma.guestApplication.create({
        data: {
          guestId,
          country: data.country,
          visaType: data.visaType,
          visaId: data.visaId || null,
          selectedSubTypeId: data.selectedSubTypeId || null,
          travelDate: data.travelDate ? new Date(data.travelDate) : null,
          tripType: data.tripType || null,
          nationality: data.nationality || null,
          purposeOfTravel: data.purposeOfTravel || null,
          stepCompleted: data.stepCompleted,
          formData: data.formData as any,
          expiresAt,
        },
      });
    }

    return NextResponse.json({
      guestApplicationId: guestApplication.id,
      guestId,
      stepCompleted: guestApplication.stepCompleted,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error saving guest application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get guest application
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const guestId = cookieStore.get("guest_id")?.value;
    const { searchParams } = new URL(req.url);
    const guestApplicationId = searchParams.get("guestApplicationId");
    const country = searchParams.get("country");
    const visaType = searchParams.get("visaType");

    if (!guestId && !guestApplicationId) {
      return NextResponse.json(
        { error: "No guest session found" },
        { status: 404 }
      );
    }

    const where: any = {
      expiresAt: {
        gt: new Date(),
      },
    };

    if (guestApplicationId) {
      where.id = guestApplicationId;
    } else if (guestId) {
      where.guestId = guestId;
      // Filter by country and visaType if provided
      if (country) {
        where.country = country.toLowerCase();
      }
      if (visaType) {
        where.visaType = visaType;
      }
    }

    const guestApplication = await prisma.guestApplication.findFirst({
      where,
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!guestApplication) {
      return NextResponse.json(
        { error: "Guest application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: guestApplication.id,
      guestId: guestApplication.guestId,
      country: guestApplication.country,
      visaType: guestApplication.visaType,
      visaId: guestApplication.visaId,
      selectedSubTypeId: guestApplication.selectedSubTypeId,
      travelDate: guestApplication.travelDate,
      tripType: guestApplication.tripType,
      nationality: guestApplication.nationality,
      purposeOfTravel: guestApplication.purposeOfTravel,
      stepCompleted: guestApplication.stepCompleted,
      formData: guestApplication.formData,
      createdAt: guestApplication.createdAt,
      updatedAt: guestApplication.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching guest application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

