import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMediaProxyUrl, normalizeMediaInput } from "@/lib/media";
export const dynamic = "force-dynamic";



const mediaField = z
  .union([
    z.string().refine((value) => {
      if (!value || value.trim() === "") {
        return true; // Empty string is valid (will be normalized to null)
      }
      // Accept paths starting with /api/media/
      if (value.startsWith("/api/media/")) {
        return true;
      }
      // Accept full URLs
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "Cover image must be a valid URL or media path starting with /api/media/"),
    z.literal(""),
  ])
  .optional()
  .nullable();

const blogSchema = z.object({
  title: z.string().min(3).optional(),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/i).optional(),
  coverImage: mediaField,
  excerpt: z.string().optional(),
  category: z.string().optional(),
  readTime: z.string().optional(),
  // Content must be at least 20 chars if provided, but can be omitted for updates
  content: z.union([
    z.string().min(20, "Content must be at least 20 characters"),
    z.literal("").transform(() => undefined),
  ]).optional(),
  published: z.boolean().optional(),
});

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

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...post,
      published: post.isPublished, // Map isPublished to published for frontend consistency
      coverImage: getMediaProxyUrl(post.coverImage),
    });
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // Log incoming payload for debugging
    console.log("Blog update request payload:", JSON.stringify(body, null, 2));
    console.log("Cover image value:", body.coverImage, "Type:", typeof body.coverImage);
    
    // Validate with better error messages
    let data;
    try {
      data = blogSchema.parse(body);
      console.log("Validation passed. Parsed data:", JSON.stringify(data, null, 2));
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
        console.error("Failed fields:", error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code,
          received: e.path.length > 0 ? body[e.path[0]] : 'unknown'
        })));
        return NextResponse.json(
          { 
            error: "Invalid input", 
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code,
              received: e.path.length > 0 ? body[e.path[0]] : undefined
            }))
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const existing = await prisma.blogPost.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    let normalizedCover: string | null | undefined;
    if (data.coverImage !== undefined) {
      if (data.coverImage === "" || (typeof data.coverImage === "string" && data.coverImage.trim() === "")) {
        normalizedCover = null;
      } else {
        normalizedCover = normalizeMediaInput(data.coverImage);
      }
    } else {
      normalizedCover = undefined;
    }

    console.log("Updating blog post:", {
      coverImage: data.coverImage,
      normalizedCover,
      existingCoverImage: existing.coverImage,
    });

    // Build update data object, only including fields that were provided
    const updateData: any = {};
    
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.slug !== undefined) {
      updateData.slug = data.slug;
    }
    if (data.content !== undefined) {
      updateData.content = data.content;
    }
    if (normalizedCover !== undefined) {
      updateData.coverImage = normalizedCover;
    }
    if (data.excerpt !== undefined) {
      updateData.excerpt = data.excerpt || null;
    }
    if (data.category !== undefined) {
      updateData.category = data.category || null;
    }
    if (data.readTime !== undefined) {
      updateData.readTime = data.readTime || null;
    }
    if (data.published !== undefined) {
      updateData.isPublished = data.published;
      updateData.publishedAt = data.published 
        ? (existing.publishedAt ?? new Date())
        : null;
    }

    const updated = await prisma.blogPost.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      published: updated.isPublished, // Map isPublished to published for frontend consistency
    });
  } catch (error) {
    console.error("Error updating blog post:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    await prisma.blogPost.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Blog post deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

