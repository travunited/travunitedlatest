"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Trash2, Star, FileText, Calendar, Filter, Plane, ArrowRight } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

interface Review {
  id: string;
  type: string;
  rating: number;
  comment: string;
  isVisible: boolean;
  createdAt: string;
  user: { name: string; email: string };
  application?: { id: string; country: string; visaType: string } | null;
  booking?: { id: string; tourName: string } | null;
}

export default function AdminReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [ratingFilter, setRatingFilter] = useState<string>("ALL");
  const [tourNameFilter, setTourNameFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      if (ratingFilter !== "ALL") params.append("rating", ratingFilter);
      if (tourNameFilter) params.append("tourName", tourNameFilter);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, ratingFilter, tourNameFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        router.push("/dashboard");
      } else {
        fetchReviews();
      }
    }
  }, [session, status, router, fetchReviews]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchReviews();
    }
  }, [status, fetchReviews]);

  const handleToggleVisibility = async (reviewId: string, currentVisibility: boolean) => {
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !currentVisibility }),
      });

      if (response.ok) {
        await fetchReviews();
      }
    } catch (error) {
      console.error("Error updating review visibility:", error);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to permanently delete this review? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchReviews();
      }
    } catch (error) {
      console.error("Error deleting review:", error);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Reviews Moderation</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-medium p-6 border border-neutral-200 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter size={20} className="text-neutral-400" />
            <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="ALL">All Types</option>
                <option value="VISA">Visa Reviews</option>
                <option value="TOUR">Tour Reviews</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Rating</label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="ALL">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Tour Name</label>
              <input
                type="text"
                value={tourNameFilter}
                onChange={(e) => setTourNameFilter(e.target.value)}
                placeholder="Filter by tour name..."
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-lg border p-6 hover:shadow-medium transition-shadow ${
                  !review.isVisible ? "border-neutral-200 opacity-60" : "border-neutral-200"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {review.type === "VISA" ? (
                        <FileText size={20} className="text-blue-600" />
                      ) : (
                        <Plane size={20} className="text-green-600" />
                      )}
                      <h3 className="text-lg font-semibold text-neutral-900 capitalize">
                        {review.type} Review
                      </h3>
                      {!review.isVisible && (
                        <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded">Hidden</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={18}
                          className={star <= review.rating ? "text-yellow-400 fill-current" : "text-neutral-300"}
                        />
                      ))}
                      <span className="text-sm font-medium text-neutral-700">{review.rating}/5</span>
                    </div>
                    <p className="text-neutral-700 mb-4">{review.comment}</p>
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-neutral-600 mb-4">
                      <div>
                        <span className="font-medium">By:</span> {review.user.name || review.user.email}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {formatDate(review.createdAt)}
                      </div>
                      {review.type === "VISA" && review.application && (
                        <div>
                          <span className="font-medium">Visa:</span> {review.application.country} - {review.application.visaType}
                        </div>
                      )}
                      {review.type === "TOUR" && review.booking && (
                        <div>
                          <span className="font-medium">Tour:</span> {review.booking.tourName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      href={`/admin/reviews/${review.id}`}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="View details"
                    >
                      <ArrowRight size={18} />
                    </Link>
                    <button
                      onClick={() => handleToggleVisibility(review.id, review.isVisible)}
                      className={`p-2 rounded-lg transition-colors ${
                        review.isVisible
                          ? "text-neutral-600 hover:bg-neutral-100"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                      title={review.isVisible ? "Hide review" : "Show review"}
                    >
                      {review.isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <Star size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600">No reviews found</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
