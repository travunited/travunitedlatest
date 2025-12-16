"use client";

import { useEffect, useState, useCallback, memo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckSquare,
  Square,
  X,
  Calendar,
  Star,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

// Memoized search input to prevent focus loss
const SearchInput = memo(({ value, onChange, placeholder }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if value or onChange reference changes
  return prevProps.value === nextProps.value && 
         prevProps.placeholder === nextProps.placeholder &&
         prevProps.onChange === nextProps.onChange;
});
SearchInput.displayName = "SearchInput";


interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  category?: string | null;
  published: boolean;
  isFeatured?: boolean;
  createdAt: string;
  publishedAt?: string | null;
  updatedAt?: string;
}

type SortField = "title" | "createdAt" | "updatedAt" | "publishedAt";
type SortDirection = "asc" | "desc";

export default function AdminBlogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [publishingReady, setPublishingReady] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">(
    (searchParams.get("status") as "all" | "published" | "draft") || "all"
  );
  const [dateFilter, setDateFilter] = useState<"all" | "7days" | "30days" | "year">(
    (searchParams.get("date") as "all" | "7days" | "30days" | "year") || "all"
  );
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 20;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
      if (!isAdmin) {
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

  const handlePublishReady = async () => {
    setPublishingReady(true);
    try {
      const response = await fetch("/api/admin/content/blog/publish-ready", {
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        await fetchPosts();
        const promoted = typeof result.promoted === "number" ? result.promoted : 0;
        alert(
          promoted > 0
            ? `Published ${promoted} scheduled post${promoted === 1 ? "" : "s"}.`
            : "No scheduled posts were ready."
        );
      } else {
        alert(result.error || "Failed to publish ready posts");
      }
    } catch (error) {
      console.error("Error publishing ready blog posts:", error);
      alert("An error occurred while publishing ready posts");
    } finally {
      setPublishingReady(false);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...posts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.slug.toLowerCase().includes(query) ||
          (post.excerpt && post.excerpt.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter === "published") {
      filtered = filtered.filter((post) => post.published);
    } else if (statusFilter === "draft") {
      filtered = filtered.filter((post) => !post.published);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const cutoffDate = new Date();
      if (dateFilter === "7days") {
        cutoffDate.setDate(now.getDate() - 7);
      } else if (dateFilter === "30days") {
        cutoffDate.setDate(now.getDate() - 30);
      } else if (dateFilter === "year") {
        cutoffDate.setFullYear(now.getFullYear() - 1);
      }
      filtered = filtered.filter((post) => {
        const postDate = new Date(post.createdAt);
        return postDate >= cutoffDate;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortField === "title") {
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
      } else {
        aValue = new Date(a[sortField] || a.createdAt).getTime();
        bValue = new Date(b[sortField] || b.createdAt).getTime();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPosts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [posts, searchQuery, statusFilter, dateFilter, sortField, sortDirection]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (dateFilter !== "all") params.set("date", dateFilter);
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/admin/content/blog${newUrl}`, { scroll: false });
  }, [searchQuery, statusFilter, dateFilter, router]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedPosts.map((p) => p.id)));
    }
  };

  const handleSelectPost = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleToggleFeatured = async (post: BlogPost) => {
    try {
      const response = await fetch(`/api/admin/content/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !post.isFeatured }),
      });

      if (response.ok) {
        await fetchPosts();
      } else {
        const error = await response.json().catch(() => ({}));
        alert(error.error || "Failed to update featured status");
      }
    } catch (error) {
      console.error("Error toggling featured:", error);
      alert("An error occurred while updating");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this blog post?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/content/blog/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchPosts();
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } else {
        const error = await response.json().catch(() => ({}));
        alert(error.error || "Failed to delete blog post");
      }
    } catch (error) {
      console.error("Error deleting blog post:", error);
      alert("An error occurred while deleting");
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to permanently delete ${count} blog post(s)?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/admin/content/blog/bulk/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        await fetchPosts();
        setSelectedIds(new Set());
      } else {
        const error = await response.json().catch(() => ({}));
        alert(error.error || "Failed to delete blog posts");
      }
    } catch (error) {
      console.error("Error bulk deleting blog posts:", error);
      alert("An error occurred while deleting");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkStatusChange = async (published: boolean) => {
    if (selectedIds.size === 0) return;

    const action = published ? "publish" : "unpublish";
    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to ${action} ${count} blog post(s)?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/admin/content/blog/bulk/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), published }),
      });

      if (response.ok) {
        await fetchPosts();
        setSelectedIds(new Set());
      } else {
        const error = await response.json().catch(() => ({}));
        alert(error.error || `Failed to ${action} blog posts`);
      }
    } catch (error) {
      console.error(`Error bulk ${action}ing blog posts:`, error);
      alert(`An error occurred while ${action}ing`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp size={14} className="inline ml-1" />
    ) : (
      <ChevronDown size={14} className="inline ml-1" />
    );
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
          <h1 className="text-3xl font-bold text-neutral-900">Blog Content Management</h1>
            <p className="text-sm text-neutral-600 mt-1">
              {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""} found
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePublishReady}
              disabled={publishingReady}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              {publishingReady ? "Publishing..." : "Publish ready now"}
            </button>
            <Link
              href="/admin/content/blog/new"
              className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus size={20} />
              <span>New Post</span>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by title, slug, or excerpt..."
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50"
            >
              <Filter size={18} />
              <span>Filters</span>
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-neutral-200 grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Time</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary-900">
                {selectedIds.size} post{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkStatusChange(true)}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Publish Selected
                </button>
                <button
                  onClick={() => handleBulkStatusChange(false)}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 bg-neutral-600 text-white text-sm rounded-lg hover:bg-neutral-700 disabled:opacity-50"
                >
                  Unpublish Selected
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-1"
                >
                  <Trash2 size={14} />
                  <span>Delete Selected</span>
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 text-neutral-600 text-sm rounded-lg hover:bg-neutral-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {paginatedPosts.length > 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <button onClick={handleSelectAll} className="text-neutral-600 hover:text-neutral-900">
                        {selectedIds.size === paginatedPosts.length ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100"
                      onClick={() => handleSort("title")}
                    >
                      Title <SortIcon field="title" />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Featured</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Category</th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100"
                      onClick={() => handleSort("createdAt")}
                    >
                      Created <SortIcon field="createdAt" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 cursor-pointer hover:bg-neutral-100"
                      onClick={() => handleSort("updatedAt")}
                    >
                      Updated <SortIcon field="updatedAt" />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {paginatedPosts.map((post) => (
                    <motion.tr
                key={post.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-neutral-50"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSelectPost(post.id)}
                          className="text-neutral-600 hover:text-neutral-900"
                        >
                          {selectedIds.has(post.id) ? (
                            <CheckSquare size={18} className="text-primary-600" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-neutral-900">{post.title}</div>
                          <div className="text-xs text-neutral-500 mt-1">/{post.slug}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            post.published
                              ? "bg-green-100 text-green-700"
                              : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {post.published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleFeatured(post)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            post.isFeatured
                              ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                              : "text-neutral-500 bg-neutral-100 hover:bg-neutral-200"
                          }`}
                          title={post.isFeatured ? "Remove from homepage" : "Show on homepage"}
                        >
                          <Star size={12} className={post.isFeatured ? "fill-amber-500 text-amber-500" : ""} />
                          {post.isFeatured ? "Featured" : "Not Featured"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {post.category ? (
                        <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs">
                          {post.category}
                        </span>
                        ) : (
                          <span className="text-neutral-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {formatDate(post.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {formatDate(post.updatedAt || post.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            className="p-1.5 text-neutral-600 hover:text-primary-600 hover:bg-neutral-100 rounded"
                            title="View public page"
                          >
                            <Eye size={16} />
                          </Link>
                  <Link
                    href={`/admin/content/blog/${post.id}`}
                            className="p-1.5 text-neutral-600 hover:text-primary-600 hover:bg-neutral-100 rounded"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Link>
                          <button
                            onClick={() => handleDelete(post.id)}
                            disabled={deletingId === post.id}
                            className="p-1.5 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === post.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between">
                <div className="text-sm text-neutral-600">
                  Showing {(currentPage - 1) * postsPerPage + 1} to{" "}
                  {Math.min(currentPage * postsPerPage, filteredPosts.length)} of {filteredPosts.length} posts
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-neutral-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <div className="text-neutral-400 mb-4">
              {searchQuery || statusFilter !== "all" || dateFilter !== "all" ? (
                <>
                  <Filter size={48} className="mx-auto mb-4" />
                  <p className="text-neutral-600 mb-2">No posts match your filters</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setDateFilter("all");
                    }}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Clear all filters
                  </button>
                </>
              ) : (
                <>
                  <Edit size={48} className="mx-auto mb-4" />
            <p className="text-neutral-600 mb-4">No blog posts found</p>
            <Link
              href="/admin/content/blog/new"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus size={20} />
              <span>Create Your First Post</span>
            </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
