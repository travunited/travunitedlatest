"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { getMediaProxyUrl } from "@/lib/media";
import { shouldUseUnoptimizedImage } from "@/lib/image-helpers";
import { 
  Search, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  SlidersHorizontal, 
  X,
  Users,
  TrendingUp,
  Tag,
  Star,
} from "lucide-react";

interface TourCard {
  id: string;
  slug?: string | null;
  name: string;
  destination: string;
  primaryDestination?: string | null;
  destinationCountry?: string | null;
  destinationState?: string | null;
  duration: string;
  durationDays?: number | null;
  durationNights?: number | null;
  price: number;
  originalPrice?: number | null;
  currency: string;
  countryName: string;
  countryCode: string;
  isFeatured: boolean;
  allowAdvance: boolean;
  tourType?: string | null;
  tourSubType?: string | null;
  region?: string | null;
  themes: string[];
  bestFor: string[];
  difficultyLevel?: string | null;
  groupSizeMin?: number | null;
  groupSizeMax?: number | null;
  packageType?: string | null;
  image: string;
}

interface CountryFilter {
  code: string;
  name: string;
}

interface Props {
  tours: TourCard[];
  countries: CountryFilter[];
  regions: string[];
  tourTypes: string[];
  themes: string[];
}

export default function HolidaysGridClient({ tours, countries, regions, tourTypes, themes }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const destinationParam = searchParams?.get("destination") || "";
  
  // Calculate min/max for ranges (needed for initial state)
  const maxDuration = useMemo(() => {
    return Math.max(...tours.map((t) => t.durationDays || 0), 30);
  }, [tours]);

  const maxPrice = useMemo(() => {
    return Math.max(...tours.map((t) => t.price), 500000);
  }, [tours]);

  // Initialize state from URL params or sessionStorage
  const getInitialState = useCallback(() => {
    // Try to restore from sessionStorage first (for back navigation)
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("tours-filter-state");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Only use stored state if we're coming from a detail page (no URL params except destination)
          const hasOtherParams = Array.from(searchParams?.keys() || []).some(
            (key) => key !== "destination"
          );
          if (!hasOtherParams && Object.keys(parsed).length > 0) {
            // Ensure ranges are valid
            return {
              ...parsed,
              durationRange: parsed.durationRange || [0, maxDuration],
              priceRange: parsed.priceRange || [0, maxPrice],
            };
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    // Otherwise, use URL params
    return {
      searchQuery: destinationParam,
      selectedCountry: searchParams?.get("country") || "all",
      selectedRegion: searchParams?.get("region") || "all",
      selectedTourType: searchParams?.get("tourType") || "all",
      selectedThemes: searchParams?.get("themes")?.split(",").filter(Boolean) || [],
      durationRange: [
        parseInt(searchParams?.get("durationMin") || "0"),
        parseInt(searchParams?.get("durationMax") || maxDuration.toString()),
      ] as [number, number],
      priceRange: [
        parseInt(searchParams?.get("priceMin") || "0"),
        parseInt(searchParams?.get("priceMax") || maxPrice.toString()),
      ] as [number, number],
      onlyFeatured: searchParams?.get("featured") === "true",
      onlyAdvance: searchParams?.get("advance") === "true",
      sortOption: (searchParams?.get("sort") || "recommended") as
        | "recommended"
        | "price-asc"
        | "price-desc"
        | "duration-asc"
        | "duration-desc"
        | "newest",
    };
  }, [searchParams, destinationParam, maxDuration, maxPrice]);

  const initialState = getInitialState();
  
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [selectedCountry, setSelectedCountry] = useState<string>(initialState.selectedCountry);
  const [selectedRegion, setSelectedRegion] = useState<string>(initialState.selectedRegion);
  const [selectedTourType, setSelectedTourType] = useState<string>(initialState.selectedTourType);
  const [selectedThemes, setSelectedThemes] = useState<string[]>(initialState.selectedThemes);
  const [durationRange, setDurationRange] = useState<[number, number]>(initialState.durationRange);
  const [priceRange, setPriceRange] = useState<[number, number]>(initialState.priceRange);
  const [onlyFeatured, setOnlyFeatured] = useState(initialState.onlyFeatured);
  const [onlyAdvance, setOnlyAdvance] = useState(initialState.onlyAdvance);
  const [sortOption, setSortOption] = useState<
    "recommended" | "price-asc" | "price-desc" | "duration-asc" | "duration-desc" | "newest"
  >(initialState.sortOption);
  const [showFilters, setShowFilters] = useState(false);
  
  // Initialize search query from URL params
  useEffect(() => {
    if (destinationParam) {
      setSearchQuery(destinationParam);
    }
  }, [destinationParam]);
  
  // Save filter state to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const filterState = {
        searchQuery,
        selectedCountry,
        selectedRegion,
        selectedTourType,
        selectedThemes,
        durationRange,
        priceRange,
        onlyFeatured,
        onlyAdvance,
        sortOption,
      };
      sessionStorage.setItem("tours-filter-state", JSON.stringify(filterState));
    }
  }, [
    searchQuery,
    selectedCountry,
    selectedRegion,
    selectedTourType,
    selectedThemes,
    durationRange,
    priceRange,
    onlyFeatured,
    onlyAdvance,
    sortOption,
  ]);

  const filteredTours = useMemo(() => {
    const lower = searchQuery.toLowerCase();
    return tours.filter((tour) => {
      const matchesSearch =
        tour.name.toLowerCase().includes(lower) ||
        tour.destination.toLowerCase().includes(lower) ||
        tour.primaryDestination?.toLowerCase().includes(lower) ||
        tour.destinationCountry?.toLowerCase().includes(lower) ||
        tour.themes.some((theme) => theme.toLowerCase().includes(lower)) ||
        tour.bestFor.some((bf) => bf.toLowerCase().includes(lower));

      const matchesCountry =
        selectedCountry === "all" || tour.countryCode === selectedCountry;

      const matchesRegion =
        selectedRegion === "all" || tour.region === selectedRegion;

      const matchesTourType =
        selectedTourType === "all" || tour.tourType === selectedTourType;

      const matchesThemes =
        selectedThemes.length === 0 ||
        selectedThemes.every((theme) => tour.themes.includes(theme));

      const matchesDuration =
        (tour.durationDays || 0) >= durationRange[0] &&
        (tour.durationDays || maxDuration) <= durationRange[1];

      const matchesPrice =
        tour.price >= priceRange[0] && tour.price <= priceRange[1];

      const matchesFeatured = onlyFeatured ? tour.isFeatured : true;
      const matchesAdvance = onlyAdvance ? tour.allowAdvance : true;

      return (
        matchesSearch &&
        matchesCountry &&
        matchesRegion &&
        matchesTourType &&
        matchesThemes &&
        matchesDuration &&
        matchesPrice &&
        matchesFeatured &&
        matchesAdvance
      );
    });
  }, [
    tours,
    searchQuery,
    selectedCountry,
    selectedRegion,
    selectedTourType,
    selectedThemes,
    durationRange,
    priceRange,
    onlyFeatured,
    onlyAdvance,
    maxDuration,
  ]);

  const sortedTours = useMemo(() => {
    const list = [...filteredTours];
    if (sortOption === "price-asc") {
      return list.sort((a, b) => a.price - b.price);
    }
    if (sortOption === "price-desc") {
      return list.sort((a, b) => b.price - a.price);
    }
    if (sortOption === "duration-asc") {
      return list.sort((a, b) => (a.durationDays || 0) - (b.durationDays || 0));
    }
    if (sortOption === "duration-desc") {
      return list.sort((a, b) => (b.durationDays || 0) - (a.durationDays || 0));
    }
    if (sortOption === "newest") {
      return list; // Already sorted by newest from server
    }
    // Recommended: featured first, then by name
    return list.sort((a, b) => {
      if (a.isFeatured === b.isFeatured) {
        return a.name.localeCompare(b.name);
      }
      return a.isFeatured ? -1 : 1;
    });
  }, [filteredTours, sortOption]);

  const toggleTheme = (theme: string) => {
    setSelectedThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme]
    );
  };

  // Function to build URL with current filter state
  const buildToursUrl = useCallback((tourId?: string) => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set("destination", searchQuery);
    if (selectedCountry !== "all") params.set("country", selectedCountry);
    if (selectedRegion !== "all") params.set("region", selectedRegion);
    if (selectedTourType !== "all") params.set("tourType", selectedTourType);
    if (selectedThemes.length > 0) params.set("themes", selectedThemes.join(","));
    if (durationRange[0] > 0) params.set("durationMin", durationRange[0].toString());
    if (durationRange[1] < maxDuration) params.set("durationMax", durationRange[1].toString());
    if (priceRange[0] > 0) params.set("priceMin", priceRange[0].toString());
    if (priceRange[1] < maxPrice) params.set("priceMax", priceRange[1].toString());
    if (onlyFeatured) params.set("featured", "true");
    if (onlyAdvance) params.set("advance", "true");
    if (sortOption !== "recommended") params.set("sort", sortOption);
    
    const queryString = params.toString();
    return tourId 
      ? `/holidays/${tourId}${queryString ? `?${queryString}` : ""}`
      : `/holidays${queryString ? `?${queryString}` : ""}`;
  }, [
    searchQuery,
    selectedCountry,
    selectedRegion,
    selectedTourType,
    selectedThemes,
    durationRange,
    priceRange,
    onlyFeatured,
    onlyAdvance,
    sortOption,
    maxDuration,
    maxPrice,
  ]);

  const clearFilters = () => {
    setSelectedCountry("all");
    setSelectedRegion("all");
    setSelectedTourType("all");
    setSelectedThemes([]);
    setDurationRange([0, maxDuration]);
    setPriceRange([0, maxPrice]);
    setOnlyFeatured(false);
    setOnlyAdvance(false);
    setSearchQuery("");
    // Clear sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("tours-filter-state");
    }
    // Navigate to clean URL
    router.push("/holidays");
  };

  const hasActiveFilters =
    selectedCountry !== "all" ||
    selectedRegion !== "all" ||
    selectedTourType !== "all" ||
    selectedThemes.length > 0 ||
    durationRange[0] > 0 ||
    durationRange[1] < maxDuration ||
    priceRange[0] > 0 ||
    priceRange[1] < maxPrice ||
    onlyFeatured ||
    onlyAdvance ||
    searchQuery !== "";

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-8">
        <div className="bg-white rounded-2xl shadow-large p-6 space-y-4">
          {/* Search and Quick Filters */}
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1 relative">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search holidays, destinations, themes..."
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
                  setSortOption(
                    e.target.value as
                      | "recommended"
                      | "price-asc"
                      | "price-desc"
                      | "duration-asc"
                      | "duration-desc"
                      | "newest"
                  )
                }
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="duration-asc">Duration: Short → Long</option>
                <option value="duration-desc">Duration: Long → Short</option>
                <option value="newest">Newest First</option>
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                  showFilters || hasActiveFilters
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-neutral-700 border-neutral-200"
                }`}
              >
                <SlidersHorizontal size={16} />
                Filters
                {hasActiveFilters && (
                  <span className="bg-white text-primary-600 rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {[
                      selectedCountry !== "all" ? 1 : 0,
                      selectedRegion !== "all" ? 1 : 0,
                      selectedTourType !== "all" ? 1 : 0,
                      selectedThemes.length,
                      onlyFeatured ? 1 : 0,
                      onlyAdvance ? 1 : 0,
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOnlyFeatured((prev: boolean) => !prev)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                onlyFeatured
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              <Star size={14} />
              Featured
            </button>
            <button
              onClick={() => setOnlyAdvance((prev: boolean) => !prev)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                onlyAdvance
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              <Calendar size={14} />
              Advance Payment
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                <X size={14} />
                Clear All
              </button>
            )}
            <p className="text-sm text-neutral-500 ml-auto flex items-center">
              {sortedTours.length} {sortedTours.length === 1 ? "holiday package" : "holiday packages"}
            </p>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="border-t border-neutral-200 pt-4 space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Region Filter */}
                {regions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Region
                    </label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
                    >
                      <option value="all">All Regions</option>
                      {regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tour Type Filter */}
                {tourTypes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Tour Type
                    </label>
                    <select
                      value={selectedTourType}
                      onChange={(e) => setSelectedTourType(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
                    >
                      <option value="all">All Types</option>
                      {tourTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Duration Range */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Duration: {durationRange[0]} - {durationRange[1]} days
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max={maxDuration}
                      value={durationRange[0]}
                      onChange={(e) =>
                        setDurationRange([parseInt(e.target.value), durationRange[1]])
                      }
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min="0"
                      max={maxDuration}
                      value={durationRange[1]}
                      onChange={(e) =>
                        setDurationRange([durationRange[0], parseInt(e.target.value)])
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Price: ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max={maxPrice}
                      step="1000"
                      value={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([parseInt(e.target.value), priceRange[1]])
                      }
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min="0"
                      max={maxPrice}
                      step="1000"
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], parseInt(e.target.value)])
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Themes Filter */}
              {themes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Themes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {themes.map((theme) => (
                      <button
                        key={theme}
                        onClick={() => toggleTheme(theme)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedThemes.includes(theme)
                            ? "bg-primary-600 text-white"
                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        }`}
                      >
                        <Tag size={12} />
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tour Cards Grid */}
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
              <Link href={buildToursUrl(tour.slug || tour.id)}>
                <div className="bg-white rounded-2xl shadow-medium hover:shadow-large transition-shadow duration-300 overflow-hidden h-full flex flex-col">
                  {/* Image */}
                  <div className="aspect-[4/3] relative bg-neutral-100">
                    <Image
                      src={getMediaProxyUrl(tour.image) || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80"}
                      alt={tour.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized={shouldUseUnoptimizedImage(tour.image) || true}
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop
                        target.src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80";
                      }}
                    />
                    {tour.isFeatured && (
                      <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Star size={12} />
                        Featured
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-neutral-900 px-3 py-1 rounded-full text-xs font-medium">
                      {tour.countryName}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-neutral-900 mb-2 line-clamp-2">
                      {tour.name}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center text-neutral-600 text-sm mb-2">
                      <MapPin size={16} className="mr-1 flex-shrink-0" />
                      <span className="truncate">{tour.destination}</span>
                    </div>

                    {/* Duration & Group Size */}
                    <div className="flex items-center gap-4 text-neutral-600 text-sm mb-3">
                      <div className="flex items-center">
                        <Calendar size={16} className="mr-1" />
                        <span>{tour.duration}</span>
                      </div>
                      {(tour.groupSizeMin || tour.groupSizeMax) && (
                        <div className="flex items-center">
                          <Users size={16} className="mr-1" />
                          <span>
                            {tour.groupSizeMin || 1}-{tour.groupSizeMax || 20}
                          </span>
                        </div>
                      )}
                      {tour.difficultyLevel && (
                        <div className="flex items-center">
                          <TrendingUp size={16} className="mr-1" />
                          <span>{tour.difficultyLevel}</span>
                        </div>
                      )}
                    </div>

                    {/* Themes & Best For */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tour.themes.slice(0, 2).map((theme, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs"
                        >
                          {theme}
                        </span>
                      ))}
                      {tour.bestFor.slice(0, 1).map((bf, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs"
                        >
                          {bf}
                        </span>
                      ))}
                    </div>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-200">
                      <div>
                        {tour.originalPrice && tour.originalPrice > tour.price && (
                          <div className="text-xs text-neutral-500 line-through mb-1">
                            {tour.currency === "INR" ? "₹" : tour.currency}
                            {tour.originalPrice.toLocaleString()}
                          </div>
                        )}
                        <div className="text-2xl font-bold text-primary-600">
                          {tour.currency === "INR" ? "₹" : tour.currency}
                          {tour.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {tour.allowAdvance ? "Advance available" : "Starting from"}
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

        {sortedTours.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-600 text-lg mb-2">
              No holiday packages found matching your criteria.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear filters to see all holidays
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
