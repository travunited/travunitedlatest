"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Edit, Calendar, Search, Filter, Star, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface TourRecord {
  id: string;
  name: string;
  slug: string | null;
  destination: string;
  duration: string;
  price: number;
  basePriceInInr?: number | null;
  isActive: boolean;
  isFeatured: boolean;
  allowAdvance: boolean;
  advancePercentage?: number | null;
  country?: { id: string; name: string } | null;
}

interface CountryOption {
  id: string;
  name: string;
}

type TourFilters = {
  countryId: string;
  status: "all" | "active" | "inactive";
  search: string;
};

const TOUR_FILTER_DEFAULT: TourFilters = {
  countryId: "",
  status: "all",
  search: "",
};

export default function AdminToursPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tours, setTours] = useState<TourRecord[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TourFilters>(TOUR_FILTER_DEFAULT);
  const [refreshing, setRefreshing] = useState(false);
  const bootstrapped = useRef(false);

  const fetchCountries = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content/countries");
      if (response.ok) {
        const data = await response.json();
        setCountries(
          data.map((country: any) => ({
            id: country.id,
            name: country.name,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load countries", error);
    }
  }, []);

  const fetchTours = useCallback(async (activeFilters: TourFilters) => {
    try {
      const params = new URLSearchParams();
      if (activeFilters.countryId) params.set("countryId", activeFilters.countryId);
      if (activeFilters.status && activeFilters.status !== "all")
        params.set("status", activeFilters.status);
      if (activeFilters.search) params.set("search", activeFilters.search);

      const response = await fetch(
        `/api/admin/content/tours${params.toString() ? `?${params}` : ""}`
      );
      if (response.ok) {
        const data = await response.json();
        setTours(data);
      }
    } catch (error) {
      console.error("Error fetching tours:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading" || bootstrapped.current) return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "SUPER_ADMIN") {
      router.push("/admin");
      return;
    }
    bootstrapped.current = true;
    Promise.all([fetchCountries(), fetchTours(TOUR_FILTER_DEFAULT)]).finally(() =>
      setLoading(false)
    );
  }, [session, status, router, fetchCountries, fetchTours]);

  const handleFilterChange = (field: string, value: string) => {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
    fetchTours(nextFilters);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTours(filters);
  };

  const filteredTours = useMemo(() => tours, [tours]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-neutral-600">Loading tours...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Tour CMS</h1>
            <p className="text-neutral-500 mt-1">
              Manage curated itineraries, pricing, media and advance payment rules.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 border border-neutral-200 px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-50"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href="/admin/content/tours/new"
              className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus size={20} />
              <span>Add Tour</span>
            </Link>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                placeholder="Search tours..."
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                <Filter size={16} />
                Filters
              </div>
              <select
                value={filters.countryId}
                onChange={(e) => handleFilterChange("countryId", e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="">All countries</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {filteredTours.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTours.map((tour, index) => (
              <motion.div
                key={tour.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-medium transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">{tour.name}</h3>
                    <p className="text-sm text-neutral-500">
                      {tour.country?.name ? `${tour.country.name} · ` : ""}
                      {tour.destination}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {tour.isFeatured && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        Featured
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        tour.isActive ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {tour.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-neutral-600 mt-4">
                  <div>
                    <div className="text-xs text-neutral-500 uppercase">Duration</div>
                    <div className="font-medium text-neutral-900">{tour.duration}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase">Base Price</div>
                    <div className="font-medium text-neutral-900">
                      ₹{(tour.basePriceInInr ?? tour.price).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase">Advance</div>
                    <div className="font-medium text-neutral-900">
                      {tour.allowAdvance && tour.advancePercentage
                        ? `${tour.advancePercentage}% allowed`
                        : "Full payment"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase">Slug</div>
                    <div className="font-mono text-xs text-neutral-600">{tour.slug || "—"}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm font-medium">
                  <Link
                    href={`/admin/content/tours/${tour.id}`}
                    className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                  >
                    <Edit size={16} />
                    Edit tour
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-neutral-200 p-12 text-center">
            <Calendar size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 mb-4">No tours match the current filters.</p>
            <Link
              href="/admin/content/tours/new"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus size={20} />
              <span>Add Your First Tour</span>
            </Link>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
