"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Star, Quote } from "lucide-react";
import { getMediaProxyUrl } from "@/lib/media";

interface HomepageReview {
  id: string;
  reviewerName: string | null;
  title: string | null;
  comment: string;
  rating: number;
  imageKey: string | null;
  imageUrl: string | null;
  link: string | null;
}

interface TestimonialsClientProps {
  reviews: HomepageReview[];
}

export function TestimonialsClient({ reviews }: TestimonialsClientProps) {
  // If no reviews, don't render the section
  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Trusted by thousands of Indian travellers for their visa and tour needs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review, index) => {
            const reviewContent = (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`bg-white rounded-2xl p-6 shadow-medium transition-shadow ${
                  review.link ? "hover:shadow-large cursor-pointer" : ""
                }`}
              >
                <Quote size={32} className="text-primary-200 mb-4" />
                <div className="flex items-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={20}
                      className={star <= review.rating ? "fill-accent-500 text-accent-500" : "text-neutral-300"}
                    />
                  ))}
                </div>
                {review.title && (
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    {review.title}
                  </h3>
                )}
                <p className="text-neutral-700 mb-6 leading-relaxed">
                  &ldquo;{review.comment}&rdquo;
                </p>
                <div className="flex items-center space-x-3">
                  {review.imageKey || review.imageUrl ? (
                    <Image
                      src={review.imageKey ? getMediaProxyUrl(review.imageKey) : review.imageUrl || ""}
                      alt={review.reviewerName || "Reviewer"}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover border border-neutral-200"
                      unoptimized
                    />
                  ) : null}
                  <div>
                    <div className="font-semibold text-neutral-900">
                      {review.reviewerName || "Customer"}
                    </div>
                  </div>
                </div>
              </motion.div>
            );

            // If review has a link, wrap in anchor tag
            if (review.link) {
              return (
                <a
                  key={review.id}
                  href={review.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Read review by ${review.reviewerName || "customer"}`}
                  className="block"
                >
                  {reviewContent}
                </a>
              );
            }

            return reviewContent;
          })}
        </div>
      </div>
    </section>
  );
}

