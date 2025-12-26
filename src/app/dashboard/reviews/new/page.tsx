"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function NewReviewContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = (searchParams?.get("type") || "visa").toLowerCase();
  const targetId = searchParams?.get("id");

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        rating,
        title,
        comment,
      };

      if (type === "visa") {
        payload.applicationId = targetId;
      } else if (type === "tour") {
        payload.bookingId = targetId;
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push("/dashboard/reviews");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to submit review");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard/reviews"
          className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-6 text-sm"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Reviews
        </Link>
        <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 p-8">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-widest text-primary-600 font-semibold">
              {type === "tour" ? "Tour Experience" : "Visa Service"}
            </p>
            <h1 className="text-3xl font-bold text-neutral-900 mt-2">Share Your Experience</h1>
            <p className="text-neutral-600 mt-2">
              Thank you for trusting Travunited. Your feedback helps other travellers choose the
              right service and keeps our quality high.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-3 rounded-full ${rating >= star ? "text-amber-500" : "text-neutral-300"
                      }`}
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      size={28}
                      className={rating >= star ? "fill-amber-400 stroke-amber-500" : ""}
                    />
                  </button>
                ))}
                <span className="text-sm text-neutral-600 ml-3">{rating} / 5</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Great experience!"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Your Review <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={6}
                placeholder="Tell us about the process, support, and final outcome..."
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !targetId}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ReviewPageLoadingState() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-neutral-600">Loading review form...</p>
      </div>
    </div>
  );
}

export default function NewReviewPage() {
  return (
    <Suspense fallback={<ReviewPageLoadingState />}>
      <NewReviewContent />
    </Suspense>
  );
}

