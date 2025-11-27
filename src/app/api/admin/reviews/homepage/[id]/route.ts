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
  reviewerName: z.string().min(1, "Reviewer name is required").max(100).optional(),
  title: z.string().max(200).optional().nullable().or(z.literal("")),
  comment: z.string().min(10, "Comment must be at least 10 characters").optional(),
  rating: z.number().int().min(1).max(5).optional(),
  imageKey: z.string().optional().nullable().or(z.literal("")),
  imageUrl: z.union([
    z.string().url(),
    z.literal(""),
    z.null(),
  ]).optional().nullable(),
  isFeatured: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  link: z.union([
    z.string().url(),
    z.literal(""),
    z.null(),
  ]).optional().nullable(),
});

// GET - Get single homepage review
export async function GET(
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

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const review = await prisma.review.findUnique({
      where: { id: params.id },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Verify it's a homepage review (no userId)
    if (review.userId !== null) {
      return NextResponse.json(
        { error: "This is not a homepage review" },
        { status: 400 }
      );
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error("Error fetching homepage review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update homepage review
export async function PUT(
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

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const review = await prisma.review.findUnique({
      where: { id: params.id },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Verify it's a homepage review
    if (review.userId !== null) {
      return NextResponse.json(
        { error: "This is not a homepage review" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = homepageReviewSchema.parse(body);

    // Validate and normalize link
    let normalizedLink: string | null = review.link;
    if (data.link !== undefined) {
      try {
        normalizedLink = validateLink(data.link || null);
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (data.reviewerName !== undefined) updateData.reviewerName = data.reviewerName;
    if (data.title !== undefined) updateData.title = data.title && data.title.trim() ? data.title.trim() : null;
    if (data.comment !== undefined) updateData.comment = data.comment;
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.imageKey !== undefined) updateData.imageKey = data.imageKey;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
    if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
    if (data.link !== undefined) updateData.link = normalizedLink;

    const updated = await prisma.review.update({
      where: { id: params.id },
      data: updateData,
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.REVIEW,
      entityId: updated.id,
      action: AuditAction.UPDATE,
      description: `Updated homepage review: ${updated.reviewerName || "Unknown"} (${updated.rating}/5)`,
      metadata: {
        reviewerName: updated.reviewerName,
        isFeatured: updated.isFeatured,
        link: updated.link,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Homepage review update validation error:", error.errors);
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating homepage review:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete homepage review
export async function DELETE(
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

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const review = await prisma.review.findUnique({
      where: { id: params.id },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Verify it's a homepage review
    if (review.userId !== null) {
      return NextResponse.json(
        { error: "This is not a homepage review" },
        { status: 400 }
      );
    }

    await prisma.review.delete({
      where: { id: params.id },
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.REVIEW,
      entityId: params.id,
      action: AuditAction.DELETE,
      description: `Deleted homepage review: ${review.reviewerName || "Unknown"}`,
      metadata: {
        reviewerName: review.reviewerName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting homepage review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

