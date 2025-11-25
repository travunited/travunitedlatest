"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, MapPin, Clock } from "lucide-react";
import Image from "next/image";
import { getMediaProxyUrl } from "@/lib/media";
import { shouldUseUnoptimizedImage } from "@/lib/image-helpers";

type FeaturedVisa = {
  id: string;
  slug: string;
  name: string;
  subtitle?: string | null;
  country: string;
  countryCode: string;
  price: number;
  processingTime: string;
  entryType?: string | null;
  entryTypeLegacy?: string | null;
  stayType?: string | null;
  visaSubTypeLabel?: string | null;
  image?: string | null;
};

const enumLabels: Record<string, string> = {
  SINGLE: "Single Entry",
  DOUBLE: "Double Entry",
  MULTIPLE: "Multiple Entry",
  SHORT_STAY: "Short Stay",
  LONG_STAY: "Long Stay",
};

const formatEntrySummary = (visa: FeaturedVisa) => {
  if (visa.visaSubTypeLabel) return visa.visaSubTypeLabel;
  if (visa.entryType && visa.stayType) {
    return `${enumLabels[visa.entryType] || visa.entryType} • ${
      enumLabels[visa.stayType] || visa.stayType
    }`;
  }
  if (visa.entryType) {
    return enumLabels[visa.entryType] || visa.entryType;
  }
  return visa.entryTypeLegacy || "Flexible Entry";
};

export function FeaturedVisas({ visas }: { visas: FeaturedVisa[] }) {
  if (visas.length === 0) {
    return null;
  }

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
            Visa Services
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Fast, secure, and hassle-free visa application with expert support
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visas.map((visa, index) => (
            <motion.div
              key={visa.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Link href={`/visas/${visa.countryCode}/${visa.slug}`}>
                <div className="bg-white rounded-2xl shadow-medium hover:shadow-large transition-shadow duration-300 overflow-hidden h-full flex flex-col">
                  <div className="aspect-[4/3] relative bg-neutral-100">
                    <Image
                      src={
                        getMediaProxyUrl(visa.image) ||
                        "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80"
                      }
                      alt={visa.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized={shouldUseUnoptimizedImage(visa.image) || true}
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop
                        target.src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80";
                      }}
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center text-neutral-600 text-sm mb-2">
                      <MapPin size={16} className="mr-1" />
                      <span>{visa.country}</span>
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-1 line-clamp-2">
                      {visa.name}
                    </h3>
                    {visa.subtitle && (
                      <p className="text-neutral-600 text-sm mb-3 line-clamp-1">
                        {visa.subtitle}
                      </p>
                    )}
                    <div className="flex items-center text-neutral-600 text-sm mb-4">
                      <Clock size={16} className="mr-1" />
                      <span>{visa.processingTime}</span>
                      <span className="mx-2">•</span>
                      <span>{formatEntrySummary(visa)}</span>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-neutral-200">
                      <div>
                        <div className="text-2xl font-bold text-primary-600">
                          ₹{visa.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-neutral-500">starting from</div>
                      </div>
                      <div className="flex items-center text-primary-600 font-medium group-hover:translate-x-1 transition-transform">
                        <span className="text-sm">Apply Now</span>
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
            href="/visas"
            className="inline-flex items-center space-x-2 bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <span>View All Visas</span>
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

