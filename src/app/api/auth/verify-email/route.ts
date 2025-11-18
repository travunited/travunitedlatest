import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
export const dynamic = "force-dynamic";



const verifyEmailSchema = z.object({
  token: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { token } = verifyEmailSchema.parse(body);

    // If token provided, verify it
    if (token) {
      // TODO: Implement token-based verification
      // For now, we'll just mark as verified for logged-in users
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Email verified successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    console.error("Error verifying email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        emailVerified: true,
        email: true,
      },
    });

    return NextResponse.json({
      emailVerified: user?.emailVerified || false,
      email: user?.email,
    });
  } catch (error) {
    console.error("Error checking email verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

