import { prisma } from "@/lib/prisma";
import { BlogClient } from "./BlogClient";
import { getMediaProxyUrl } from "@/lib/media";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BlogPage() {
  let posts: Prisma.BlogPostGetPayload<{}>[] = [];
  try {
    const now = new Date();
    
    // Fetch posts that are published OR scheduled posts that are ready
    posts = await prisma.blogPost.findMany({
      where: {
        OR: [
          { isPublished: true },
          {
            // Scheduled posts that are ready (publishedAt <= now)
            isPublished: false,
            publishedAt: { lte: now },
          },
        ],
      },
      orderBy: { publishedAt: "desc" },
    });

    // Auto-promote scheduled posts that are ready
    const readyScheduledPosts = posts.filter(
      (post) => !post.isPublished && post.publishedAt && post.publishedAt <= now
    );

    if (readyScheduledPosts.length > 0) {
      await prisma.blogPost.updateMany({
        where: {
          id: { in: readyScheduledPosts.map((p) => p.id) },
        },
        data: {
          isPublished: true,
        },
      });

      // Update the posts array to reflect the change
      posts = posts.map((post) =>
        readyScheduledPosts.some((p) => p.id === post.id)
          ? { ...post, isPublished: true }
          : post
      );
    }
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    // Continue with empty array
  }

  const serialized = posts.map((post) => ({
    id: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: getMediaProxyUrl(post.coverImage),
    category: post.category,
    readTime: post.readTime,
    publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
  }));

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-sm uppercase tracking-widest text-white/70">Insights & Inspiration</p>
          <h1 className="text-4xl md:text-5xl font-bold">Travel Blog & Guides</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Expert tips, guides, and insights to make your travel planning easier
          </p>
        </div>
      </div>
      <BlogClient posts={serialized} />
    </div>
  );
}
