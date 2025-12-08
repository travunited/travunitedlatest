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
  console.log("[Password Reset] Request received");
  try {
    // Ensure we're receiving JSON
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("[Password Reset] Invalid content type", { contentType });
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await req.json();
      console.log("[Password Reset] Request body parsed", { email: body.email });
    } catch (parseError) {
      console.error("[Password Reset] Failed to parse JSON body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      );
    }

    let parsedEmail;
    try {
      const parsed = forgotPasswordSchema.parse(body);
      parsedEmail = parsed.email;
      console.log("[Password Reset] Email validated", { email: parsedEmail });
    } catch (validationError) {
      console.error("[Password Reset] Email validation failed", {
        error: validationError instanceof Error ? validationError.message : String(validationError),
        body,
      });
      // Still return generic success to avoid email enumeration
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }
    
    const normalizedEmail = parsedEmail.trim().toLowerCase();
    console.log("[Password Reset] Email normalized", { 
      original: parsedEmail, 
      normalized: normalizedEmail 
    });

    if (!normalizedEmail) {
      console.log("[Password Reset] Empty email after normalization");
      // Always return success to avoid email enumeration
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Find user by email
    let user;
    try {
      console.log("[Password Reset] Querying database for user", { normalizedEmail });
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true, // Check if user is active
        },
      });
      console.log("[Password Reset] Database query completed", {
        normalizedEmail,
        userFound: !!user,
        userId: user?.id,
        userEmail: user?.email,
        isActive: user?.isActive,
      });
    } catch (dbError) {
      console.error("[Password Reset] Database error during user lookup", {
        normalizedEmail,
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
      });
      // Still return generic success to avoid revealing errors
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      console.log("[Password Reset] User not found in database, returning generic success", {
        normalizedEmail,
        searchedEmail: normalizedEmail,
      });
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }
    
    console.log("[Password Reset] User found, proceeding with password reset", {
      userId: user.id,
      userEmail: user.email,
      isActive: user.isActive,
    });

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
      console.log("[Password Reset] Creating password reset record", {
        userId: user.id,
        userEmail: user.email,
      });
      
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
      
      console.log("[Password Reset] Password reset record created successfully", {
        resetId: passwordReset.id,
        userId: user.id,
        userEmail: user.email,
      });
    } catch (dbError) {
      console.error("[Password Reset] Failed to create password reset record", {
        userId: user.id,
        userEmail: user.email,
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined,
        errorName: dbError instanceof Error ? dbError.name : typeof dbError,
      });
      // Return error response with details for debugging (but still generic message to user)
      // This should not happen in normal operation - if it does, it's a database issue
      return NextResponse.json(
        { 
          message: "If an account exists with this email, a reset link has been sent.",
          error: process.env.NODE_ENV !== "production" ? "Database error creating reset record" : undefined,
        },
        { status: 200 }
      );
    }
    
    // Verify password reset record was created with an ID
    if (!passwordReset || !passwordReset.id) {
      console.error("[Password Reset] Password reset record created but missing ID", {
        userId: user.id,
        userEmail: user.email,
        passwordReset: passwordReset ? JSON.stringify(passwordReset) : "null",
      });
      // This should never happen, but handle it gracefully
      return NextResponse.json(
        { 
          message: "If an account exists with this email, a reset link has been sent.",
          error: process.env.NODE_ENV !== "production" ? "Reset record missing ID" : undefined,
        },
        { status: 200 }
      );
    }

    console.log("[Password Reset] Generated OTP", {
      userId: user.id,
      userEmail: user.email,
      resetId: passwordReset.id,
      otp: otp, // Log OTP for debugging (only in logs, not in response)
      otpExpiresAt: otpExpiresAt.toISOString(),
      expiresInMinutes: 10,
      ip: ip || "unknown",
      userAgent: userAgent || "unknown",
    });

    // Send OTP email - always attempt to send (let the email function handle configuration)
    // This matches the test page behavior which works successfully
    let emailSent = false;
    
    console.log("[Password Reset] Attempting to send OTP email", {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      resetId: passwordReset.id,
      otpLength: otp.length,
    });
    
    try {
      // Call the email function directly - it will handle configuration checks internally
      // This is the same approach as the test page which works successfully
      emailSent = await sendPasswordResetOTPEmail(user.email, otp, user.role);
      
      console.log("[Password Reset] sendPasswordResetOTPEmail returned", {
        emailSent,
        userId: user.id,
        userEmail: user.email,
        resetId: passwordReset.id,
      });

      if (emailSent) {
        console.log("[Password Reset] ✅ OTP email sent successfully", {
          userId: user.id,
          userEmail: user.email,
          resetId: passwordReset.id,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.error("[Password Reset] ❌ FAILED to send OTP email", {
          userId: user.id,
          userEmail: user.email,
          resetId: passwordReset.id,
          error: "sendPasswordResetOTPEmail returned false",
        });
        // Log the last email error if available
        const lastError = getLastEmailError();
        if (lastError) {
          console.error("[Password Reset] Last email error:", lastError);
        }
      }
    } catch (emailError) {
      console.error("[Password Reset] ❌ Exception sending email", {
        userId: user.id,
        userEmail: user.email,
        resetId: passwordReset.id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
        stack: emailError instanceof Error ? emailError.stack : undefined,
      });
      // Log the last email error if available
      const lastError = getLastEmailError();
      if (lastError) {
        console.error("[Password Reset] Last email error:", lastError);
      }
      // emailSent remains false, but we continue to return resetId
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
    
    // Ensure emailSent is a boolean (not undefined)
    const finalEmailSent = emailSent === true;
    
    const responseData: any = {
      message: finalEmailSent 
        ? "If an account exists with this email, an OTP has been sent."
        : "If an account exists with this email, an OTP has been sent. Please check your spam folder or try again.",
      resetId: passwordReset.id, // Return resetId for OTP verification
      emailSent: finalEmailSent, // Include emailSent status for frontend handling (always boolean)
    };
    
    // Include error in development for debugging
    if (process.env.NODE_ENV !== "production" && !finalEmailSent) {
      const lastError = getLastEmailError();
      if (lastError) {
        responseData.error = lastError;
      }
    }
    
    console.log("[Password Reset] Returning response", {
      hasResetId: !!responseData.resetId,
      resetId: responseData.resetId,
      emailSent: responseData.emailSent,
      emailSentType: typeof responseData.emailSent,
      userId: user.id,
      userEmail: user.email,
      passwordResetId: passwordReset.id,
    });
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[Password Reset] Unexpected error in forgot password route", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof z.ZodError ? "ZodError" : typeof error,
      errorName: error instanceof Error ? error.name : "Unknown",
    });
    
    if (error instanceof z.ZodError) {
      console.error("[Password Reset] Zod validation error details", {
        errors: error.errors,
        issues: error.issues,
      });
      // Still return generic success to avoid email enumeration
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Still return success to user (security best practice)
    return NextResponse.json(
      { message: "If an account exists with this email, a reset link has been sent." },
      { status: 200 }
    );
  }
}

