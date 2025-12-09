import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendPasswordResetEmail, getLastEmailError } from "@/lib/email";

export const dynamic = "force-dynamic";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Generic success response to avoid email enumeration
// Always include emailSent as boolean when provided, so frontend can reliably check it
function respond(resetId?: string, emailSent?: boolean, error?: string) {
  const responseData: {
    message: string;
    resetId?: string;
    emailSent?: boolean;
    error?: string;
  } = {
    message: "If an account exists with this email, a reset link has been sent.",
  };
  
  if (resetId) {
    responseData.resetId = resetId;
  }
  
  // Always include emailSent as boolean when provided (not undefined)
  if (typeof emailSent === "boolean") {
    responseData.emailSent = emailSent;
  }
  
  // Include error in non-production or if explicitly provided
  if (error && (process.env.NODE_ENV !== "production" || error)) {
    responseData.error = error;
  }
  
  return NextResponse.json(responseData, { status: 200 });
}

export async function POST(req: Request) {
  try {
    // 1) Parse & validate
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return respond();

    // 2) Find user (case-insensitive)
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user) return respond(); // silent success

    // 3) Generate magic link token (no OTP)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // 4) Create reset record
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;
    const reset = await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        otp: null,
        otpExpiresAt: null,
        ip: ip || undefined,
        userAgent: userAgent || undefined,
      },
    });

    // 5) Build magic link and send email
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://travunited.in";
    const magicLink = `${baseUrl}/reset-password?id=${reset.id}&token=${encodeURIComponent(rawToken)}`;

    // Log the full magic link for debugging (safe to log as it's a one-time use token)
    console.log("[Password Reset] 🔗 Magic link generated", {
      userId: user.id,
      userEmail: user.email,
      resetId: reset.id,
      baseUrl,
      magicLinkFull: magicLink, // Log full link for debugging
      magicLinkPreview: magicLink.slice(0, 100) + "...",
      tokenLength: rawToken.length,
      encodedTokenLength: encodeURIComponent(rawToken).length,
      timestamp: new Date().toISOString(),
    });

    let emailSent = false;
    let emailError: string | undefined = undefined;
    
    // Send email using the exact same pattern as contact form
    try {
      console.log("[Password Reset] 📧 Attempting to send magic link email", {
        userId: user.id,
        userEmail: user.email,
        resetId: reset.id,
        baseUrl,
        magicLinkPreview: magicLink.slice(0, 80) + "...",
        timestamp: new Date().toISOString(),
      });
      
      // Call sendPasswordResetEmail (which calls sendEmail - same as contact form)
      emailSent = await sendPasswordResetEmail(user.email, magicLink, user.role);
      
      if (emailSent) {
        console.log("[Password Reset] ✅ Magic link email sent successfully", {
          userId: user.id,
          userEmail: user.email,
          resetId: reset.id,
          timestamp: new Date().toISOString(),
        });
      } else {
        const lastError = getLastEmailError();
        emailError = lastError || "Email sending returned false";
        console.error("[Password Reset] ❌ Email sending failed", {
          userId: user.id,
          userEmail: user.email,
          resetId: reset.id,
          lastEmailError: emailError,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      const lastError = getLastEmailError();
      emailError = err instanceof Error ? err.message : String(err);
      emailSent = false;
      console.error("[Password Reset] ❌ Exception sending magic link email", {
        userId: user.id,
        userEmail: user.email,
        resetId: reset.id,
        error: emailError,
        stack: err instanceof Error ? err.stack : undefined,
        lastEmailError: lastError || null,
        timestamp: new Date().toISOString(),
      });
    }

    // 6) Return resetId (even if email failed), plus emailSent flag
    // Always include emailSent as boolean so frontend can check it
    const responseData = {
      message: "If an account exists with this email, a reset link has been sent.",
      resetId: reset.id,
      emailSent: emailSent, // Always include as boolean
      ...(emailError && process.env.NODE_ENV !== "production" ? { error: emailError } : {}),
    };
    
    // Log the exact response being sent
    console.log("[Password Reset] 📤 Sending response to client", {
      resetId: reset.id,
      emailSent,
      hasEmailSent: typeof emailSent === "boolean",
      emailError: emailError || null,
      responseData,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) return respond();
    console.error("[Password Reset] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return respond();
  }
}

