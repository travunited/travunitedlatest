import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
export const dynamic = "force-dynamic";

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }

    let validatedData;
    try {
      validatedData = signupSchema.parse(body);
    } catch (validationError) {
      return NextResponse.json({ error: "Invalid input", details: validationError }, { status: 400 });
    }

    const { name, email, password } = validatedData;

    const normalizedName = name.trim();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const crypto = await import("crypto");
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10);

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: "CUSTOMER",
        emailVerified: false,
        registrationOtp: otp,
        registrationOtpExpires: otpExpires,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    try {
      const { sendRegistrationOTPEmail } = await import("@/lib/email");
      await sendRegistrationOTPEmail(user.email!, otp, user.name || undefined, user.role);
    } catch (error) {
      console.error("[Signup] Failed to send OTP email:", error);
    }

    return NextResponse.json(
      {
        message: "User created successfully. Please verify your email with the OTP sent.",
        user,
        requiresVerification: true
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Signup] ❌ Unexpected error:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        devError: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
