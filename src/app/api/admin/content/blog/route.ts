import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMediaProxyUrl, normalizeMediaInput } from "@/lib/media";
import { publishReadyPosts } from "@/lib/blog/publishReady";
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
  title: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/i, "Slug can contain only letters, numbers, and hyphens"),
  coverImage: mediaField,
  excerpt: z.string().optional(),
  category: z.string().optional(),
  readTime: z.string().optional(),
  content: z.string().min(20),
  published: z.boolean().optional(),
  // SEO & Metadata
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  focusKeyword: z.string().optional().nullable(),
  author: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).optional().nullable(),
  publishedAt: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Auto-promote any scheduled posts that are ready before listing
    try {
      await publishReadyPosts();
    } catch (autoPublishError) {
      console.error("Error auto-publishing ready blog posts:", autoPublishError);
    }

    const posts = await prisma.blogPost.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = posts.map((post) => {
      // Derive status from isPublished and publishedAt
      let derivedStatus: "DRAFT" | "PUBLISHED" | "SCHEDULED" = "DRAFT";
      const now = new Date();
      
      if (post.isPublished) {
        // If published, it's PUBLISHED (even if publishedAt is in future, it's already published)
        derivedStatus = "PUBLISHED";
      } else if (post.publishedAt && post.publishedAt > now) {
        // If not published but has future publishedAt, it's SCHEDULED
        derivedStatus = "SCHEDULED";
      } else {
        // Otherwise it's a DRAFT
        derivedStatus = "DRAFT";
      }
      
      return {
        ...post,
        published: post.isPublished, // Map isPublished to published for frontend consistency
        isFeatured: post.isFeatured,
        coverImage: getMediaProxyUrl(post.coverImage),
        status: derivedStatus,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = blogSchema.parse(body);

    let normalizedCover: string | null;
    if (data.coverImage === "" || (typeof data.coverImage === "string" && data.coverImage.trim() === "")) {
      normalizedCover = null;
    } else if (data.coverImage) {
      normalizedCover = normalizeMediaInput(data.coverImage);
    } else {
      normalizedCover = null;
    }

    console.log("Creating blog post:", {
      coverImage: data.coverImage,
      normalizedCover,
    });

    // Determine status and published state
    const status = data.status || (data.published ? "PUBLISHED" : "DRAFT");
    const isPublished = status === "PUBLISHED";
    let publishedAtDate: Date | null = null;
    
    if (status === "PUBLISHED") {
      publishedAtDate = data.publishedAt ? new Date(data.publishedAt) : new Date();
    } else if (status === "SCHEDULED" && data.publishedAt) {
      publishedAtDate = new Date(data.publishedAt);
    }

    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        coverImage: normalizedCover,
        excerpt: data.excerpt || null,
        category: data.category || null,
        readTime: data.readTime || null,
        content: data.content,
        isPublished,
        publishedAt: publishedAtDate,
        // SEO & Metadata
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        focusKeyword: data.focusKeyword || null,
        author: data.author || null,
        // Note: status is derived from isPublished, not stored directly
      },
    });

    // Derive status from isPublished and publishedAt
    let derivedStatus: "DRAFT" | "PUBLISHED" | "SCHEDULED" = "DRAFT";
    const now = new Date();
    
    if (post.isPublished) {
      derivedStatus = "PUBLISHED";
    } else if (post.publishedAt && post.publishedAt > now) {
      derivedStatus = "SCHEDULED";
    } else {
      derivedStatus = "DRAFT";
    }

    return NextResponse.json({
      ...post,
      published: post.isPublished, // Map isPublished to published for frontend consistency
      isFeatured: post.isFeatured,
      status: derivedStatus,
    });
  } catch (error) {
    console.error("Error creating blog post:", error);
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

