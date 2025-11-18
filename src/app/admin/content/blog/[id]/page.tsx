"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { getMediaProxyUrl } from "@/lib/media";
import {
  getAllowedImageTypes,
  MAX_IMAGE_SIZE_BYTES,
  isValidImageType,
  isValidImageSize,
  getAllowedImageFormats,
  getMaxImageSizeDisplay,
} from "@/lib/image-upload-config";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  excerpt: string | null;
  category: string | null;
  readTime: string | null;
  content: string;
  published: boolean;
}

export default function AdminBlogEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [coverImageMode, setCoverImageMode] = useState<"url" | "upload">("url");
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: "",
    slug: "",
    coverImage: "",
    excerpt: "",
    category: "",
    readTime: "",
    content: "",
    published: false,
  });

  const fetchPost = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/content/blog/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          ...data,
          published: data.published ?? data.isPublished ?? false, // Handle both field names
          coverImage: getMediaProxyUrl(data.coverImage),
        });
        if (data.coverImage && !data.coverImage.startsWith("http")) {
          setCoverImageMode("upload");
        } else if (data.coverImage) {
          setCoverImageMode("url");
        }
      }
    } catch (error) {
      console.error("Error fetching blog post:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
      if (!isSuperAdmin) {
        router.push("/admin");
      } else if (!isNew) {
        fetchPost();
      } else {
        setLoading(false);
      }
    }
  }, [session, status, router, isNew, fetchPost]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleCoverImageUpload = async (file: File | null) => {
    if (!file) return;
    
    // Frontend validation: Check file type
    if (!isValidImageType(file.type)) {
      const allowedFormats = getAllowedImageFormats().join(", ");
      alert(`Invalid file type. Only ${allowedFormats} images are allowed.`);
      return;
    }
    
    // Frontend validation: Check file size
    if (!isValidImageSize(file.size)) {
      alert(`Image too large. Maximum allowed size is ${getMaxImageSizeDisplay()}.`);
      return;
    }

    setCoverUploading(true);
    setCoverUploadError(null);
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("folder", "blog");
      payload.append("scope", "cover");

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to upload image");
      }

      const data = await response.json();
      // Use proxyUrl directly if available, otherwise proxy the raw URL
      const imageUrl = data.proxyUrl || getMediaProxyUrl(data.url);
      if (!imageUrl) {
        throw new Error("No image URL returned from upload");
      }
      console.log("Upload successful, image URL:", imageUrl);
      setFormData((prev) => ({
        ...prev,
        coverImage: imageUrl,
      }));
      setCoverImageMode("upload");
    } catch (error: any) {
      console.error("Cover upload failed", error);
      setCoverUploadError(error.message || "Failed to upload image");
    } finally {
      setCoverUploading(false);
    }
  };

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: isNew ? generateSlug(title) : formData.slug,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isNew
        ? "/api/admin/content/blog"
        : `/api/admin/content/blog/${params.id}`;
      const method = isNew ? "POST" : "PUT";

      // Prepare form data, converting empty strings to undefined for coverImage
      const submitData = {
        ...formData,
        coverImage: formData.coverImage && formData.coverImage.trim() ? formData.coverImage.trim() : undefined,
      };

      console.log("Submitting blog post with coverImage:", submitData.coverImage);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        router.push("/admin/content/blog");
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Failed to save blog post");
      }
    } catch (error) {
      console.error("Error saving blog post:", error);
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/admin/content/blog"
            className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-4 text-sm"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Blog
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900">
            {isNew ? "Create New Blog Post" : "Edit Blog Post"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Post Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ""}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter blog post title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug || ""}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                    placeholder="blog-post-slug"
                  />
                  <p className="text-xs text-neutral-500 mt-1">URL-friendly identifier (auto-generated from title)</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-neutral-700">
                      Cover Image
                    </label>
                    <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setCoverImageMode("url")}
                        className={`px-3 py-1.5 ${
                          coverImageMode === "url" ? "bg-primary-600 text-white" : "text-neutral-600"
                        }`}
                      >
                        Use URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverImageMode("upload")}
                        className={`px-3 py-1.5 ${
                          coverImageMode === "upload"
                            ? "bg-primary-600 text-white"
                            : "text-neutral-600"
                        }`}
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                  {coverImageMode === "url" ? (
                    <input
                      type="url"
                      value={formData.coverImage || ""}
                      onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="https://..."
                    />
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept={getAllowedImageTypes().join(",")}
                        onChange={(e) => handleCoverImageUpload(e.target.files?.[0] || null)}
                        className="w-full px-4 py-3 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 hover:border-primary-400 cursor-pointer"
                      />
                      <p className="text-xs text-neutral-500">
                        Allowed formats: {getAllowedImageFormats().join(", ")}. Max size: {getMaxImageSizeDisplay()}.
                      </p>
                      {coverUploading && (
                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                          <Loader2 size={16} className="animate-spin" />
                          Uploading cover image...
                        </div>
                      )}
                      {coverUploadError && (
                        <p className="text-sm text-red-600">{coverUploadError}</p>
                      )}
                    </div>
                  )}
                  {formData.coverImage && (
                    <div className="mt-3 relative w-full h-48">
                      <Image
                        src={getMediaProxyUrl(formData.coverImage)}
                        alt="Cover preview"
                        fill
                        unoptimized
                        className="object-cover rounded-lg border border-neutral-200"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Excerpt / Summary</label>
                  <textarea
                    value={formData.excerpt || ""}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Short summary shown on listings..."
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Category</label>
                    <input
                      type="text"
                      value={formData.category || ""}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Visa Guide, Travel Tips..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Read Time</label>
                    <input
                      type="text"
                      value={formData.readTime || ""}
                      onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., 6 min read"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                content={formData.content || ""}
                onChange={(html) => setFormData({ ...formData, content: html })}
                placeholder="Start writing your blog post..."
              />
              <p className="text-xs text-neutral-500 mt-2">
                Use the toolbar above to format your content. Images must be PNG or JPG, max 5 MB.
              </p>
            </div>

            {/* Publish Status */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.published ?? false}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-700">
                  Publish this post
                </span>
              </label>
              <p className="text-xs text-neutral-500 mt-1">
                Unpublished posts are saved as drafts and won&rsquo;t appear on the public blog
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              href="/admin/content/blog"
              className="px-6 py-2 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Save size={16} />
              <span>{saving ? "Saving..." : "Save Post"}</span>
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

