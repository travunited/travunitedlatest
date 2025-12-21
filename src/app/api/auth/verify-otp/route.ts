import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
export const dynamic = "force-dynamic";

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = verifyOtpSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Check if OTP exists and matches
    if (!user.registrationOtp || user.registrationOtp !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }

    // Check if OTP has expired
    if (!user.registrationOtpExpires || user.registrationOtpExpires < new Date()) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify email and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        registrationOtp: null,
        registrationOtpExpires: null,
      },
    });

    // Send welcome email after verification
    try {
      const { sendWelcomeEmail } = await import("@/lib/email");
      await sendWelcomeEmail(user.email, user.name || undefined, user.role);
    } catch (error) {
      // Non-blocking - don't fail verification if welcome email fails
      console.error("Failed to send welcome email:", error);
    }

    // Merge guest application if exists (non-blocking)
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const guestId = cookieStore.get("guest_id")?.value;
      
      if (guestId) {
        // Import merge logic
        const { prisma } = await import("@/lib/prisma");
        const guestApplications = await prisma.guestApplication.findMany({
          where: {
            guestId,
            expiresAt: {
              gt: new Date(),
            },
          },
        });

        for (const guestApp of guestApplications) {
          // Check if user already has an application for this visa
          const existingApp = await prisma.application.findFirst({
            where: {
              userId: user.id,
              country: guestApp.country,
              visaType: guestApp.visaType,
              status: {
                in: ["DRAFT", "PAYMENT_PENDING"],
              },
            },
          });

          if (!existingApp) {
            // Create new application from guest data
            await prisma.application.create({
              data: {
                userId: user.id,
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
          }

          // Delete guest application after merge
          await prisma.guestApplication.delete({
            where: { id: guestApp.id },
          });
        }

        // Clear guest cookie
        cookieStore.delete("guest_id");
      }
    } catch (error) {
      // Non-blocking - don't fail verification if merge fails
      console.error("Error merging guest application during verification:", error);
    }

    return NextResponse.json(
      { message: "Email verified successfully", verified: true },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
