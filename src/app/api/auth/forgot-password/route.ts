import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { z } from "zod";
export const dynamic = "force-dynamic";


const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Token valid for 1 hour

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Send email with reset link
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password/${resetToken}`;
    
    const { sendPasswordResetEmail } = await import("@/lib/email");
    const emailSent = await sendPasswordResetEmail(user.email, resetUrl, user.role);
    
    if (!emailSent) {
      console.error("Failed to send password reset email to", user.email);
      // Still return success to user (security best practice - don't reveal if email exists)
    }

    return NextResponse.json({
      message: "If an account exists with this email, a reset link has been sent.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

