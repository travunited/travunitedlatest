"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Search, ArrowRight } from "lucide-react";
import { getCountryFlagUrl } from "@/lib/flags";
import { getMediaProxyUrl } from "@/lib/media";
import { shouldUseUnoptimizedImage } from "@/lib/image-helpers";

interface CountryCard {
  id: string;
  code: string;
  name: string;
  region?: string;
  flagUrl?: string;
  heroImage: string;
  visaCount: number;
}

interface Props {
  countries: CountryCard[];
}

export default function VisasGridClient({ countries }: Props) {
  const searchParams = useSearchParams();
  
  // Initialize state from URL params or sessionStorage
  const getInitialState = useCallback(() => {
    // Try to restore from sessionStorage first (for back navigation)
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("visas-filter-state");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Only use stored state if we don't have URL params
          const hasParams = searchParams?.get("search") || searchParams?.get("region") || searchParams?.get("sort");
          if (!hasParams && Object.keys(parsed).length > 0) {
            return parsed;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    // Otherwise, use URL params or defaults
    return {
      searchQuery: searchParams?.get("search") || "",
      selectedRegion: searchParams?.get("region") || "all",
      sortOption: (searchParams?.get("sort") || "alpha") as "alpha" | "volume",
    };
  }, [searchParams]);

  const initialState = getInitialState();
  
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [selectedRegion, setSelectedRegion] = useState<string>(initialState.selectedRegion);
  const [sortOption, setSortOption] = useState<"alpha" | "volume">(initialState.sortOption);
  
  // Save filter state to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const filterState = {
        searchQuery,
        selectedRegion,
        sortOption,
      };
      sessionStorage.setItem("visas-filter-state", JSON.stringify(filterState));
    }
  }, [searchQuery, selectedRegion, sortOption]);

  const regions = useMemo(() => {
    const unique = new Set<string>();
    countries.forEach((country) => {
      if (country.region) {
        unique.add(country.region);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [countries]);

  const filtered = useMemo(() => {
    const lower = searchQuery.toLowerCase();
    let next = countries.filter((country) => {
      const matchesSearch =
        country.name.toLowerCase().includes(lower) ||
        country.code.toLowerCase().includes(lower);
      const matchesRegion =
        selectedRegion === "all" ||
        (country.region?.toLowerCase() || "other") === selectedRegion.toLowerCase();
      return matchesSearch && matchesRegion;
    });

    next = [...next].sort((a, b) => {
      if (sortOption === "volume") {
        if (b.visaCount !== a.visaCount) {
          return b.visaCount - a.visaCount;
        }
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

    return next;
  }, [countries, searchQuery, selectedRegion, sortOption]);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-12">
        <div className="bg-white rounded-2xl shadow-large p-6 space-y-4">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search for a country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="all">All regions</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as "alpha" | "volume")}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="alpha">Sort: A → Z</option>
                <option value="volume">Sort: Most visas</option>
              </select>
            </div>
            <p className="text-sm text-neutral-500">
              Showing {filtered.length} {filtered.length === 1 ? "destination" : "destinations"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((country, index) => (
            <motion.div
              key={country.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Link href={`/visas/${country.code.toLowerCase()}`}>
                <div className="bg-white rounded-2xl shadow-medium hover:shadow-large transition-shadow duration-300 overflow-hidden">
                  <div className="aspect-[4/3] relative bg-neutral-100">
                    <Image
                      src={getMediaProxyUrl(country.heroImage) || "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&q=80"}
                      alt={country.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      unoptimized={shouldUseUnoptimizedImage(country.heroImage) || true}
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop
                        target.src = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&q=80";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute top-4 left-4 flex items-center gap-2 text-white">
                      {(() => {
                        const flagUrl = getCountryFlagUrl(country.flagUrl, country.code, 160);
                        return flagUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={flagUrl}
                            alt={`${country.name} flag`}
                            className="h-6 w-9 rounded shadow object-cover"
                          />
                        ) : (
                          <div className="h-6 w-9 rounded bg-white/20" />
                        );
                      })()}
                      <span className="text-xs uppercase tracking-widest font-semibold">
                        {country.code}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-neutral-900 mb-1">
                      {country.name}
                    </h3>
                    <p className="text-neutral-600 text-sm mb-2">
                      {country.region || "Worldwide"}
                    </p>
                    <p className="text-xs text-neutral-500 mb-4">
                      {country.visaCount} curated visa {country.visaCount === 1 ? "option" : "options"}
                    </p>
                    <div className="flex items-center text-primary-600 font-medium group-hover:translate-x-1 transition-transform">
                      <span className="text-sm">View Visa Options</span>
                      <ArrowRight size={16} className="ml-2" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-600 text-lg">
              No countries found matching &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        )}
      </div>
    </>
  );
}

