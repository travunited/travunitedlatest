import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Validate link URL (http/https only)
function validateLink(link?: string | null): string | null {
  if (!link || link.trim() === "") return null;
  
  try {
    const url = new URL(link);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }
    return url.toString();
  } catch (e) {
    throw new Error("Invalid link URL. Must be a valid http:// or https:// URL.");
  }
}

const homepageReviewSchema = z.object({
  reviewerName: z.string().min(1, "Reviewer name is required").max(100),
  title: z.string().max(200).optional().nullable().or(z.literal("")),
  comment: z.string().min(10, "Comment must be at least 10 characters"),
  rating: z.number().int().min(1).max(5),
  imageKey: z.string().optional().nullable().or(z.literal("")),
  imageUrl: z.union([
    z.string().url(),
    z.literal(""),
    z.null(),
  ]).optional().nullable(),
  isFeatured: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  link: z.union([
    z.string().url(),
    z.literal(""),
    z.null(),
  ]).optional().nullable(),
});

// GET - List homepage reviews
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const featured = searchParams.get("featured");
    const active = searchParams.get("active");

    const where: any = {
      // Homepage reviews don't have userId (admin-created)
      userId: null,
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

// POST - Create homepage review
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = homepageReviewSchema.parse(body);

    // Validate and normalize link
    let normalizedLink: string | null = null;
    try {
      normalizedLink = validateLink(data.link || null);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Create review (homepage reviews don't have userId, applicationId, or bookingId)
    const review = await prisma.review.create({
      data: {
        type: "VISA", // Default type for homepage reviews (can be changed if needed)
        reviewerName: data.reviewerName,
        title: data.title && data.title.trim() ? data.title.trim() : null,
        comment: data.comment,
        rating: data.rating,
        imageKey: data.imageKey || null,
        imageUrl: data.imageUrl || null,
        isFeatured: data.isFeatured,
        isVisible: data.isVisible,
        link: normalizedLink,
        userId: null, // Admin-created reviews don't have userId
        applicationId: null,
        bookingId: null,
      },
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.REVIEW,
      entityId: review.id,
      action: AuditAction.CREATE,
      description: `Created homepage review: ${data.reviewerName} (${data.rating}/5)`,
      metadata: {
        reviewerName: data.reviewerName,
        isFeatured: data.isFeatured,
        link: normalizedLink,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Homepage review validation error:", error.errors);
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating homepage review:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

