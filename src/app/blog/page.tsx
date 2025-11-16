import { prisma } from "@/lib/prisma";
import { BlogClient } from "./BlogClient";

export const revalidate = 300;

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
  });

  const serialized = posts.map((post) => ({
    id: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
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
