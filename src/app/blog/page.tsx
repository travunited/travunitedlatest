import React, { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Travel Blog – Visa Tips, Destination Guides & Travel Advice",
  description:
    "Expert travel tips, visa guides, destination reviews and packing advice from the Travunited team. Stay informed before your next international trip.",
  openGraph: {
    title: "Travel Blog – Visa Tips, Destination Guides & Travel Advice",
    description: "Expert travel tips, visa guides and destination reviews from Travunited.",
    url: "https://travunited.in/blog",
    siteName: "Travunited",
    images: [{ url: "https://travunited.in/og-default.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel Blog – Visa Tips, Destination Guides & Travel Advice",
    description: "Expert travel tips, visa guides and destination reviews from Travunited.",
    images: ["https://travunited.in/og-default.png"],
  },
};
import { BlogClient } from "./BlogClient";
import { getMediaProxyUrl } from "@/lib/media";
import { Prisma } from "@prisma/client";
import { publishReadyPosts } from "@/lib/blog/publishReady";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BlogPage() {
  let posts: Prisma.BlogPostGetPayload<{}>[] = [];
  try {
    // First, publish any scheduled posts that are ready (runs before fetching)
    try {
      await publishReadyPosts();
    } catch (publishError) {
      console.error("Error auto-publishing scheduled blog posts:", publishError);
      // Continue even if publish fails - don't block page rendering
    }

    const now = new Date();
    
    // Fetch posts that are published (scheduled posts are now promoted)
    posts = await prisma.blogPost.findMany({
      where: {
        isPublished: true,
      },
      orderBy: { publishedAt: "desc" },
    });
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
      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-neutral-500">Loading articles...</div>}>
        <BlogClient posts={serialized} />
      </Suspense>
    </div>
  );
}
