"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Star, Plus, Edit2, Trash2, ExternalLink, Image as ImageIcon, X } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";
import { getMediaProxyUrl } from "@/lib/media";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface HomepageReview {
  id: string;
  reviewerName: string | null;
  title: string | null;
  comment: string;
  rating: number;
  imageKey: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isVisible: boolean;
  link: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminHomepageReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<HomepageReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReview, setEditingReview] = useState<HomepageReview | null>(null);
  const [formData, setFormData] = useState({
    reviewerName: "",
    title: "",
    comment: "",
    rating: 5,
    imageKey: "",
    imageUrl: "",
    isFeatured: false,
    isVisible: true,
    link: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
      if (!isSuperAdmin) {
        router.push("/admin");
      } else {
        fetchReviews();
      }
    }
  }, [session, status, router]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/reviews/homepage");
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error("Error fetching homepage reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (review?: HomepageReview) => {
    if (review) {
      setEditingReview(review);
      setFormData({
        reviewerName: review.reviewerName || "",
        title: review.title || "",
        comment: review.comment,
        rating: review.rating,
        imageKey: review.imageKey || "",
        imageUrl: review.imageUrl || "",
        isFeatured: review.isFeatured,
        isVisible: review.isVisible,
        link: review.link || "",
      });
    } else {
      setEditingReview(null);
      setFormData({
        reviewerName: "",
        title: "",
        comment: "",
        rating: 5,
        imageKey: "",
        imageUrl: "",
        isFeatured: false,
        isVisible: true,
        link: "",
      });
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingReview(null);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.reviewerName.trim()) {
      newErrors.reviewerName = "Reviewer name is required";
    }
    
    if (!formData.comment.trim() || formData.comment.length < 10) {
      newErrors.comment = "Comment must be at least 10 characters";
    }
    
    if (formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = "Rating must be between 1 and 5";
    }
    
    if (formData.link && formData.link.trim()) {
      try {
        const url = new URL(formData.link);
        if (!["http:", "https:"].includes(url.protocol)) {
          newErrors.link = "Link must be http:// or https://";
        }
      } catch {
        newErrors.link = "Invalid URL format";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "reviews");
      formData.append("scope", "homepage");
      
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          imageKey: data.key || "",
          imageUrl: data.proxyUrl || data.url || "",
        }));
      } else {
        const error = await response.json();
        setErrors(prev => ({ ...prev, image: error.error || "Failed to upload image" }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, image: "Failed to upload image" }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const url = editingReview
        ? `/api/admin/reviews/homepage/${editingReview.id}`
        : "/api/admin/reviews/homepage";
      
      const method = editingReview ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          link: formData.link.trim() || null,
          imageKey: formData.imageKey || null,
          imageUrl: formData.imageUrl || null,
        }),
      });

      if (response.ok) {
        await fetchReviews();
        handleCloseModal();
      } else {
        const error = await response.json();
        setErrors({ submit: error.error || "Failed to save review" });
      }
    } catch (error) {
      setErrors({ submit: "An error occurred. Please try again." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this homepage review? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/reviews/homepage/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchReviews();
      } else {
        alert("Failed to delete review");
      }
    } catch (error) {
      alert("An error occurred");
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Homepage Reviews</h1>
            <p className="text-neutral-600 mt-2">Manage reviews displayed on the homepage</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            <span>Create Review</span>
          </button>
        </div>

        {/* Reviews Table */}
        {reviews.length > 0 ? (
          <div className="bg-white rounded-lg shadow-medium border border-neutral-200 overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Reviewer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Featured</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Link</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {review.imageKey || review.imageUrl ? (
                          <Image
                            src={review.imageKey ? getMediaProxyUrl(review.imageKey) : review.imageUrl || ""}
                            alt={review.reviewerName || "Reviewer"}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
                            <Star size={20} className="text-neutral-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-neutral-900">{review.reviewerName || "Unknown"}</div>
                          <div className="text-xs text-neutral-500">{formatDate(review.createdAt)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-neutral-900">{review.title || "—"}</div>
                      <div className="text-xs text-neutral-500 line-clamp-1">{review.comment}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={star <= review.rating ? "text-yellow-400 fill-current" : "text-neutral-300"}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        review.isFeatured ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
                      }`}>
                        {review.isFeatured ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        review.isVisible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {review.isVisible ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {review.link ? (
                        <a
                          href={review.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 inline-flex items-center space-x-1"
                        >
                          <span className="text-sm">View</span>
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        <span className="text-neutral-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenModal(review)}
                          className="text-primary-600 hover:text-primary-700 p-2 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <Star size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 mb-4">No homepage reviews yet</p>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus size={20} />
              <span>Create Your First Review</span>
            </button>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-neutral-900">
                  {editingReview ? "Edit Review" : "Create Review"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Reviewer Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Reviewer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.reviewerName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reviewerName: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      errors.reviewerName ? "border-red-300" : "border-neutral-300"
                    }`}
                    placeholder="John Doe"
                  />
                  {errors.reviewerName && (
                    <p className="mt-1 text-sm text-red-600">{errors.reviewerName}</p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Great experience!"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Review Text <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData((prev) => ({ ...prev, comment: e.target.value }))}
                    rows={4}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      errors.comment ? "border-red-300" : "border-neutral-300"
                    }`}
                    placeholder="Write the review text here..."
                  />
                  {errors.comment && (
                    <p className="mt-1 text-sm text-red-600">{errors.comment}</p>
                  )}
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
                        className="focus:outline-none"
                      >
                        <Star
                          size={32}
                          className={star <= formData.rating ? "text-yellow-400 fill-current" : "text-neutral-300"}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-neutral-600">{formData.rating}/5</span>
                  </div>
                  {errors.rating && (
                    <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
                  )}
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Reviewer Image
                  </label>
                  <div className="flex items-center space-x-4">
                    {(formData.imageKey || formData.imageUrl) && (
                      <Image
                        src={formData.imageKey ? getMediaProxyUrl(formData.imageKey) : formData.imageUrl || ""}
                        alt="Reviewer"
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-full object-cover border border-neutral-300"
                        unoptimized
                      />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                        disabled={uploadingImage}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className={`inline-flex items-center space-x-2 px-4 py-2 border border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors ${
                          uploadingImage ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <ImageIcon size={20} />
                        <span>{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                      </label>
                      {formData.imageUrl && !formData.imageKey && (
                        <input
                          type="url"
                          value={formData.imageUrl}
                          onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                          placeholder="Or enter image URL"
                          className="mt-2 w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      )}
                    </div>
                  </div>
                  {errors.image && (
                    <p className="mt-1 text-sm text-red-600">{errors.image}</p>
                  )}
                </div>

                {/* Link */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Link (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData((prev) => ({ ...prev, link: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                      errors.link ? "border-red-300" : "border-neutral-300"
                    }`}
                    placeholder="https://example.com"
                  />
                  <p className="mt-1 text-xs text-neutral-500">http:// or https:// required — leave blank if not needed</p>
                  {errors.link && (
                    <p className="mt-1 text-sm text-red-600">{errors.link}</p>
                  )}
                </div>

                {/* Flags */}
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">Featured (show on homepage)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVisible}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isVisible: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">Active</span>
                  </label>
                </div>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {editingReview ? "Update Review" : "Create Review"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

