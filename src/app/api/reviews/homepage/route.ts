import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate every 60 seconds

// GET - Public endpoint for homepage reviews
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const featured = searchParams.get("featured");
    const active = searchParams.get("active");
    const limit = searchParams.get("limit");

    const where: any = {
      // Homepage reviews don't have userId (admin-created)
      userId: null,
      isVisible: true, // Only show visible reviews publicly
    };

    if (featured === "true") {
      where.isFeatured = true;
    }

    if (active === "true") {
      where.isVisible = true;
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit ? parseInt(limit, 10) : undefined,
      select: {
        id: true,
        reviewerName: true,
        title: true,
        comment: true,
        rating: true,
        imageKey: true,
        imageUrl: true,
        link: true,
        createdAt: true,
      },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Error fetching homepage reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

