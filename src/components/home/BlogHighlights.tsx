"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import Image from "next/image";
import { formatDate } from "@/lib/dateFormat";
import { getMediaProxyUrl } from "@/lib/media";
import { shouldUseUnoptimizedImage } from "@/lib/image-helpers";

type HighlightPost = {
  id: string;
  title: string;
  excerpt?: string | null;
  image?: string | null;
  date?: string | null;
  category?: string | null;
};


export function BlogHighlights({ posts }: { posts?: HighlightPost[] }) {
  // Only show if we have posts from database, no fallback
  if (!posts || posts.length === 0) {
    return null;
  }
  
  const displayPosts = posts.slice(0, 3);

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex justify-between items-center mb-12"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Travel Insights & Guides
            </h2>
            <p className="text-lg text-neutral-600">
              Expert tips and guides to make your travel planning easier
            </p>
          </div>
          <Link
            href="/blog"
            className="hidden md:flex items-center space-x-2 text-primary-600 font-medium hover:text-primary-700"
          >
            <span>View All</span>
            <ArrowRight size={20} />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Link href={`/blog/${post.id}`}>
                <div className="bg-white rounded-2xl shadow-medium hover:shadow-large transition-shadow duration-300 overflow-hidden">
                  <div className="aspect-[16/9] relative">
                    <Image
                      src={
                      getMediaProxyUrl(post.image) ||
                      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80"
                    }
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      unoptimized={shouldUseUnoptimizedImage(post.image) || true}
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop
                        target.src = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80";
                      }}
                    />
                    {post.category && (
                      <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                        {typeof post.category === 'string' ? post.category : String(post.category)}
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center text-neutral-500 text-sm mb-3">
                      <Calendar size={14} className="mr-2" />
                      <span>
                        {post.date ? formatDate(post.date) : "Featured"}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-neutral-600 mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center text-primary-600 font-medium group-hover:translate-x-1 transition-transform">
                      <span className="text-sm">Read More</span>
                      <ArrowRight size={16} className="ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8 md:hidden"
        >
          <Link
            href="/blog"
            className="inline-flex items-center space-x-2 text-primary-600 font-medium"
          >
            <span>View All Posts</span>
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

