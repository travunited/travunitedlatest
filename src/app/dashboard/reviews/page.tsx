"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Star, MessageSquare, FileText, Calendar, Plus } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";

interface Review {
  id: string;
  type: "visa" | "tour";
  title: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchReviews();
    }
  }, [sessionStatus]);

  const fetchReviews = async () => {
    try {
      const response = await fetch("/api/reviews");
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
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
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl font-bold text-neutral-900">My Reviews</h1>
            <Link
              href="/dashboard/reviews/new"
              className="inline-flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700"
            >
              <Plus size={16} />
              <span>Write a Review</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-neutral-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {review.type === "visa" ? (
                        <FileText size={20} className="text-blue-600" />
                      ) : (
                        <Calendar size={20} className="text-green-600" />
                      )}
                      <h3 className="font-semibold text-neutral-900">{review.title}</h3>
                      <span className="text-xs text-neutral-500 capitalize">({review.type})</span>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className={star <= review.rating ? "text-yellow-400 fill-current" : "text-neutral-300"}
                        />
                      ))}
                      <span className="text-sm text-neutral-600 ml-2">{review.rating}/5</span>
                    </div>
                    <p className="text-neutral-700 mb-2">{review.comment}</p>
                    <p className="text-xs text-neutral-500">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <MessageSquare size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 mb-4">You haven&rsquo;t written any reviews yet</p>
            <p className="text-sm text-neutral-500 mb-6">
              Reviews can be written after completing a visa application or tour booking.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <span>Go to Dashboard</span>
              <ArrowLeft size={20} className="rotate-180" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

