import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
export const dynamic = "force-dynamic";



export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Anonymize user data instead of hard delete (for legal/compliance reasons)
    // Keep applications/bookings but remove personal info
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: null,
        email: `deleted_${Date.now()}@deleted.local`,
        phone: null,
        passwordHash: crypto.randomBytes(32).toString("hex"), // Invalidate password
        isActive: false,
        // Keep applications and bookings for records, but user can't access
      },
    });

    // In production, you might want to:
    // 1. Log the deletion for audit purposes
    // 2. Send confirmation email
    // 3. Schedule permanent deletion after retention period

    return NextResponse.json({
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

