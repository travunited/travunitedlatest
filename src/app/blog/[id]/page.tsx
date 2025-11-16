import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/dateFormat";

export default async function BlogPostPage({ params }: { params: { id: string } }) {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.id },
  });

  if (!post || !post.isPublished) {
    notFound();
  }

  const publishedDate = formatDate(post.publishedAt ?? post.createdAt);

  return (
    <div className="min-h-screen bg-white">
      <div className="relative h-[400px] md:h-[500px]">
        <Image
          src={
            post.coverImage ||
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80"
          }
          alt={post.title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/blog"
              className="inline-flex items-center text-white/80 hover:text-white mb-4 text-sm"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back to Blog
            </Link>
            <div className="flex items-center space-x-4 text-white/80 text-sm mb-4">
              {post.category && (
                <div className="flex items-center">
                  <Tag size={16} className="mr-2" />
                  <span>{post.category}</span>
                </div>
              )}
              <div className="flex items-center">
                <Calendar size={16} className="mr-2" />
                <span>{publishedDate}</span>
              </div>
              {post.readTime && (
                <div className="flex items-center">
                  <Clock size={16} className="mr-2" />
                  <span>{post.readTime}</span>
                </div>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">{post.title}</h1>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  );
}

