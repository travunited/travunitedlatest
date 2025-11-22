import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/dateFormat";
import { getMediaProxyUrl } from "@/lib/media";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

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
      <div className="relative h-[400px] md:h-[500px] bg-neutral-100">
        <ImageWithFallback
          src={
            getMediaProxyUrl(post.coverImage) ||
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80"
          }
          alt={post.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
          fallbackSrc="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80"
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
          className="prose prose-lg prose-headings:font-bold prose-headings:text-neutral-900 prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:text-neutral-700 prose-p:leading-relaxed prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-neutral-900 prose-ul:list-disc prose-ol:list-decimal prose-li:my-2 prose-blockquote:border-l-4 prose-blockquote:border-primary-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-neutral-600 prose-img:rounded-lg prose-img:shadow-medium max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  );
}

