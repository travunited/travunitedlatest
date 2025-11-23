import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // Use findFirst instead of findUnique to handle potential null values better
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          not: null,
        },
      },
    });

    if (!user || !user.passwordResetExpires) {
      console.error("Validate token: Invalid token or no expiry date", { token });
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(user.passwordResetExpires);
    if (now > expiresAt) {
      console.error("Validate token: Token expired", { 
        token, 
        expiresAt: expiresAt.toISOString(),
        now: now.toISOString() 
      });
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Error validating reset token:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}

