import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendPasswordResetOTPEmail, getLastEmailError, getEmailServiceConfig } from "@/lib/email";

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
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true, // Check if user is active
      },
    });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Log user status for debugging (but still send email even if inactive)
    if (!user.isActive) {
      console.log("[Password Reset] User is inactive, but sending password reset email anyway", {
        userId: user.id,
        userEmail: user.email,
        isActive: user.isActive,
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Generate reset token (64 character hex string) for backward compatibility
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Get IP and user agent for logging
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // Create password reset record with OTP
    let passwordReset;
    try {
      passwordReset = await prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          otp,
          otpExpiresAt,
          ip: ip || undefined,
          userAgent: userAgent || undefined,
        },
      });
    } catch (dbError) {
      console.error("[Password Reset] Failed to create password reset record", {
        userId: user.id,
        userEmail: user.email,
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
      });
      // Still return success to avoid revealing user existence
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }

    console.log("[Password Reset] Generated OTP", {
      userId: user.id,
      userEmail: user.email,
      resetId: passwordReset.id,
      otpExpiresAt: otpExpiresAt.toISOString(),
      expiresInMinutes: 10,
      ip: ip || "unknown",
      userAgent: userAgent || "unknown",
    });

    // Validate email configuration before attempting to send
    const emailServiceConfig = await getEmailServiceConfig();
    let emailSent = false;
    
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
      // Continue to return response with resetId even though email failed
    } else if (!emailServiceConfig.emailFromGeneral) {
      const errorMsg = "Email service not configured - Sender email missing. Configure it in Admin → Settings → Email Service Configuration or set EMAIL_FROM environment variable.";
      console.error("[Password Reset]", errorMsg, {
        userId: user.id,
        userEmail: user.email,
        resetId: passwordReset.id,
        hasEnvVar: !!process.env.EMAIL_FROM,
        hasConfigEmail: !!emailServiceConfig.emailFromGeneral,
        configDetails: {
          awsAccessKeyId: emailServiceConfig.awsAccessKeyId ? "SET" : "MISSING",
          awsSecretAccessKey: emailServiceConfig.awsSecretAccessKey ? "SET" : "MISSING",
          awsRegion: emailServiceConfig.awsRegion ? "SET" : "MISSING",
          emailFromGeneral: emailServiceConfig.emailFromGeneral ? "SET" : "MISSING",
        },
      });
      // Continue to return response with resetId even though email failed
    } else {

      console.log("[Password Reset] Email configuration validated", {
        userId: user.id,
        userEmail: user.email,
        resetId: passwordReset.id,
        hasAWSCredentials: !!(emailServiceConfig.awsAccessKeyId && emailServiceConfig.awsSecretAccessKey),
        hasRegion: !!emailServiceConfig.awsRegion,
        hasEmailFrom: !!emailServiceConfig.emailFromGeneral,
        emailFrom: emailServiceConfig.emailFromGeneral?.substring(0, 50) + "...",
      });

      // Send OTP email - await it to ensure it's sent before responding
      // This ensures we catch errors and can log them properly
      try {
        emailSent = await sendPasswordResetOTPEmail(user.email, otp, user.role);

        if (emailSent) {
          console.log("[Password Reset] OTP email sent successfully", {
            userId: user.id,
            userEmail: user.email,
            resetId: passwordReset.id,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.error("[Password Reset] FAILED to send OTP email", {
            userId: user.id,
            userEmail: user.email,
            resetId: passwordReset.id,
            error: "sendPasswordResetOTPEmail returned false",
            checkEnvVars: {
              AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? "SET" : "MISSING",
              AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? "SET" : "MISSING",
              AWS_REGION: process.env.AWS_REGION || "MISSING",
              EMAIL_FROM: process.env.EMAIL_FROM || "MISSING",
              NEXTAUTH_URL: process.env.NEXTAUTH_URL || "MISSING",
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
    }

    // In development, return the OTP in the response for easier testing
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        message: "If an account exists with this email, an OTP has been sent.",
        devOtp: otp, // Only for development/debugging
        resetId: passwordReset.id, // For OTP verification
        emailSent,
        debug: {
          userExists: true,
          isActive: user.isActive,
          lastEmailError: getLastEmailError() || null,
        },
      });
    }

    // Return success with emailSent status so frontend can show appropriate message
    // Still return resetId even if email failed (user might have received it)
    if (!passwordReset || !passwordReset.id) {
      console.error("[Password Reset] Password reset record missing ID before response", {
        userId: user.id,
        userEmail: user.email,
        passwordReset: passwordReset ? "exists but no id" : "null",
      });
      // Still return success to avoid revealing user existence
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }
    
    const responseData: any = {
      message: emailSent 
        ? "If an account exists with this email, an OTP has been sent."
        : "If an account exists with this email, an OTP has been sent. Please check your spam folder or try again.",
      resetId: passwordReset.id, // Return resetId for OTP verification
      emailSent, // Include emailSent status for frontend handling
    };
    
    // Include error in development for debugging
    if (process.env.NODE_ENV !== "production" && !emailSent) {
      responseData.error = getLastEmailError();
    }
    
    console.log("[Password Reset] Returning response", {
      hasResetId: !!responseData.resetId,
      resetId: responseData.resetId,
      emailSent: responseData.emailSent,
      userId: user.id,
      userEmail: user.email,
    });
    
    return NextResponse.json(responseData);
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

