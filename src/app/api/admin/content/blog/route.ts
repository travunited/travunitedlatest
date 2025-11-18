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
  title: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/i, "Slug can contain only letters, numbers, and hyphens"),
  coverImage: mediaField,
  excerpt: z.string().optional(),
  category: z.string().optional(),
  readTime: z.string().optional(),
  content: z.string().min(20),
  published: z.boolean().optional(),
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

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const posts = await prisma.blogPost.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = posts.map((post) => ({
      ...post,
      published: post.isPublished, // Map isPublished to published for frontend consistency
      coverImage: getMediaProxyUrl(post.coverImage),
    }));

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

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
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

    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        coverImage: normalizedCover,
        excerpt: data.excerpt || null,
        category: data.category || null,
        readTime: data.readTime || null,
        content: data.content,
        isPublished: data.published ?? false,
        publishedAt: data.published ? new Date() : null,
      },
    });

    return NextResponse.json({
      ...post,
      published: post.isPublished, // Map isPublished to published for frontend consistency
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

