"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, Calendar, ArrowRight, Tag } from "lucide-react";
import Image from "next/image";
import { formatDate } from "@/lib/dateFormat";
import { getMediaProxyUrl } from "@/lib/media";
import { shouldUseUnoptimizedImage } from "@/lib/image-helpers";
import { ShareButton } from "@/components/ui/ShareButton";
import { useDebounce } from "@/hooks/useDebounce";

export type BlogClientPost = {
  id: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  category?: string | null;
  readTime?: string | null;
  publishedAt?: string | null;
};

const fallbackPosts: BlogClientPost[] = [
  {
    id: "visa-guide-2024",
    title: "Complete Guide to Schengen Visa for Indians in 2024",
    excerpt:
      "Everything you need to know about applying for a Schengen visa, including documents, processing time, and tips for approval.",
    coverImage: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&q=80",
    category: "Visa Guide",
    publishedAt: "2024-03-15",
    readTime: "8 min read",
  },
];

export function BlogClient({ posts }: { posts: BlogClientPost[] }) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const displayPosts = posts.length ? posts : fallbackPosts;

  const categories = useMemo(() => {
    const set = new Set<string>();
    displayPosts.forEach((post) => {
      if (post.category) {
        set.add(post.category);
      }
    });
    return ["All", ...Array.from(set)];
  }, [displayPosts]);

  const filteredPosts = useMemo(() => {
    return displayPosts.filter((post) => {
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    const matchesSearch =
        !debouncedSearchQuery ||
        post.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (post.excerpt || "").toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  }, [displayPosts, selectedCategory, debouncedSearchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto" style={{ touchAction: "pan-x" }}>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? "bg-primary-600 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="group select-none"
          >
            <Link href={`/blog/${post.id}`}>
              <div className="bg-white rounded-2xl shadow-medium hover:shadow-large transition-shadow duration-300 overflow-hidden border border-neutral-200">
                <div className="aspect-[16/9] relative bg-neutral-100">
                  <Image
                    src={
                      getMediaProxyUrl(post.coverImage) ||
                      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80"
                    }
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    unoptimized={shouldUseUnoptimizedImage(post.coverImage) || true}
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.onerror = null; // Prevent infinite loop
                      target.src = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80";
                    }}
                  />
                  {post.category && (
                    <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                      <Tag size={12} />
                      <span>{post.category}</span>
                    </div>
                  )}
                  <div 
                    className="absolute top-4 right-4 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ShareButton
                      url={`/blog/${post.id}`}
                      title={post.title}
                      description={post.excerpt || ""}
                      variant="icon-only"
                    />
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center text-neutral-500 text-sm mb-3 space-x-2">
                    <Calendar size={14} />
                    <span>
                      {post.publishedAt
                        ? formatDate(post.publishedAt)
                        : "Upcoming"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-neutral-600 mb-4 line-clamp-3">{post.excerpt || "Read the full story →"}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-primary-600 font-medium group-hover:translate-x-1 transition-transform">
                      <span className="text-sm">Read More</span>
                      <ArrowRight size={16} className="ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-600 text-lg">No articles found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

