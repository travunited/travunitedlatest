import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: {
        passwordResetToken: token,
      },
    });

    if (!user || !user.passwordResetExpires) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // Check if token has expired
    if (new Date() > user.passwordResetExpires) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Error validating reset token:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}

