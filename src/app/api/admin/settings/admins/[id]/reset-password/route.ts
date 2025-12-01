import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
export const dynamic = "force-dynamic";



export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        email: true,
        role: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    if (admin.role !== "STAFF_ADMIN" && admin.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Not an admin" },
        { status: 400 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

    await prisma.user.update({
      where: { id: params.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Send password reset email
    const resetLink = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password/${resetToken}`;
    
    try {
      const emailSent = await sendPasswordResetEmail(admin.email, resetLink, admin.role);
      if (!emailSent) {
        console.error("Failed to send password reset email to", admin.email);
        console.error("Reset URL:", resetLink);
        console.error("Check AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and EMAIL_FROM environment variables");
        return NextResponse.json(
          { error: "Failed to send password reset email. Please check server logs." },
          { status: 500 }
        );
      }
      // Password reset email sent successfully (logging removed for production)
    } catch (emailError) {
      console.error("Error sending password reset email:", emailError);
      console.error("Admin email:", admin.email);
      console.error("Reset URL:", resetLink);
      return NextResponse.json(
        { error: "Failed to send password reset email. Please check server logs." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Password reset email sent successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

