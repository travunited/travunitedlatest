"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Search, Filter, Star, RefreshCw, Upload, Globe, Tag, Eye, Trash2, Download, ArrowUpDown, X, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ImportModal } from "@/components/admin/ImportModal";
import { formatDate } from "@/lib/dateFormat";

// Memoized input components to prevent focus loss
const SearchInput = memo(({ value, onChange, placeholder }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if value or onChange reference changes
  // This prevents re-renders when parent re-renders due to other state changes
  return prevProps.value === nextProps.value && 
         prevProps.placeholder === nextProps.placeholder &&
         prevProps.onChange === nextProps.onChange;
});
SearchInput.displayName = "SearchInput";

const SelectInput = memo(({ value, onChange, children, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <select
      value={value}
      onChange={handleChange}
      className={`w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm ${className}`}
    >
      {children}
    </select>
  );
});
SelectInput.displayName = "SelectInput";

const CheckboxInput = memo(({ checked, onChange }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  }, [onChange]);

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
    />
  );
});
CheckboxInput.displayName = "CheckboxInput";

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
  const [bulkActionMessage, setBulkActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sortField, setSortField] = useState<"createdAt" | "price" | "name" | "status">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
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
      setLoading(true);
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
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading" || bootstrapped.current) return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      router.push("/admin");
      return;
    }
    bootstrapped.current = true;
    Promise.all([fetchCountries(), fetchTours(TOUR_FILTER_DEFAULT)]).finally(() =>
      setLoading(false)
    );
  }, [session, status, router, fetchCountries, fetchTours]);

  const handleFilterChange = useCallback((field: keyof TourFilters, value: string) => {
    setFilters((prev) => {
      const nextFilters = { ...prev, [field]: value } as TourFilters;
      // Don't fetch immediately for search - it's handled by debounced handler
      if (field !== "search") {
        fetchTours(nextFilters);
      }
      return nextFilters;
    });
  }, [fetchTours]);

  // Debounced search handler
  const [searchValue, setSearchValue] = useState(filters.search);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Sync searchValue with filters.search when filters change externally
    if (filters.search !== searchValue) {
      setSearchValue(filters.search);
    }
  }, [filters.search, searchValue]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      setFilters((prev) => {
        const nextFilters = { ...prev, search: value } as TourFilters;
        fetchTours(nextFilters);
        return nextFilters;
      });
    }, 300);
  }, [fetchTours]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTours(filters);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedTours.map(t => t.id)));
      setShowBulkActions(true);
    } else {
      setSelectedIds(new Set());
      setShowBulkActions(false);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      if (newSet.size > 0) {
        setShowBulkActions(true);
      } else {
        setShowBulkActions(false);
      }
      return newSet;
    });
  };

  const handleBulkAction = async (action: string, value?: string) => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    setBulkActionMessage(null);

    try {
      switch (action) {
        case "status":
          if (!value) return;
          const statusValue = value === "active" ? "active" : "inactive";
      const response = await fetch("/api/admin/content/tours/bulk/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
              status: statusValue,
              isActive: statusValue === "active",
        }),
      });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to update status");
          }
          setBulkActionMessage({ type: "success", text: `Successfully updated ${selectedIds.size} tour(s)` });
          break;
        case "featured":
          const featuredValue = value === "true";
          const featuredResponse = await fetch("/api/admin/content/tours/bulk/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
              featured: featuredValue,
        }),
      });
          if (!featuredResponse.ok) {
            const errorData = await featuredResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to update featured status");
          }
          setBulkActionMessage({ type: "success", text: `Successfully ${featuredValue ? "featured" : "unfeatured"} ${selectedIds.size} tour(s)` });
          break;
        case "delete":
          if (!confirm("Are you absolutely sure? This action cannot be undone.")) {
      setBulkActionLoading(false);
      return;
    }
          const deleteResponse = await fetch("/api/admin/content/tours/bulk/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to delete tours");
          }
          setBulkActionMessage({ type: "success", text: `Successfully deleted ${selectedIds.size} tour(s)` });
          break;
        case "export":
          const exportResponse = await fetch(`/api/admin/content/tours/export?ids=${Array.from(selectedIds).join(",")}`);
          if (!exportResponse.ok) {
            const errorData = await exportResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to export tours");
          }
          const blob = await exportResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `tours-${new Date().toISOString().split("T")[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          setBulkActionMessage({ type: "success", text: `Successfully exported ${selectedIds.size} tour(s)` });
          setBulkActionLoading(false);
          setTimeout(() => setBulkActionMessage(null), 5000);
          return;
      }
      await fetchTours(filters);
      setSelectedIds(new Set());
      setShowBulkActions(false);
      setTimeout(() => setBulkActionMessage(null), 5000);
    } catch (error: any) {
      setBulkActionMessage({ type: "error", text: error.message || "An error occurred" });
      setTimeout(() => setBulkActionMessage(null), 5000);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getStatusColor = (tour: TourRecord) => {
    const status = tour.status || (tour.isActive ? "active" : "inactive");
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      inactive: "bg-neutral-100 text-neutral-600",
      draft: "bg-yellow-100 text-yellow-700",
    };
    return colors[status] || "bg-neutral-100 text-neutral-600";
  };

  const stats = useMemo(() => {
    const active = tours.filter(t => t.isActive && (!t.status || t.status === "active")).length;
    const inactive = tours.filter(t => !t.isActive || t.status === "inactive").length;
    const featured = tours.filter(t => t.isFeatured).length;
    const totalValue = tours.reduce((sum, t) => sum + (t.basePriceInInr || t.price || 0), 0);
    return {
      totalTours: tours.length,
      active,
      inactive,
      featured,
      totalValue,
    };
  }, [tours]);

  const sortedTours = useMemo(() => {
    const cloned = [...tours];
    return cloned.sort((a, b) => {
      let comparison = 0;
      if (sortField === "createdAt") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === "price") {
        comparison = (a.basePriceInInr || a.price || 0) - (b.basePriceInInr || b.price || 0);
      } else if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "status") {
        const aStatus = a.status || (a.isActive ? "active" : "inactive");
        const bStatus = b.status || (b.isActive ? "active" : "inactive");
        comparison = aStatus.localeCompare(bStatus);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [tours, sortField, sortDirection]);

  const handleSortChange = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "price" ? "desc" : "asc");
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const uniqueRegions = Array.from(new Set(tours.map(t => t.region).filter((r): r is string => Boolean(r))));
  const uniqueTourTypes = Array.from(new Set(tours.map(t => t.tourType).filter((t): t is string => Boolean(t))));

  if (loading) {
    return (
      <AdminLayout>
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold text-neutral-900">Tour CMS</h1>
            <p className="text-neutral-500 text-sm md:text-base">
              Manage curated itineraries, pricing, media and advance payment rules.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total Tours",
                value: stats.totalTours.toString(),
                accent: "bg-primary-50 text-primary-700 border border-primary-100",
              },
              {
                label: "Active Tours",
                value: stats.active.toString(),
                accent: "bg-emerald-50 text-emerald-700 border border-emerald-100",
              },
              {
                label: "Featured Tours",
                value: stats.featured.toString(),
                accent: "bg-amber-50 text-amber-700 border border-amber-100",
              },
              {
                label: "Total Value",
                value: stats.totalValue ? formatCurrency(stats.totalValue) : "₹0",
                accent: "bg-blue-50 text-blue-700 border border-blue-100",
              },
            ].map((card, idx) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-2xl px-5 py-4 backdrop-blur shadow-sm ${card.accent}`}
              >
                <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">{card.label}</p>
                <p className="text-2xl font-semibold mt-1">{card.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "All",
                action: () => {
                  setFilters(TOUR_FILTER_DEFAULT);
                  fetchTours(TOUR_FILTER_DEFAULT);
                },
                active: filters.status === "all" && filters.featured === "all" && filters.tourType === "all" && filters.region === "all",
              },
              {
                label: "Active",
                action: () => {
                  setFilters({ ...filters, status: "active" });
                  fetchTours({ ...filters, status: "active" });
                },
                active: filters.status === "active",
              },
              {
                label: "Inactive",
                action: () => {
                  setFilters({ ...filters, status: "inactive" });
                  fetchTours({ ...filters, status: "inactive" });
                },
                active: filters.status === "inactive",
              },
              {
                label: "Featured",
                action: () => {
                  setFilters({ ...filters, featured: "yes" });
                  fetchTours({ ...filters, featured: "yes" });
                },
                active: filters.featured === "yes",
              },
              {
                label: "Draft",
                action: () => {
                  setFilters({ ...filters, status: "draft" });
                  fetchTours({ ...filters, status: "draft" });
                },
                active: filters.status === "draft",
              },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={chip.action}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  chip.active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          {uniqueRegions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
              <span className="font-medium">Popular regions:</span>
              {uniqueRegions.slice(0, 6).map((region) => (
                <button
                  key={region}
                  onClick={() => {
                    setFilters({ ...filters, region });
                    fetchTours({ ...filters, region });
                  }}
                  className="rounded-full border border-neutral-200 px-3 py-1 text-neutral-600 hover:border-neutral-400"
                >
                  {region}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-medium p-6 border border-neutral-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Filter size={20} className="text-neutral-400" />
              <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
                className="inline-flex items-center gap-2 border border-neutral-200 px-3 py-1.5 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 border border-neutral-200 px-3 py-1.5 rounded-lg text-sm text-neutral-700 hover:bg-neutral-50"
            >
                <Upload size={16} />
              Import
            </button>
            <Link
              href="/admin/content/tours/new"
                className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm"
            >
                <Plus size={18} />
              <span>Add Tour</span>
            </Link>
          </div>
        </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Search</label>
              <SearchInput
                value={searchValue}
                onChange={handleSearchChange}
                placeholder="Search tours..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Country</label>
              <SelectInput
                value={filters.countryId}
                onChange={(value) => handleFilterChange("countryId", value)}
              >
                <option value="">All Countries</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Status</label>
              <SelectInput
                value={filters.status}
                onChange={(value) => handleFilterChange("status", value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </SelectInput>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Tour Type</label>
              <SelectInput
                value={filters.tourType}
                onChange={(value) => handleFilterChange("tourType", value)}
              >
                <option value="all">All Types</option>
                {uniqueTourTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Region</label>
              <SelectInput
                value={filters.region}
                onChange={(value) => handleFilterChange("region", value)}
              >
                <option value="all">All Regions</option>
                {uniqueRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Featured</label>
              <SelectInput
                value={filters.featured}
                onChange={(value) => handleFilterChange("featured", value)}
              >
                <option value="all">All</option>
                <option value="yes">Featured</option>
                <option value="no">Not Featured</option>
              </SelectInput>
            </div>
          </div>
        </div>

        {/* Bulk Action Messages */}
        {bulkActionMessage && (
          <div
            className={`mb-6 rounded-lg p-4 flex items-center space-x-2 ${
              bulkActionMessage.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {bulkActionMessage.type === "success" ? (
              <CheckCircle size={20} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={20} className="flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{bulkActionMessage.text}</span>
            <button
              onClick={() => setBulkActionMessage(null)}
              className="ml-auto text-current opacity-70 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-neutral-900">
                {selectedIds.size} tour(s) selected
              </span>
              <div className="flex items-center space-x-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkAction("status", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="px-3 py-1 border border-neutral-300 rounded text-sm"
                  disabled={bulkActionLoading}
                >
                  <option value="">Bulk Status Change...</option>
                  <option value="active">Mark as Active</option>
                  <option value="inactive">Mark as Inactive</option>
                </select>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkAction("featured", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="px-3 py-1 border border-neutral-300 rounded text-sm"
                  disabled={bulkActionLoading}
                >
                  <option value="">Bulk Featured...</option>
                  <option value="true">Mark as Featured</option>
                  <option value="false">Remove Featured</option>
                </select>
                <button
                  onClick={() => handleBulkAction("export")}
                  disabled={bulkActionLoading}
                  className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded text-sm hover:bg-neutral-200 disabled:opacity-50 flex items-center space-x-1"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
                    <button
                  onClick={() => handleBulkAction("delete")}
                      disabled={bulkActionLoading}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 disabled:opacity-50 flex items-center space-x-1"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                    </button>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedIds(new Set());
                setShowBulkActions(false);
                setBulkActionMessage(null);
              }}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Tours Table */}
        {sortedTours.length > 0 ? (
          <div className="bg-white rounded-lg shadow-medium border border-neutral-200 overflow-hidden">
            <div className="flex flex-col gap-3 px-6 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-neutral-500">
                  Showing <span className="font-semibold text-neutral-800">{sortedTours.length}</span> tour(s)
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: "Date", field: "createdAt" as const },
                    { label: "Price", field: "price" as const },
                    { label: "Name", field: "name" as const },
                    { label: "Status", field: "status" as const },
                  ].map((option) => (
                  <button
                      key={option.field}
                      onClick={() => handleSortChange(option.field)}
                      className={`inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                        sortField === option.field
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                      }`}
                    >
                      <ArrowUpDown size={14} />
                      {option.label}
                      {sortField === option.field && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                  ))}
                </div>
              </div>
              <div className="h-px bg-neutral-100" />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      <CheckboxInput
                        checked={selectedIds.size === sortedTours.length && sortedTours.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Tour Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Destination
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Type / Region
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {sortedTours.map((tour) => (
                    <tr 
                      key={tour.id} 
                      className="hover:bg-neutral-50 cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('input[type="checkbox"]') || target.closest('button') || target.closest('a')) {
                          return;
                        }
                        router.push(`/admin/content/tours/${tour.id}`);
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <CheckboxInput
                          checked={selectedIds.has(tour.id)}
                          onChange={(checked) => handleSelectRow(tour.id, checked)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-neutral-900">{tour.name}</div>
                          {tour.isFeatured && (
                            <Star size={14} className="text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        {tour.slug && (
                          <div className="text-xs text-neutral-500 mt-1">/{tour.slug}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">
                          {tour.primaryDestination || tour.destination || "N/A"}
                        </div>
                        {tour.country && (
                          <div className="text-xs text-neutral-500">{tour.country.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
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
                      </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {tour.durationDays && tour.durationNights
                        ? `${tour.durationDays}D/${tour.durationNights}N`
                        : tour.duration}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        <div className="font-medium">
                          {formatCurrency(tour.basePriceInInr || tour.price || 0)}
                    </div>
                        {tour.originalPrice && tour.originalPrice > (tour.basePriceInInr || tour.price || 0) && (
                          <div className="text-xs text-neutral-500 line-through">
                            {formatCurrency(tour.originalPrice)}
                  </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tour)}`}>
                          {tour.status || (tour.isActive ? "Active" : "Inactive")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {formatDate(tour.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/admin/content/tours/${tour.id}`}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center space-x-1"
                  >
                          <Eye size={16} />
                          <span>View</span>
                  </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center space-y-4">
            <FileText size={48} className="text-neutral-300 mx-auto" />
            <div>
              <p className="text-lg font-semibold text-neutral-900">No tours match your filters</p>
              <p className="text-neutral-500 text-sm">Try clearing filters or adjusting the quick chips above.</p>
            </div>
            <button
              onClick={() => {
                setFilters(TOUR_FILTER_DEFAULT);
                fetchTours(TOUR_FILTER_DEFAULT);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Reset filters
            </button>
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
