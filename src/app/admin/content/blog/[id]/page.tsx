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
  // SEO & Metadata
  metaTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  status?: string | null;
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

  // SessionStorage key for draft persistence
  const draftKey = isNew ? `blogDraft:new` : `blogDraft:${params.id}`;

  // Load draft from sessionStorage on mount
  const loadDraft = useCallback((): Partial<BlogPost> | null => {
    if (typeof window === "undefined") return null;
    try {
      const draft = sessionStorage.getItem(draftKey);
      if (draft) {
        return JSON.parse(draft);
      }
    } catch (error) {
      console.error("Error loading draft from sessionStorage:", error);
    }
    return null;
  }, [draftKey]);

  // Save draft to sessionStorage (debounced)
  const saveDraftDebounced = useCallback((data: Partial<BlogPost>) => {
    if (typeof window === "undefined") return;
    
    const timeoutId = setTimeout(() => {
      try {
        sessionStorage.setItem(draftKey, JSON.stringify(data));
      } catch (error) {
        console.error("Error saving draft to sessionStorage:", error);
      }
    }, 500); // Debounce 500ms
    
    return () => clearTimeout(timeoutId);
  }, [draftKey]);

  // Clear draft from sessionStorage
  const clearDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(draftKey);
      } catch (error) {
        console.error("Error clearing draft from sessionStorage:", error);
      }
    }
  }, [draftKey]);

  const [formData, setFormData] = useState<Partial<BlogPost>>(() => {
    // Try to load from draft first
    const draft = loadDraft();
    if (draft) {
      return {
        title: "",
        slug: "",
        coverImage: "",
        excerpt: "",
        category: "",
        readTime: "",
        content: "",
        published: false,
        metaTitle: "",
        metaDescription: "",
        focusKeyword: "",
        author: "",
        status: "DRAFT",
        publishedAt: null,
        updatedAt: null,
        ...draft, // Override with draft data
      };
    }
    return {
      title: "",
      slug: "",
      coverImage: "",
      excerpt: "",
      category: "",
      readTime: "",
      content: "",
      published: false,
      metaTitle: "",
      metaDescription: "",
      focusKeyword: "",
      author: "",
      status: "DRAFT",
      publishedAt: null,
      updatedAt: null,
    };
  });

  // Save to sessionStorage whenever formData changes
  useEffect(() => {
    saveDraftDebounced(formData);
  }, [formData, saveDraftDebounced]);

  const fetchPost = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/content/blog/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        const serverData = {
          ...data,
          published: data.published ?? data.isPublished ?? false, // Handle both field names
          coverImage: getMediaProxyUrl(data.coverImage),
          metaTitle: data.metaTitle || "",
          metaDescription: data.metaDescription || "",
          focusKeyword: data.focusKeyword || "",
          author: data.author || "",
          status: data.status || "DRAFT",
          publishedAt: data.publishedAt ? new Date(data.publishedAt).toISOString().slice(0, 16) : null, // Keep datetime for scheduled posts
          updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString().split('T')[0] : null,
          createdAt: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : null,
        };
        
        // Merge with draft if it exists (draft takes precedence)
        const draft = loadDraft();
        if (draft) {
          setFormData({ ...serverData, ...draft });
        } else {
          setFormData(serverData);
        }
        
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
  }, [params.id, loadDraft]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        router.push("/admin");
      } else if (!isNew) {
        fetchPost();
      } else {
        setLoading(false);
      }
    }
  }, [session, status, router, isNew, fetchPost]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if there's a draft (indicating unsaved changes)
      const draft = loadDraft();
      if (draft) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [loadDraft]);

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

      // Prepare form data, ensuring all fields are properly formatted
      // Only include fields that have actual values (not empty strings)
      const submitData: any = {};
      
      if (formData.title && formData.title.trim()) {
        submitData.title = formData.title.trim();
      }
      if (formData.slug && formData.slug.trim()) {
        submitData.slug = formData.slug.trim();
      }
      if (formData.content && formData.content.trim()) {
        submitData.content = formData.content.trim();
      }
      if (formData.excerpt && formData.excerpt.trim()) {
        submitData.excerpt = formData.excerpt.trim();
      }
      if (formData.category && formData.category.trim()) {
        submitData.category = formData.category.trim();
      }
      if (formData.readTime && formData.readTime.trim()) {
        submitData.readTime = formData.readTime.trim();
      }
      if (formData.coverImage && formData.coverImage.trim()) {
        submitData.coverImage = formData.coverImage.trim();
      }
      // Published is a boolean, so include it if it's explicitly set
      if (formData.published !== undefined && formData.published !== null) {
        submitData.published = formData.published;
      }
      // SEO & Metadata fields
      if (formData.metaTitle && formData.metaTitle.trim()) {
        submitData.metaTitle = formData.metaTitle.trim();
      } else {
        submitData.metaTitle = null;
      }
      if (formData.metaDescription && formData.metaDescription.trim()) {
        submitData.metaDescription = formData.metaDescription.trim();
      } else {
        submitData.metaDescription = null;
      }
      if (formData.focusKeyword && formData.focusKeyword.trim()) {
        submitData.focusKeyword = formData.focusKeyword.trim();
      } else {
        submitData.focusKeyword = null;
      }
      if (formData.author && formData.author.trim()) {
        submitData.author = formData.author.trim();
      } else {
        submitData.author = null;
      }
      if (formData.status) {
        submitData.status = formData.status;
      }
      if (formData.publishedAt) {
        // For scheduled posts, ensure we send full datetime
        if (formData.status === "SCHEDULED") {
          submitData.publishedAt = new Date(formData.publishedAt).toISOString();
        } else {
          submitData.publishedAt = formData.publishedAt;
        }
      }

      console.log("Submitting blog post:", {
        ...submitData,
        contentLength: submitData.content?.length || 0,
      });

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        // Clear draft on successful save
        clearDraft();
        router.push("/admin/content/blog");
      } else {
        let errorData: any = {};
        try {
          const text = await response.text();
          console.error("Blog save error response (raw):", text);
          errorData = JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse error response:", e);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error("Blog save error (parsed):", errorData);
        console.error("Request payload that failed:", submitData);
        
        // Show detailed validation errors if available
        if (errorData.details && Array.isArray(errorData.details)) {
          const errorMessages = errorData.details.map((d: any) => {
            const received = d.received !== undefined ? ` (received: ${JSON.stringify(d.received)})` : '';
            return `${d.field}: ${d.message}${received}`;
          }).join('\n');
          alert(`Validation failed:\n\n${errorMessages}\n\n${errorData.error || "Failed to save blog post"}`);
        } else {
          alert(errorData.error || `Failed to save blog post (HTTP ${response.status})`);
        }
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, coverImage: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Visa Guide, Travel Tips..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Read Time</label>
                    <input
                      type="text"
                      value={formData.readTime || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, readTime: e.target.value }))}
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
                onChange={(html) => setFormData((prev) => ({ ...prev, content: html }))}
                placeholder="Start writing your blog post..."
              />
              <p className="text-xs text-neutral-500 mt-2">
                Use the toolbar above to format your content. Images must be PNG or JPG, max 5 MB.
              </p>
            </div>

            {/* SEO & Metadata */}
            <div className="border-t border-neutral-200 pt-6">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">SEO & Metadata</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={formData.metaTitle || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="SEO title for search engines..."
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Recommended: 50-60 characters. If empty, the post title will be used.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={formData.metaDescription || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="SEO description for search engines..."
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Recommended: 150-160 characters. If empty, the excerpt will be used.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Focus Keyword
                  </label>
                  <input
                    type="text"
                    value={formData.focusKeyword || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, focusKeyword: e.target.value }))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Primary keyword for SEO..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Author
                  </label>
                  <input
                    type="text"
                    value={formData.author || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, author: e.target.value }))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Author name..."
                  />
                </div>
              </div>
            </div>

            {/* Publishing & Status */}
            <div className="border-t border-neutral-200 pt-6">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Publishing</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || "DRAFT"}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      let newPublishedAt = formData.publishedAt;
                      
                      if (newStatus === "PUBLISHED" && !formData.publishedAt) {
                        // Set to now for immediate publish
                        newPublishedAt = new Date().toISOString().slice(0, 16);
                      } else if (newStatus === "SCHEDULED" && !formData.publishedAt) {
                        // Set to tomorrow at 9 AM for scheduled posts
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(9, 0, 0, 0);
                        newPublishedAt = tomorrow.toISOString().slice(0, 16);
                      }
                      
                      setFormData((prev) => ({ 
                        ...prev, 
                        status: newStatus,
                        published: newStatus === "PUBLISHED",
                        publishedAt: newPublishedAt
                      }));
                    }}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="SCHEDULED">Scheduled</option>
                  </select>
                </div>
                {(formData.status === "PUBLISHED" || formData.status === "SCHEDULED") && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      {formData.status === "SCHEDULED" ? "Scheduled Date & Time" : "Published Date"}
                    </label>
                    {formData.status === "SCHEDULED" ? (
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={formData.publishedAt ? formData.publishedAt.split('T')[0] : ""}
                          onChange={(e) => {
                            const date = e.target.value;
                            const existingDateTime = formData.publishedAt ? new Date(formData.publishedAt) : new Date();
                            const time = existingDateTime.toTimeString().slice(0, 5); // HH:mm
                            setFormData((prev) => ({ 
                              ...prev, 
                              publishedAt: date ? `${date}T${time}` : null 
                            }));
                          }}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                        <input
                          type="time"
                          value={formData.publishedAt ? new Date(formData.publishedAt).toTimeString().slice(0, 5) : ""}
                          onChange={(e) => {
                            const time = e.target.value;
                            const existingDate = formData.publishedAt ? formData.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0];
                            setFormData((prev) => ({ 
                              ...prev, 
                              publishedAt: existingDate ? `${existingDate}T${time}` : null 
                            }));
                          }}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                        {formData.publishedAt && new Date(formData.publishedAt) <= new Date() && (
                          <p className="text-xs text-red-600">
                            Scheduled time must be in the future
                          </p>
                        )}
                      </div>
                    ) : (
                      <input
                        type="date"
                        value={formData.publishedAt ? formData.publishedAt.split('T')[0] : ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, publishedAt: e.target.value }))}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    )}
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Created Date
                    </label>
                    <input
                      type="date"
                      value={formData.createdAt ? new Date(formData.createdAt).toISOString().split('T')[0] : ""}
                      disabled
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Auto-generated</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Last Updated
                    </label>
                    <input
                      type="date"
                      value={formData.updatedAt || ""}
                      disabled
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Auto-updated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                if (confirm("Discard unsaved changes?")) {
                  clearDraft();
                  router.push("/admin/content/blog");
                }
              }}
              className="px-6 py-2 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50"
            >
              Cancel
            </button>
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

