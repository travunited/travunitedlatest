import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const blogSchema = z.object({
  title: z.string().min(3).optional(),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/i).optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
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

    return NextResponse.json(post);
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

    const updated = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        title: data.title ?? existing.title,
        slug: data.slug ?? existing.slug,
        coverImage: data.coverImage !== undefined ? data.coverImage || null : existing.coverImage,
        excerpt: data.excerpt !== undefined ? data.excerpt || null : existing.excerpt,
        category: data.category !== undefined ? data.category || null : existing.category,
        readTime: data.readTime !== undefined ? data.readTime || null : existing.readTime,
        content: data.content ?? existing.content,
        isPublished: data.published ?? existing.isPublished,
        publishedAt:
          data.published === undefined
            ? existing.publishedAt
            : data.published
            ? existing.publishedAt ?? new Date()
            : null,
      },
    });

    return NextResponse.json(updated);
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

