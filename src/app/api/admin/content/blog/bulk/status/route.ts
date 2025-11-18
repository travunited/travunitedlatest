import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



const bulkStatusSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one blog post ID is required"),
  published: z.boolean(),
});

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
    const data = bulkStatusSchema.parse(body);

    // Verify all posts exist
    const posts = await prisma.blogPost.findMany({
      where: {
        id: { in: data.ids },
      },
      select: { id: true, publishedAt: true },
    });

    if (posts.length !== data.ids.length) {
      return NextResponse.json(
        { error: "Some blog posts were not found" },
        { status: 404 }
      );
    }

    // Update all posts
    const now = new Date();
    await prisma.blogPost.updateMany({
      where: {
        id: { in: data.ids },
      },
      data: {
        isPublished: data.published,
        publishedAt: data.published ? now : null,
      },
    });

    return NextResponse.json({
      message: `Successfully ${data.published ? "published" : "unpublished"} ${data.ids.length} blog post(s)`,
      updatedCount: data.ids.length,
    });
  } catch (error) {
    console.error("Error bulk updating blog post status:", error);
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

