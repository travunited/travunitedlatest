"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

const destinations = [
  {
    id: "uae",
    name: "UAE",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80",
    description: "Dubai & Abu Dhabi",
  },
  {
    id: "schengen",
    name: "Schengen",
    image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&q=80",
    description: "27 European countries",
  },
  {
    id: "usa",
    name: "USA",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&q=80",
    description: "Tourist & Business",
  },
  {
    id: "uk",
    name: "United Kingdom",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80",
    description: "London & beyond",
  },
  {
    id: "singapore",
    name: "Singapore",
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&q=80",
    description: "Modern city-state",
  },
  {
    id: "thailand",
    name: "Thailand",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80",
    description: "Tropical paradise",
  },
];

export function PopularDestinations() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            Popular Visa Destinations
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Explore visa options for the most sought-after destinations
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((destination, index) => (
            <motion.div
              key={destination.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Link href={`/visas/${destination.id}`}>
                <div className="relative overflow-hidden rounded-2xl shadow-medium hover:shadow-large transition-shadow duration-300">
                  <div className="aspect-[4/3] relative">
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-2xl font-bold mb-1">{destination.name}</h3>
                    <p className="text-white/80 mb-4">{destination.description}</p>
                    <div className="flex items-center text-white font-medium group-hover:translate-x-2 transition-transform">
                      <span>View Visa Options</span>
                      <ArrowRight size={20} className="ml-2" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

