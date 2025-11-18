import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



export async function GET() {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json({ users, count: users.length });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Database connection failed", details: String(error) },
      { status: 500 }
    );
  }
}

