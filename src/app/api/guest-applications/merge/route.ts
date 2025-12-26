import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";
export const dynamic = "force-dynamic";

// Merge guest application with user account after login/signup
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    const guestId = cookieStore.get("guest_id")?.value;

    if (!guestId) {
      return NextResponse.json({
        message: "No guest application to merge",
        merged: false,
      });
    }

    // Find guest applications for this guest session
    const guestApplications = await prisma.guestApplication.findMany({
      where: {
        guestId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (guestApplications.length === 0) {
      return NextResponse.json({
        message: "No guest applications found",
        merged: false,
      });
    }

    const mergedApplications = [];

    for (const guestApp of guestApplications) {
      // Check if user already has an application for this visa
      const existingApp = await prisma.application.findFirst({
        where: {
          userId: session.user.id,
          country: guestApp.country,
          visaType: guestApp.visaType,
          status: {
            in: ["DRAFT", "PAYMENT_PENDING"],
          },
        },
      });

      if (existingApp) {
        // Update existing application with guest data if guest data is more recent
        if (guestApp.updatedAt > existingApp.updatedAt) {
          await prisma.application.update({
            where: { id: existingApp.id },
            data: {
              visaId: guestApp.visaId || existingApp.visaId,
              visaSubTypeId: guestApp.selectedSubTypeId || existingApp.visaSubTypeId,
              // Note: We don't merge formData directly as it's complex
              // The frontend should handle restoring from guest data
            },
          });
          mergedApplications.push(existingApp.id);
        }
      } else {
        // Create new application from guest data
        const newApplication = await prisma.application.create({
          data: {
            id: crypto.randomUUID(),
            updatedAt: new Date(),
            userId: session.user.id,
            visaId: guestApp.visaId || null,
            visaTypeId: guestApp.visaType,
            country: guestApp.country,
            visaType: guestApp.visaType,
            visaSubTypeId: guestApp.selectedSubTypeId || null,
            status: "DRAFT",
            totalAmount: 0,
            currency: "INR",
          },
        });
        mergedApplications.push(newApplication.id);
      }

      // Delete guest application after merge
      await prisma.guestApplication.delete({
        where: { id: guestApp.id },
      });
    }

    // Clear guest cookie
    cookieStore.delete("guest_id");

    return NextResponse.json({
      message: "Guest applications merged successfully",
      merged: true,
      applicationIds: mergedApplications,
      lastStepCompleted: guestApplications[0]?.stepCompleted || 1,
      formData: guestApplications[0]?.formData || {},
    });
  } catch (error) {
    console.error("Error merging guest application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




