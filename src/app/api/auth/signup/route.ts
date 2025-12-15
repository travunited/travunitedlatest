import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
export const dynamic = "force-dynamic";


const signupSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, phone } = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        role: "CUSTOMER",
        emailVerified: false, // Email verification is optional (non-blocking)
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Send welcome email and verification email (non-blocking)
    try {
      const { sendWelcomeEmail, sendEmailVerificationEmail } = await import("@/lib/email");
      
      // Send welcome email
      try {
        await sendWelcomeEmail(user.email, user.name || undefined, user.role);
      } catch (welcomeError) {
        console.error("Failed to send welcome email:", welcomeError);
        // Continue with verification email even if welcome email fails
      }
      
      // Send verification email
      const crypto = await import("crypto");
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpires = new Date();
      verificationExpires.setDate(verificationExpires.getDate() + 7); // Valid for 7 days
      
      // Store verification token using passwordResetToken field (we can add a separate field later if needed)
      // Prefix token with "verify_" to distinguish from password reset tokens
      const prefixedToken = `verify_${verificationToken}`;
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: prefixedToken,
          passwordResetExpires: verificationExpires,
        },
      });
      
      const verificationUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`;
      await sendEmailVerificationEmail(user.email, verificationUrl, user.name || undefined, user.role);
    } catch (error) {
      // Non-blocking - don't fail signup if email fails
      console.error("Failed to send emails:", error);
    }

    return NextResponse.json(
      { message: "User created successfully", user },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

