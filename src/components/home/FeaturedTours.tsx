"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, MapPin, Star, ArrowRight } from "lucide-react";
import Image from "next/image";

const featuredTours = [
  {
    id: "dubai-premium",
    title: "Dubai 5N6D Premium Escape",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80",
    destination: "Dubai, UAE",
    duration: "5 Nights / 6 Days",
    price: 45999,
    rating: 4.8,
    reviews: 124,
  },
  {
    id: "europe-grand",
    title: "European Grand Tour",
    image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&q=80",
    destination: "Paris, Rome, Barcelona",
    duration: "10 Nights / 11 Days",
    price: 189999,
    rating: 4.9,
    reviews: 89,
  },
  {
    id: "thailand-tropical",
    title: "Thailand Tropical Paradise",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80",
    destination: "Bangkok, Phuket",
    duration: "6 Nights / 7 Days",
    price: 34999,
    rating: 4.7,
    reviews: 156,
  },
  {
    id: "singapore-city",
    title: "Singapore City Explorer",
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80",
    destination: "Singapore",
    duration: "3 Nights / 4 Days",
    price: 42999,
    rating: 4.6,
    reviews: 98,
  },
];

export function FeaturedTours() {
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
            Featured Tour Packages
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Curated holiday experiences designed for unforgettable memories
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredTours.map((tour, index) => (
            <motion.div
              key={tour.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Link href={`/tours/${tour.id}`}>
                <div className="bg-white rounded-2xl shadow-medium hover:shadow-large transition-shadow duration-300 overflow-hidden">
                  <div className="aspect-[4/3] relative">
                    <Image
                      src={tour.image}
                      alt={tour.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center space-x-1">
                      <Star size={14} className="fill-accent-500 text-accent-500" />
                      <span className="text-sm font-semibold">{tour.rating}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-neutral-900 mb-2 line-clamp-2">
                      {tour.title}
                    </h3>
                    <div className="flex items-center text-neutral-600 text-sm mb-3">
                      <MapPin size={16} className="mr-1" />
                      <span>{tour.destination}</span>
                    </div>
                    <div className="flex items-center text-neutral-600 text-sm mb-4">
                      <Calendar size={16} className="mr-1" />
                      <span>{tour.duration}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-primary-600">
                          ₹{tour.price.toLocaleString()}
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
            href="/tours"
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

