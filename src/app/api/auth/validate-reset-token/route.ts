import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const resetId = searchParams.get("id");

    if (!token || !resetId) {
      console.warn("[Password Reset] Validation failed: missing token or id");
      return NextResponse.json(
        { valid: false, error: "Token and reset ID are required" },
        { status: 400 }
      );
    }

    // Find password reset record
    const passwordReset = await prisma.passwordReset.findUnique({
      where: { id: resetId },
    });

    if (!passwordReset) {
      console.warn("[Password Reset] Validation failed: record not found", { resetId });
      return NextResponse.json(
        { valid: false, error: "Invalid reset link" },
        { status: 200 }
      );
    }

    // Check if already used
    if (passwordReset.used) {
      console.warn("[Password Reset] Validation failed: already used", {
        resetId,
        userId: passwordReset.userId,
      });
      return NextResponse.json(
        { valid: false, error: "This reset link has already been used" },
        { status: 200 }
      );
    }

    // Check if expired - use timestamp comparison for reliability
    const now = Date.now();
    const expiresAt = passwordReset.expiresAt.getTime();
    if (now > expiresAt) {
      const expiredByMinutes = Math.round((now - expiresAt) / 1000 / 60);
      console.warn("[Password Reset] Validation failed: expired", {
        resetId,
        userId: passwordReset.userId,
        expiresAt: passwordReset.expiresAt.toISOString(),
        now: new Date(now).toISOString(),
        expiredBy: `${expiredByMinutes} minutes`,
        expiresAtTimestamp: expiresAt,
        nowTimestamp: now,
        tokenHashPrefix: passwordReset.tokenHash.substring(0, 10) + "...",
      });
      return NextResponse.json(
        { valid: false, error: "Reset link has expired" },
        { status: 200 }
      );
    }

    // Verify token matches hash
    // Ensure token is properly decoded (in case it was double-encoded)
    const decodedToken = decodeURIComponent(token);
    const tokenMatches = await bcrypt.compare(decodedToken, passwordReset.tokenHash);
    if (!tokenMatches) {
      console.warn("[Password Reset] Validation failed: token mismatch", {
        resetId,
        userId: passwordReset.userId,
        tokenLength: token.length,
        decodedTokenLength: decodedToken.length,
        tokenHashPrefix: passwordReset.tokenHash.substring(0, 10) + "...",
        // Log first few chars of token for debugging (safe as it's already invalid/mismatched)
        tokenPrefix: token.substring(0, 5) + "...",
        decodedTokenPrefix: decodedToken.substring(0, 5) + "...",
      });
      return NextResponse.json(
        { valid: false, error: "Invalid reset token" },
        { status: 200 }
      );
    }

    console.log("[Password Reset] Token validated successfully", {
      resetId,
      userId: passwordReset.userId,
    });

    return NextResponse.json({
      valid: true,
    });
  } catch (error) {
    console.error("[Password Reset] Exception validating token:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { valid: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
