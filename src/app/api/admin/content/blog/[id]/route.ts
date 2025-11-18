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
      if (value.startsWith("/api/media/")) {
        return true;
      }
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, "Cover image must be a valid URL or media path"),
    z.literal(""),
  ])
  .optional();

const blogSchema = z.object({
  title: z.string().min(3).optional(),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/i).optional(),
  coverImage: mediaField,
  excerpt: z.string().optional(),
  category: z.string().optional(),
  readTime: z.string().optional(),
  content: z.string().min(20).optional(),
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
    const data = blogSchema.parse(body);

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

    const updated = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        title: data.title ?? existing.title,
        slug: data.slug ?? existing.slug,
        coverImage:
          normalizedCover !== undefined ? normalizedCover : existing.coverImage,
        excerpt: data.excerpt !== undefined ? data.excerpt || null : existing.excerpt,
        category: data.category !== undefined ? data.category || null : existing.category,
        readTime: data.readTime !== undefined ? data.readTime || null : existing.readTime,
        content: data.content ?? existing.content,
        isPublished: data.published !== undefined ? data.published : existing.isPublished,
        publishedAt:
          data.published === undefined
            ? existing.publishedAt
            : data.published
            ? existing.publishedAt ?? new Date()
            : null,
      },
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

