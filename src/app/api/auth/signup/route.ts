import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
export const dynamic = "force-dynamic";

const signupSchema = z.object({
  name: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().min(2).optional()
  ),
  email: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().email().optional()
  ),
  password: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().min(8).optional()
  ),
  phone: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  verifyMethod: z.enum(["email", "mobile"]).optional().default("email"),
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

    const { name, email, password, phone, verifyMethod } = validatedData;
    const normalizedName = name && name.trim() ? name.trim() : "User";
    let normalizedPhone = phone ? phone.replace(/\D/g, "") : undefined;

    if (normalizedPhone && normalizedPhone.length === 10) {
      normalizedPhone = `91${normalizedPhone}`;
    }

    if (verifyMethod === "email" && (!email || !password)) {
      return NextResponse.json({ error: "Email and password are required for email signup" }, { status: 400 });
    }
    if (verifyMethod === "mobile" && !normalizedPhone) {
      return NextResponse.json({ error: "Mobile number is required for phone signup" }, { status: 400 });
    }

    let targetEmail = email;
    let targetPassword = password;

    if (verifyMethod === "mobile") {
      if (!targetEmail) {
        targetEmail = `${normalizedPhone}@mobile.travunited.local`;
      }
      if (!targetPassword) {
        const crypto = await import("crypto");
        targetPassword = crypto.randomBytes(16).toString("hex");
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: targetEmail },
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });

    if (existingUser) {
      const isPhoneMatch = normalizedPhone && existingUser.phone === normalizedPhone;
      return NextResponse.json(
        { error: isPhoneMatch ? "User with this mobile number already exists" : "User with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(targetPassword!, 10);
    const crypto = await import("crypto");
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10);

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: targetEmail!,
        passwordHash,
        phone: normalizedPhone,
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
        phone: true,
      },
    });

    if (verifyMethod === "mobile" && normalizedPhone) {
      try {
        const { sendOtp } = await import("@/lib/sms");
        await sendOtp(normalizedPhone);
      } catch (error) {
        console.error("[Signup] Failed to send mobile OTP:", error);
      }
    } else {
      try {
        const { sendRegistrationOTPEmail } = await import("@/lib/email");
        await sendRegistrationOTPEmail(user.email, otp, user.name || undefined, user.role);
      } catch (error) {
        console.error("[Signup] Failed to send OTP email:", error);
      }
    }

    return NextResponse.json(
      {
        message: `User created successfully. Please verify your ${verifyMethod === 'mobile' ? 'mobile number' : 'email'} with the OTP sent.`,
        user,
        requiresVerification: true
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Signup] ❌ Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
