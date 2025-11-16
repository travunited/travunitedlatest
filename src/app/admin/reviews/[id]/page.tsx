"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, FileText, Plane, User, Mail, Calendar, Eye, EyeOff, Trash2, Save, X, ArrowLeft, Edit } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

interface Review {
  id: string;
  type: string;
  rating: number;
  comment: string;
  isVisible: boolean;
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  application?: {
    id: string;
    country: string;
    visaType: string;
  } | null;
  booking?: {
    id: string;
    tourName: string;
  } | null;
}

export default function AdminReviewDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);

  const fetchReview = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/reviews/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setReview(data);
        setNotes(data.notes || "");
      }
    } catch (error) {
      console.error("Error fetching review:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  const handleToggleVisibility = async () => {
    if (!review) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !review.isVisible }),
      });

      if (response.ok) {
        await fetchReview();
        alert(`Review ${!review.isVisible ? "shown" : "hidden"} successfully`);
      } else {
        alert("Failed to update review visibility");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!review) return;

    if (!confirm("Are you absolutely sure you want to permanently delete this review? This action cannot be undone.")) {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/admin/reviews");
      } else {
        alert("Failed to delete review");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!review) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        await fetchReview();
        setEditingNotes(false);
        alert("Notes saved successfully");
      } else {
        alert("Failed to save notes");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
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

  if (!review) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Review Not Found</h1>
            <Link href="/admin/reviews" className="text-primary-600 hover:text-primary-700">
              ← Back to Reviews
            </Link>
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
            href="/admin/reviews"
            className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-4 text-sm"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Reviews
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">
                {review.type} Review Details
              </h1>
              <p className="text-neutral-600 mt-1">
                Review ID: {review.id.slice(0, 8)}...
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                review.isVisible
                  ? "bg-green-100 text-green-700"
                  : "bg-neutral-100 text-neutral-700"
              }`}>
                {review.isVisible ? "Visible" : "Hidden"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Review Content */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center space-x-3 mb-4">
                {review.type === "VISA" ? (
                  <FileText size={24} className="text-blue-600" />
                ) : (
                  <Plane size={24} className="text-green-600" />
                )}
                <h2 className="text-xl font-bold text-neutral-900 capitalize">{review.type} Review</h2>
              </div>

              {/* Rating */}
              <div className="flex items-center space-x-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={star <= review.rating ? "text-yellow-400 fill-current" : "text-neutral-300"}
                  />
                ))}
                <span className="text-lg font-medium text-neutral-700 ml-2">{review.rating}/5</span>
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Review Comment</label>
                <p className="text-neutral-900 whitespace-pre-wrap bg-neutral-50 p-4 rounded-lg">
                  {review.comment}
                </p>
              </div>

              {/* Date */}
              <div className="flex items-center space-x-2 text-sm text-neutral-600">
                <Calendar size={16} className="text-neutral-400" />
                <span>Submitted on {formatDate(review.createdAt)} at {new Date(review.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Linked Entity */}
            {(review.application || review.booking) && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">
                  Linked {review.type === "VISA" ? "Application" : "Booking"}
                </h2>
                {review.type === "VISA" && review.application && (
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-neutral-600">Country:</span>
                      <div className="font-medium text-neutral-900">{review.application.country || "N/A"}</div>
                    </div>
                    <div>
                      <span className="text-sm text-neutral-600">Visa Type:</span>
                      <div className="font-medium text-neutral-900">{review.application.visaType || "N/A"}</div>
                    </div>
                    <Link
                      href={`/admin/applications/${review.application.id}`}
                      className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      <ArrowLeft size={16} className="rotate-180" />
                      <span>View Application</span>
                    </Link>
                  </div>
                )}
                {review.type === "TOUR" && review.booking && (
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-neutral-600">Tour Name:</span>
                      <div className="font-medium text-neutral-900">{review.booking.tourName || "N/A"}</div>
                    </div>
                    <Link
                      href={`/admin/bookings/${review.booking.id}`}
                      className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      <ArrowLeft size={16} className="rotate-180" />
                      <span>View Booking</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* User Info */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Reviewer Information</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User size={20} className="text-neutral-400" />
                  <div>
                    <div className="text-sm text-neutral-600">Name</div>
                    <div className="font-medium text-neutral-900">{review.user.name || "N/A"}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail size={20} className="text-neutral-400" />
                  <div>
                    <div className="text-sm text-neutral-600">Email</div>
                    <div className="font-medium text-neutral-900">{review.user.email}</div>
                  </div>
                </div>
                <Link
                  href={`/admin/customers/${review.user.id}`}
                  className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  <ArrowLeft size={16} className="rotate-180" />
                  <span>View Customer Profile</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleToggleVisibility}
                  disabled={updating}
                  className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                    review.isVisible
                      ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {review.isVisible ? (
                    <>
                      <EyeOff size={16} className="inline mr-2" />
                      Hide Review
                    </>
                  ) : (
                    <>
                      <Eye size={16} className="inline mr-2" />
                      Show Review
                    </>
                  )}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={updating}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 text-sm"
                >
                  <Trash2 size={16} className="inline mr-2" />
                  Delete Permanently
                </button>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900">Internal Notes</h3>
                {!editingNotes && (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 text-sm"
                  >
                    <Edit size={14} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add internal notes (e.g., 'Handled complaint via call')..."
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm mb-3"
                    rows={6}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveNotes}
                      disabled={updating}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 text-sm"
                    >
                      <Save size={14} className="inline mr-2" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingNotes(false);
                        setNotes(review.notes || "");
                      }}
                      className="px-4 py-2 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50 text-sm"
                    >
                      <X size={14} className="inline mr-2" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {review.notes ? (
                    <p className="text-sm text-neutral-900 whitespace-pre-wrap bg-neutral-50 p-3 rounded-lg">
                      {review.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-500 italic">No internal notes</p>
                  )}
                </div>
              )}
            </div>

            {/* Review Info */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Review Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-600">Type:</span>
                  <div className="font-medium capitalize">{review.type}</div>
                </div>
                <div>
                  <span className="text-neutral-600">Rating:</span>
                  <div className="font-medium">{review.rating}/5</div>
                </div>
                <div>
                  <span className="text-neutral-600">Status:</span>
                  <div className="font-medium">
                    <span className={`px-2 py-1 rounded text-xs ${
                      review.isVisible
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-700"
                    }`}>
                      {review.isVisible ? "Visible" : "Hidden"}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-neutral-600">Review ID:</span>
                  <div className="font-medium font-mono text-xs">{review.id}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

