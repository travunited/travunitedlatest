import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const verifyOTPSchema = z.object({
  resetId: z.string().min(1, "Reset ID is required"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export async function POST(req: Request) {
  try {
    // Ensure we're receiving JSON
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("Failed to parse JSON body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      );
    }

    const { resetId, otp } = verifyOTPSchema.parse(body);

    // Find password reset record
    const passwordReset = await prisma.passwordReset.findUnique({
      where: { id: resetId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!passwordReset) {
      console.error("[OTP Verification] Record not found", { resetId });
      return NextResponse.json(
        { error: "Invalid reset request" },
        { status: 400 }
      );
    }

    // Check if already used
    if (passwordReset.used) {
      console.error("[OTP Verification] Reset already used", {
        resetId,
        userId: passwordReset.userId,
      });
      return NextResponse.json(
        { error: "This reset request has already been used. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if OTP exists
    if (!passwordReset.otp) {
      console.error("[OTP Verification] No OTP found", { resetId });
      return NextResponse.json(
        { error: "Invalid reset request" },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (!passwordReset.otpExpiresAt || new Date() > passwordReset.otpExpiresAt) {
      console.error("[OTP Verification] OTP expired", {
        resetId,
        otpExpiresAt: passwordReset.otpExpiresAt,
      });
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify OTP (case-sensitive exact match)
    if (passwordReset.otp !== otp) {
      console.error("[OTP Verification] Invalid OTP", {
        resetId,
        providedOtp: otp,
        expectedOtp: passwordReset.otp,
      });
      return NextResponse.json(
        { error: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    // OTP is valid - return success with resetId for password reset
    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      resetId: passwordReset.id,
      userId: passwordReset.userId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

