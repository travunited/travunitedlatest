import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendPasswordResetEmail, getLastEmailError, getEmailServiceConfig } from "@/lib/email";

export const dynamic = "force-dynamic";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
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

    const { email } = forgotPasswordSchema.parse(body);
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      // Always return success to avoid email enumeration
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Generate reset token (64 character hex string)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Get IP and user agent for logging
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // Create password reset record
    const passwordReset = await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ip: ip || undefined,
        userAgent: userAgent || undefined,
      },
    });

    // Send email with reset link (includes both token and resetId for easier lookup)
    // Ensure NEXTAUTH_URL is set correctly
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (!process.env.NEXTAUTH_URL) {
      console.warn("[Password Reset] WARNING: NEXTAUTH_URL not set, using fallback:", baseUrl);
    }

    // Properly URL-encode the token to prevent issues with special characters
    // Note: encodeURIComponent ensures safe transmission in URLs
    const encodedToken = encodeURIComponent(rawToken);
    const encodedId = encodeURIComponent(passwordReset.id);
    // Ensure the URL is properly formatted
    const resetUrl = `${baseUrl}/reset-password?token=${encodedToken}&id=${encodedId}`;
    
    // Log the URL for debugging (in production, you might want to remove this)
    console.log("[Password Reset] Generated reset URL", {
      baseUrl,
      tokenLength: rawToken.length,
      idLength: passwordReset.id.length,
      urlLength: resetUrl.length,
      urlPreview: resetUrl.substring(0, 100) + "...",
    });

    console.log("[Password Reset] Attempting to send email", {
      userId: user.id,
      userEmail: user.email,
      resetId: passwordReset.id,
      resetUrl: resetUrl,
      tokenLength: rawToken.length,
      expiresAt: expiresAt.toISOString(),
      expiresAtTimestamp: expiresAt.getTime(),
      expiresInHours: 24,
      ip: ip || "unknown",
      userAgent: userAgent || "unknown",
      baseUrl: baseUrl,
      hasNEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    });

    // Validate email configuration before attempting to send
    const emailServiceConfig = await getEmailServiceConfig();
    if (!emailServiceConfig.awsAccessKeyId || !emailServiceConfig.awsSecretAccessKey || !emailServiceConfig.awsRegion) {
      const errorMsg = "Email service not configured - AWS SES credentials missing. Configure it in Admin → Settings → Email Service Configuration or set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION environment variables.";
      console.error("[Password Reset]", errorMsg, {
        userId: user.id,
        userEmail: user.email,
        resetId: passwordReset.id,
        hasEnvVars: {
          AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
          AWS_REGION: !!process.env.AWS_REGION,
        },
        hasConfig: {
          awsAccessKeyId: !!emailServiceConfig.awsAccessKeyId,
          awsSecretAccessKey: !!emailServiceConfig.awsSecretAccessKey,
          awsRegion: !!emailServiceConfig.awsRegion,
        },
        configDetails: {
          awsAccessKeyId: emailServiceConfig.awsAccessKeyId ? "SET" : "MISSING",
          awsSecretAccessKey: emailServiceConfig.awsSecretAccessKey ? "SET" : "MISSING",
          awsRegion: emailServiceConfig.awsRegion ? "SET" : "MISSING",
          emailFromGeneral: emailServiceConfig.emailFromGeneral ? "SET" : "MISSING",
        },
      });
      // Still return success to user (security best practice - don't reveal if account exists)
      return NextResponse.json({
        message: "If an account exists with this email, a reset link has been sent.",
      });
    }

    if (!emailServiceConfig.emailFromGeneral) {
      const errorMsg = "Email service not configured - Sender email missing. Configure it in Admin → Settings → Email Service Configuration or set EMAIL_FROM environment variable.";
      console.error("[Password Reset]", errorMsg, {
        userId: user.id,
        userEmail: user.email,
        resetId: passwordReset.id,
        hasEnvVar: !!process.env.EMAIL_FROM,
        hasConfigEmail: !!emailServiceConfig.emailFromGeneral,
        configDetails: {
          resendApiKey: emailServiceConfig.resendApiKey ? "SET" : "MISSING",
          emailFromGeneral: emailServiceConfig.emailFromGeneral ? "SET" : "MISSING",
        },
      });
      // Still return success to user (security best practice - don't reveal if account exists)
      return NextResponse.json({
        message: "If an account exists with this email, a reset link has been sent.",
      });
    }

    console.log("[Password Reset] Email configuration validated", {
      userId: user.id,
      userEmail: user.email,
      resetId: passwordReset.id,
      hasAWSCredentials: !!(emailServiceConfig.awsAccessKeyId && emailServiceConfig.awsSecretAccessKey),
      hasRegion: !!emailServiceConfig.awsRegion,
      hasEmailFrom: !!emailServiceConfig.emailFromGeneral,
      emailFrom: emailServiceConfig.emailFromGeneral?.substring(0, 50) + "...",
    });

    // Send email - await it to ensure it's sent before responding
    // This ensures we catch errors and can log them properly
    let emailSent = false;
    try {
      emailSent = await sendPasswordResetEmail(user.email, resetUrl, user.role);

      if (emailSent) {
        console.log("[Password Reset] Email sent successfully", {
          userId: user.id,
          userEmail: user.email,
          resetId: passwordReset.id,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.error("[Password Reset] FAILED to send email", {
          userId: user.id,
          userEmail: user.email,
          resetId: passwordReset.id,
          resetUrl: resetUrl,
          error: "sendPasswordResetEmail returned false",
          checkEnvVars: {
            AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "SET" : "MISSING",
            AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? "SET" : "MISSING",
            AWS_REGION: process.env.AWS_REGION || "MISSING",
            EMAIL_FROM: process.env.EMAIL_FROM || "MISSING",
            NEXTAUTH_URL: baseUrl,
          },
        });
        // Log the last email error if available
        const lastError = getLastEmailError();
        if (lastError) {
          console.error("[Password Reset] Last email error:", lastError);
        }
      }
    } catch (emailError) {
      console.error("[Password Reset] Exception sending email", {
        userId: user.id,
        userEmail: user.email,
        resetId: passwordReset.id,
        resetUrl: resetUrl,
        error: emailError instanceof Error ? emailError.message : String(emailError),
        stack: emailError instanceof Error ? emailError.stack : undefined,
        checkEnvVars: {
          AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "SET" : "MISSING",
          AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? "SET" : "MISSING",
          AWS_REGION: process.env.AWS_REGION || "MISSING",
          EMAIL_FROM: process.env.EMAIL_FROM || "MISSING",
        },
      });
      // Log the last email error if available
      const lastError = getLastEmailError();
      if (lastError) {
        console.error("[Password Reset] Last email error:", lastError);
      }
    }

    // In development, return the link in the response for easier testing
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        message: "If an account exists with this email, a reset link has been sent.",
        devLink: resetUrl, // Only for development/debugging
        emailSent,
      });
    }

    return NextResponse.json({
      message: "If an account exists with this email, a reset link has been sent.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Still return generic success to avoid email enumeration
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }

    console.error("Error in forgot password:", error);
    // Still return success to user (security best practice)
    return NextResponse.json(
      { message: "If an account exists with this email, a reset link has been sent." },
      { status: 200 }
    );
  }
}

