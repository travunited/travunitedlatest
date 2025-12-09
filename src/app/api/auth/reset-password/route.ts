import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const resetPasswordSchema = z.object({
  resetId: z.string().min(1, "Reset ID is required"),
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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

    const { resetId, token, password } = resetPasswordSchema.parse(body);

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
      console.error("[Password Reset] Record not found", { resetId });
      return NextResponse.json(
        { error: "Invalid reset request" },
        { status: 400 }
      );
    }

    // Check if already used
    if (passwordReset.used) {
      console.error("[Password Reset] Reset already used", {
        resetId,
        userId: passwordReset.userId,
        createdAt: passwordReset.createdAt.toISOString(),
      });
      return NextResponse.json(
        { error: "This reset request has already been used. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date() > passwordReset.expiresAt) {
      console.error("[Password Reset] Link expired", {
        resetId,
        expiresAt: passwordReset.expiresAt,
      });
      return NextResponse.json(
        { error: "Reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify token hash
    // Decode token in case it was URL-encoded (same as validate-reset-token route)
    const decodedToken = decodeURIComponent(token);
    const tokenMatches = await bcrypt.compare(decodedToken, passwordReset.tokenHash);
    if (!tokenMatches) {
      console.error("[Password Reset] Invalid token", {
        resetId,
        tokenLength: token.length,
        decodedTokenLength: decodedToken.length,
        tokenPrefix: token.slice(0, 6) + "...",
        decodedTokenPrefix: decodedToken.slice(0, 6) + "...",
        tokenHashPrefix: passwordReset.tokenHash.substring(0, 10) + "...",
      });
      return NextResponse.json(
        { error: "Invalid reset link. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and mark reset as used (in a transaction)
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: passwordReset.userId },
        data: {
          passwordHash,
        },
      });

      await tx.passwordReset.update({
        where: { id: resetId },
        data: {
          used: true,
        },
      });
    });

    console.log("[Password Reset] Successfully reset password", {
      userId: passwordReset.userId,
      userEmail: passwordReset.user.email,
      resetId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error("[Password Reset] Exception resetting password:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

