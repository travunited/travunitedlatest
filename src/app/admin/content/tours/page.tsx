"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Edit, Calendar, Search, Filter, Star, RefreshCw, CheckSquare, Square, ChevronDown, Upload, Globe, Package, Tag } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ImportModal } from "@/components/admin/ImportModal";

interface TourRecord {
  id: string;
  name: string;
  slug: string | null;
  destination: string;
  primaryDestination?: string | null;
  destinationCountry?: string | null;
  destinationState?: string | null;
  duration: string;
  durationDays?: number | null;
  durationNights?: number | null;
  price: number;
  basePriceInInr?: number | null;
  originalPrice?: number | null;
  currency?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  status?: string | null;
  allowAdvance: boolean;
  advancePercentage?: number | null;
  tourType?: string | null;
  tourSubType?: string | null;
  region?: string | null;
  packageType?: string | null;
  country?: { id: string; name: string } | null;
  updatedAt: Date;
  createdAt: Date;
}

interface CountryOption {
  id: string;
  name: string;
}

type TourFilters = {
  countryId: string;
  status: "all" | "active" | "inactive" | "draft";
  tourType: string;
  region: string;
  packageType: string;
  featured: "all" | "yes" | "no";
  search: string;
};

const TOUR_FILTER_DEFAULT: TourFilters = {
  countryId: "",
  status: "all",
  tourType: "all",
  region: "all",
  packageType: "all",
  featured: "all",
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
        // Apply client-side filters for tourType, region, packageType, featured
        let filtered = data;
        if (activeFilters.tourType !== "all") {
          filtered = filtered.filter((t: TourRecord) => t.tourType === activeFilters.tourType);
        }
        if (activeFilters.region !== "all") {
          filtered = filtered.filter((t: TourRecord) => t.region === activeFilters.region);
        }
        if (activeFilters.packageType !== "all") {
          filtered = filtered.filter((t: TourRecord) => t.packageType === activeFilters.packageType);
        }
        if (activeFilters.featured === "yes") {
          filtered = filtered.filter((t: TourRecord) => t.isFeatured);
        } else if (activeFilters.featured === "no") {
          filtered = filtered.filter((t: TourRecord) => !t.isFeatured);
        }
        setTours(filtered);
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

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTours.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTours.map((t) => t.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleBulkStatusUpdate = async (status: "active" | "inactive") => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/admin/content/tours/bulk/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          status,
          isActive: status === "active",
        }),
      });

      if (response.ok) {
        await fetchTours(filters);
        setSelectedIds(new Set());
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update tours");
      }
    } catch (error) {
      console.error("Error bulk updating status:", error);
      alert("An error occurred while updating");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkFeatured = async (featured: boolean) => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/admin/content/tours/bulk/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          featured,
        }),
      });

      if (response.ok) {
        await fetchTours(filters);
        setSelectedIds(new Set());
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update tours");
      }
    } catch (error) {
      console.error("Error bulk updating featured:", error);
      alert("An error occurred while updating");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (
      !confirm(
        `Are you sure you want to permanently delete ${count} tour record(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/admin/content/tours/bulk/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        const result = await response.json();
        await fetchTours(filters);
        setSelectedIds(new Set());
        alert(result.message || `Successfully deleted ${count} tour record(s)`);
      } else {
        const error = await response.json();
        if (error.details) {
          const details = error.details.tours || "";
          alert(
            `${error.error}\n\nFailed tours: ${details}\n\nThese tours have active bookings.`
          );
        } else {
          alert(error.error || "Failed to delete tours");
        }
      }
    } catch (error) {
      console.error("Error bulk deleting tours:", error);
      alert("An error occurred while deleting");
    } finally {
      setBulkActionLoading(false);
    }
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
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 border border-neutral-200 px-4 py-2 rounded-lg text-neutral-700 hover:bg-neutral-50"
            >
              <Upload size={18} />
              Import
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
                <option value="draft">Draft</option>
              </select>
              <select
                value={filters.tourType}
                onChange={(e) => handleFilterChange("tourType", e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="all">All tour types</option>
                <option value="group">Group</option>
                <option value="private">Private</option>
                <option value="fixed_departure">Fixed Departure</option>
                <option value="on_demand">On Demand</option>
              </select>
              <select
                value={filters.region}
                onChange={(e) => handleFilterChange("region", e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="all">All regions</option>
                {Array.from(new Set(tours.map(t => t.region).filter((r): r is string => Boolean(r)))).map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              <select
                value={filters.packageType}
                onChange={(e) => handleFilterChange("packageType", e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="all">All package types</option>
                <option value="fixed_departure">Fixed Departure</option>
                <option value="on_demand">On Demand</option>
                <option value="private">Private</option>
              </select>
              <select
                value={filters.featured}
                onChange={(e) => handleFilterChange("featured", e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="all">All</option>
                <option value="yes">Featured</option>
                <option value="no">Not Featured</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary-900">
                {selectedIds.size} tour{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-primary-700 hover:text-primary-900"
              >
                Clear selection
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  disabled={bulkActionLoading}
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  Bulk Actions
                  <ChevronDown size={16} />
                </button>
                {showBulkActions && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={async () => {
                        setShowBulkActions(false);
                        await handleBulkStatusUpdate("active");
                      }}
                      disabled={bulkActionLoading}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      Mark as Active
                    </button>
                    <button
                      onClick={async () => {
                        setShowBulkActions(false);
                        await handleBulkStatusUpdate("inactive");
                      }}
                      disabled={bulkActionLoading}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      Mark as Inactive
                    </button>
                    <button
                      onClick={async () => {
                        setShowBulkActions(false);
                        await handleBulkFeatured(true);
                      }}
                      disabled={bulkActionLoading}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      Mark as Featured
                    </button>
                    <button
                      onClick={async () => {
                        setShowBulkActions(false);
                        await handleBulkFeatured(false);
                      }}
                      disabled={bulkActionLoading}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      Remove Featured
                    </button>
                    <div className="border-t border-neutral-200 my-1" />
                    <button
                      onClick={() => {
                        setShowBulkActions(false);
                        handleBulkDelete();
                      }}
                      disabled={bulkActionLoading}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {bulkActionLoading ? "Deleting..." : "Delete Selected"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Select All Checkbox */}
        {filteredTours.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
            >
              {selectedIds.size === filteredTours.length ? (
                <CheckSquare size={18} className="text-primary-600" />
              ) : (
                <Square size={18} className="text-neutral-400" />
              )}
              <span>
                {selectedIds.size === filteredTours.length
                  ? "Deselect all"
                  : "Select all"}
              </span>
            </button>
          </div>
        )}

        {filteredTours.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredTours.map((tour, index) => (
              <motion.div
                key={tour.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-medium transition-shadow relative"
              >
                <div className="absolute top-4 left-4">
                  <button
                    onClick={() => handleSelectOne(tour.id)}
                    className="flex items-center"
                  >
                    {selectedIds.has(tour.id) ? (
                      <CheckSquare size={18} className="text-primary-600" />
                    ) : (
                      <Square size={18} className="text-neutral-400" />
                    )}
                  </button>
                </div>
                <div className="flex items-start justify-between gap-2 pl-6">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-900">{tour.name}</h3>
                    <p className="text-sm text-neutral-500">
                      {tour.primaryDestination || tour.destination}
                      {tour.destinationState && `, ${tour.destinationState}`}
                      {tour.destinationCountry && `, ${tour.destinationCountry}`}
                      {tour.country?.name && ` · ${tour.country.name}`}
                    </p>
                    {(tour.tourType || tour.region) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tour.tourType && (
                          <span className="inline-flex items-center gap-1 text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                            <Tag size={10} />
                            {tour.tourType}
                          </span>
                        )}
                        {tour.region && (
                          <span className="inline-flex items-center gap-1 text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                            <Globe size={10} />
                            {tour.region}
                          </span>
                        )}
                        {tour.packageType && (
                          <span className="inline-flex items-center gap-1 text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                            <Package size={10} />
                            {tour.packageType}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {tour.isFeatured && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        Featured
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        tour.status === "active" || (tour.isActive && !tour.status)
                          ? "bg-green-50 text-green-700"
                          : tour.status === "draft"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {tour.status || (tour.isActive ? "Active" : "Inactive")}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-neutral-600 mt-4">
                  <div>
                    <div className="text-xs text-neutral-500 uppercase">Duration</div>
                    <div className="font-medium text-neutral-900">
                      {tour.durationDays && tour.durationNights
                        ? `${tour.durationDays}D/${tour.durationNights}N`
                        : tour.duration}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase">Price</div>
                    <div className="font-medium text-neutral-900">
                      {tour.currency === "INR" ? "₹" : tour.currency || "₹"}
                      {(tour.basePriceInInr ?? tour.price).toLocaleString()}
                      {tour.originalPrice && tour.originalPrice > (tour.basePriceInInr ?? tour.price) && (
                        <span className="text-xs text-neutral-500 line-through ml-1">
                          {tour.currency === "INR" ? "₹" : tour.currency || "₹"}
                          {tour.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase">Updated</div>
                    <div className="font-medium text-neutral-900 text-xs">
                      {new Date(tour.updatedAt).toLocaleDateString()}
                    </div>
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
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        entityType="tours"
        entityName="Tours"
        onImportComplete={() => {
          fetchTours(filters);
          setShowImportModal(false);
        }}
      />
    </AdminLayout>
  );
}
