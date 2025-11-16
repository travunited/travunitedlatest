"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Edit, BookOpen } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  category?: string | null;
  published: boolean;
  createdAt: string;
  publishedAt?: string | null;
}

export default function AdminBlogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
      if (!isSuperAdmin) {
        router.push("/admin");
      } else {
        fetchPosts();
      }
    }
  }, [session, status, router]);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/admin/content/blog");
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Blog Content Management</h1>
          <Link
            href="/admin/content/blog/new"
            className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            <span>New Post</span>
          </Link>
        </div>
        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-medium transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-1">{post.title}</h3>
                    <p className="text-sm text-neutral-600 mb-3 line-clamp-2">{post.excerpt || "No summary provided."}</p>
                    <div className="flex items-center flex-wrap gap-3 text-sm text-neutral-600">
                      <span>Slug: {post.slug}</span>
                      {post.category && (
                        <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs">
                          {post.category}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        post.published ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-700"
                      }`}>
                        {post.published ? "Published" : "Draft"}
                      </span>
                      <span>
                        {post.published && post.publishedAt
                          ? formatDate(post.publishedAt)
                          : formatDate(post.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/admin/content/blog/${post.id}`}
                    className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium text-sm ml-4"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <BookOpen size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 mb-4">No blog posts found</p>
            <Link
              href="/admin/content/blog/new"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus size={20} />
              <span>Create Your First Post</span>
            </Link>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

