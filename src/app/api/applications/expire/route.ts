import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";


// This should be run as a cron job or scheduled task
// Expires drafts after 7 days and payment pending after 48 hours
export async function POST(req: Request) {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Expire drafts older than 7 days
    await prisma.application.updateMany({
      where: {
        status: "DRAFT",
        updatedAt: {
          lt: sevenDaysAgo,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    // Expire payment pending older than 48 hours
    await prisma.application.updateMany({
      where: {
        status: "PAYMENT_PENDING",
        updatedAt: {
          lt: twoDaysAgo,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    return NextResponse.json({
      message: "Expired applications processed",
    });
  } catch (error) {
    console.error("Error expiring applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

