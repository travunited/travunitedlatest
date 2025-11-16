"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Search, Calendar, MapPin, ArrowRight, SlidersHorizontal } from "lucide-react";

interface TourCard {
  id: string;
  name: string;
  destination: string;
  duration: string;
  price: number;
  countryName: string;
  countryCode: string;
  isFeatured: boolean;
  allowAdvance: boolean;
  image: string;
}

interface CountryFilter {
  code: string;
  name: string;
}

interface Props {
  tours: TourCard[];
  countries: CountryFilter[];
}

export default function ToursGridClient({ tours, countries }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyAdvance, setOnlyAdvance] = useState(false);
  const [sortOption, setSortOption] = useState<"recommended" | "price-asc" | "price-desc">(
    "recommended"
  );

  const filteredTours = useMemo(() => {
    const lower = searchQuery.toLowerCase();
    return tours.filter((tour) => {
      const matchesSearch =
        tour.name.toLowerCase().includes(lower) ||
        tour.destination.toLowerCase().includes(lower);
      const matchesCountry =
        selectedCountry === "all" || tour.countryCode === selectedCountry;
      const matchesFeatured = onlyFeatured ? tour.isFeatured : true;
      const matchesAdvance = onlyAdvance ? tour.allowAdvance : true;
      return matchesSearch && matchesCountry && matchesFeatured && matchesAdvance;
    });
  }, [tours, searchQuery, selectedCountry, onlyFeatured, onlyAdvance]);

  const sortedTours = useMemo(() => {
    const list = [...filteredTours];
    if (sortOption === "price-asc") {
      return list.sort((a, b) => a.price - b.price);
    }
    if (sortOption === "price-desc") {
      return list.sort((a, b) => b.price - a.price);
    }
    return list.sort((a, b) => {
      if (a.isFeatured === b.isFeatured) {
        return a.name.localeCompare(b.name);
      }
      return a.isFeatured ? -1 : 1;
    });
  }, [filteredTours, sortOption]);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-8">
        <div className="bg-white rounded-2xl shadow-large p-6 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1 relative">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search tours or destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="all">All destinations</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              <select
                value={sortOption}
                onChange={(e) =>
                  setSortOption(e.target.value as "recommended" | "price-asc" | "price-desc")
                }
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="price-asc">Sort: Price low → high</option>
                <option value="price-desc">Sort: Price high → low</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOnlyFeatured((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                onlyFeatured ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-700"
              }`}
            >
              <SlidersHorizontal size={14} />
              Highlighted
            </button>
            <button
              onClick={() => setOnlyAdvance((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                onlyAdvance ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-700"
              }`}
            >
              <Calendar size={14} />
              Advance-friendly
            </button>
            <p className="text-sm text-neutral-500 ml-auto">
              {sortedTours.length} {sortedTours.length === 1 ? "package" : "packages"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedTours.map((tour, index) => (
            <motion.div
              key={tour.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Link href={`/tours/${tour.id}`}>
                <div className="bg-white rounded-2xl shadow-medium hover:shadow-large transition-shadow duration-300 overflow-hidden">
                  <div className="aspect-[4/3] relative">
                    <Image
                      src={tour.image}
                      alt={tour.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      {tour.countryName}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-neutral-900 mb-2 line-clamp-2">
                      {tour.name}
                    </h3>
                    <div className="flex items-center text-neutral-600 text-sm mb-2">
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
                        <div className="text-xs text-neutral-500">
                          {tour.allowAdvance ? "Advance available" : "Full payment"}
                        </div>
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

        {filteredTours.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-600 text-lg">
              No tours found matching your criteria.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

