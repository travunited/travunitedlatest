import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one blog post ID is required"),
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
    const data = bulkDeleteSchema.parse(body);

    // Verify all posts exist
    const posts = await prisma.blogPost.findMany({
      where: {
        id: { in: data.ids },
      },
      select: { id: true },
    });

    if (posts.length !== data.ids.length) {
      return NextResponse.json(
        { error: "Some blog posts were not found" },
        { status: 404 }
      );
    }

    // Delete all posts
    await prisma.blogPost.deleteMany({
      where: {
        id: { in: data.ids },
      },
    });

    return NextResponse.json({
      message: `Successfully deleted ${data.ids.length} blog post(s)`,
      deletedCount: data.ids.length,
    });
  } catch (error) {
    console.error("Error bulk deleting blog posts:", error);
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

