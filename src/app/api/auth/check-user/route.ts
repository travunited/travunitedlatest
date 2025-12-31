import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone is required" },
        { status: 400 }
      );
    }

    let user = null;
    if (email) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true },
      });
    } else if (phone) {
      // Normalize phone
      const normalizedPhone = phone.replace(/\D/g, "");
      const finalPhone = normalizedPhone.length === 10 ? `91${normalizedPhone}` : normalizedPhone;
      
      user = await prisma.user.findFirst({
        where: { phone: finalPhone },
        select: { id: true, phone: true },
      });
    }

    return NextResponse.json({
      exists: !!user,
    });
  } catch (error) {
    console.error("Error checking user:", error);
    return NextResponse.json(
      { error: "Failed to check user" },
      { status: 500 }
    );
  }
}

