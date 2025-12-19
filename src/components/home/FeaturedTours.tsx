"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import Image from "next/image";
import { getMediaProxyUrl } from "@/lib/media";
import { shouldUseUnoptimizedImage } from "@/lib/image-helpers";

type FeaturedTour = {
  id: string;
  slug: string;
  name: string;
  subtitle?: string | null;
  destination: string;
  duration: string;
  durationNights?: number | null;
  price: number;
  image?: string | null;
};

export function FeaturedTours({ tours }: { tours: FeaturedTour[] }) {
  if (!tours || tours.length === 0) {
    return null;
  }

  // Filter out any invalid tours (ensure all are proper objects with required fields)
  const validTours = tours.filter((tour) => {
    return (
      tour &&
      typeof tour === 'object' &&
      typeof tour.id === 'string' &&
      typeof tour.name === 'string' &&
      typeof tour.price === 'number'
    );
  });

  if (validTours.length === 0) {
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
            Featured Holiday Packages
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Curated holiday experiences designed for unforgettable memories
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {validTours.map((tour, index) => (
            <motion.div
              key={tour.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Link href={`/tours/${tour.slug || tour.id}`}>
                <div className="bg-white rounded-2xl shadow-medium hover:shadow-large transition-shadow duration-300 overflow-hidden h-full flex flex-col">
                  <div className="aspect-[4/3] relative bg-neutral-100">
                    <Image
                      src={
                        getMediaProxyUrl(tour.image) ||
                        "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80"
                      }
                      alt={tour.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      unoptimized={shouldUseUnoptimizedImage(tour.image) || true}
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop
                        target.src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80";
                      }}
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-neutral-900 mb-2 line-clamp-2">
                      {typeof tour.name === 'string' ? tour.name : ''}
                    </h3>
                    {tour.subtitle && typeof tour.subtitle === 'string' && (
                      <p className="text-neutral-600 text-sm mb-2 line-clamp-1">
                        {tour.subtitle}
                      </p>
                    )}
                    <div className="flex items-center text-neutral-600 text-sm mb-3">
                      <MapPin size={16} className="mr-1" />
                      <span className="line-clamp-1">{typeof tour.destination === 'string' ? tour.destination : ''}</span>
                    </div>
                    <div className="flex items-center text-neutral-600 text-sm mb-4">
                      <Calendar size={16} className="mr-1" />
                      <span>{typeof tour.duration === 'string' ? tour.duration : ''}</span>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-neutral-200">
                      <div>
                        <div className="text-2xl font-bold text-primary-600">
                          ₹{typeof tour.price === 'number' ? tour.price.toLocaleString() : '0'}
                        </div>
                        <div className="text-xs text-neutral-500">per person</div>
                      </div>
                      <div className="flex items-center text-primary-600 font-medium group-hover:translate-x-1 transition-transform">
                        <span className="text-sm">View</span>
                        <ArrowRight size={16} className="ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            href="/holidays"
            className="inline-flex items-center space-x-2 bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <span>View All Tours</span>
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

