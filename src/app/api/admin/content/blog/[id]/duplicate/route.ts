
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
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

        if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
            return NextResponse.json(
                { error: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        const sourcePost = await prisma.blogPost.findUnique({
            where: { id: params.id },
        });

        if (!sourcePost) {
            return NextResponse.json(
                { error: "Blog post not found" },
                { status: 404 }
            );
        }

        const timestamp = new Date().getTime();
        const newTitle = `${sourcePost.title} (Copy)`;
        const newSlug = `${sourcePost.slug}-copy-${timestamp}`;

        const newPost = await prisma.blogPost.create({
            data: {
                title: newTitle,
                slug: newSlug,
                content: sourcePost.content,
                excerpt: sourcePost.excerpt,
                category: sourcePost.category,
                readTime: sourcePost.readTime,
                coverImage: sourcePost.coverImage,
                isPublished: false, // Always draft
                publishedAt: null,
                isFeatured: false,
                metaTitle: sourcePost.metaTitle,
                metaDescription: sourcePost.metaDescription,
                focusKeyword: sourcePost.focusKeyword,
                author: sourcePost.author,
            },
        });

        return NextResponse.json(newPost);
    } catch (error) {
        console.error("Error duplicating blog post:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
