import Link from "next/link";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { formatDate } from "@/lib/dateFormat";
import { getMediaProxyUrl } from "@/lib/media";
import { getAbsoluteImageUrl } from "@/lib/og-image";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { ShareButton } from "@/components/ui/ShareButton";
import { publishReadyPosts } from "@/lib/blog/publishReady";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.id },
  });

  if (!post) {
    return {};
  }

  const now = new Date();
  const isReady = post.isPublished || (post.publishedAt && post.publishedAt <= now);

  if (!isReady) {
    return {};
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://travunited.com";
  const pageUrl = `${siteUrl}/blog/${post.slug}`;

  // Get OG image - use cover image, fallback to default
  let ogImage: string | undefined;
  if (post.coverImage) {
    const imageUrl = getMediaProxyUrl(post.coverImage);
    if (imageUrl) {
      ogImage = getAbsoluteImageUrl(imageUrl, siteUrl);
    }
  }

  // If no image, use a default OG image
  if (!ogImage) {
    ogImage = `${siteUrl}/og-default.jpg`; // You can create this default image
  }

  const title = post.title;
  const description = post.excerpt || post.content?.substring(0, 160).replace(/<[^>]*>/g, "") || `Read ${post.title} on Travunited blog`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Travunited",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      authors: ["Travunited"],
      tags: post.category ? [post.category] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: { params: { id: string } }) {
  // First, publish any scheduled posts that are ready (ensures scheduled posts are published on time)
  try {
    await publishReadyPosts();
  } catch (publishError) {
    console.error("Error auto-publishing scheduled blog posts:", publishError);
    // Continue even if publish fails
  }

  const post = await prisma.blogPost.findUnique({
    where: { slug: params.id },
  });

  if (!post) {
    notFound();
  }

  const now = new Date();
  const isReady = post.isPublished || (post.publishedAt && post.publishedAt <= now);

  if (!isReady) {
    notFound();
  }

  // Double-check: Auto-promote this specific post if it's ready (in case publishReadyPosts missed it)
  if (!post.isPublished && post.publishedAt && post.publishedAt <= now) {
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { isPublished: true },
    });
    // Refetch the post to get updated data
    const updatedPost = await prisma.blogPost.findUnique({
      where: { slug: params.id },
    });
    if (updatedPost) {
      Object.assign(post, updatedPost);
    }
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
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
            <div className="flex items-center justify-between">
              <div className="flex-1" />
              <ShareButton
                url={`/blog/${post.slug}`}
                title={post.title}
                description={post.excerpt || ""}
                image={post.coverImage ? getMediaProxyUrl(post.coverImage) : undefined}
                variant="full"
              />
            </div>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          className="prose prose-lg prose-headings:font-bold prose-headings:text-neutral-900 prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:text-neutral-700 prose-p:leading-relaxed prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-neutral-900 prose-ul:list-disc prose-ol:list-decimal prose-li:my-2 prose-blockquote:border-l-4 prose-blockquote:border-primary-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-neutral-600 prose-img:rounded-lg prose-img:shadow-medium max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        <div className="mt-8 pt-8 border-t border-neutral-200 flex items-center justify-center">
          <ShareButton
            url={`/blog/${post.slug}`}
            title={post.title}
            description={post.excerpt || ""}
            image={post.coverImage ? getMediaProxyUrl(post.coverImage) : undefined}
            variant="full"
          />
        </div>
      </article>
    </div>
  );
}

