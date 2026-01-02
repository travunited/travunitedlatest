"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit,
  FileText,
  Search,
  Filter,
  Star,
  Copy,
  RefreshCw,
  CheckSquare,
  Square,
  ChevronDown,
  Upload,
  Download,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ImportModal } from "@/components/admin/ImportModal";
import { useDebounce } from "@/hooks/useDebounce";



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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if value or onChange reference changes
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
      className={`px-3 py-2 border border-neutral-200 rounded-lg text-sm ${className}`}
    >
      {children}
    </select>
  );
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.className === nextProps.className;
});
SelectInput.displayName = "SelectInput";

interface VisaRecord {
  id: string;
  name: string;
  slug: string;
  subtitle?: string | null;
  category: string;
  priceInInr: number;
  processingTime: string;
  entryType?: string | null;
  entryTypeLegacy?: string | null;
  visaMode?: string | null;
  stayType?: string | null;
  visaSubTypeLabel?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  // New fields
  sampleVisaImageUrl?: string | null;
  currency?: string | null;
  country: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    requirements: number;
    applications: number;
  };
}

interface CountryOption {
  id: string;
  name: string;
}

const categories = ["Employment", "Business", "Tourist", "Student", "Transit", "Medical", "Other"];

const visaModeLabels: Record<string, string> = {
  EVISA: "eVisa",
  STICKER: "Sticker",
  VOA: "Visa on Arrival",
  VFS: "VFS Appointment",
  ETA: "ETA",
  PRE_ENROLLMENT: "Pre Enrollment",
  ARRIVAL_CARD: "Arrival Card",
  VISA_FREE_ENTRY: "Visa Free Entry",
  SCHENGEN_VISA: "Schengen Visa",
  APPOINTMENTS: "Appointments",
  OTHER: "Other",
};

const entryTypeLabels: Record<string, string> = {
  SINGLE: "Single Entry",
  DOUBLE: "Double Entry",
  MULTIPLE: "Multiple Entry",
};

const stayTypeLabels: Record<string, string> = {
  SHORT_STAY: "Short Stay",
  LONG_STAY: "Long Stay",
};

const formatEnumLabel = (
  value: string | null | undefined,
  labels: Record<string, string>
) => {
  if (!value) return null;
  return labels[value] || value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};

const buildVisaSubtypeLabel = (visa: VisaRecord) => {
  if (visa.visaSubTypeLabel) {
    return visa.visaSubTypeLabel;
  }
  const parts: string[] = [];
  const entryLabel = formatEnumLabel(visa.entryType, entryTypeLabels);
  const stayLabel = formatEnumLabel(visa.stayType, stayTypeLabels);
  if (entryLabel) parts.push(entryLabel);
  if (stayLabel) parts.push(stayLabel);
  if (parts.length > 0) {
    return parts.join(" • ");
  }
  return visa.entryTypeLegacy || "Not specified";
};

type VisaFilters = {
  countryId: string;
  category: string;
  status: "all" | "active" | "inactive";
  search: string;
};

const VISA_FILTER_DEFAULT: VisaFilters = {
  countryId: "",
  category: "",
  status: "all",
  search: "",
};



export default function AdminVisasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [visas, setVisas] = useState<VisaRecord[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<VisaFilters>({
    countryId: "",
    category: "",
    status: "all",
    search: "",
  });

  // Debounced search for API calls
  const debouncedSearch = useDebounce(filters.search, 300);

  // -- Data Fetching --

  const fetchCountries = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content/countries");
      if (response.ok) {
        const data = await response.json();
        setCountries(data.map((country: any) => ({
          id: country.id,
          name: country.name,
        })));
      }
    } catch (error) {
      console.error("Error loading countries", error);
    }
  }, []);

  const fetchVisas = useCallback(async (currentFilters: VisaFilters, isRefresh = false) => {
    if (!isRefresh) setIsFiltering(true);

    try {
      const params = new URLSearchParams();
      if (currentFilters.countryId) params.set("countryId", currentFilters.countryId);
      if (currentFilters.category) params.set("category", currentFilters.category);
      if (currentFilters.status && currentFilters.status !== "all")
        params.set("status", currentFilters.status);
      if (currentFilters.search) params.set("search", currentFilters.search);

      const response = await fetch(
        `/api/admin/content/visas${params.toString() ? `?${params}` : ""}`
      );
      if (response.ok) {
        const data = await response.json();
        setVisas(data);
      }
    } catch (error) {
      console.error("Error fetching visas:", error);
    } finally {
      setIsFiltering(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  // -- Effects --

  // 1. Authentication check
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      router.push("/admin");
    }
  }, [session, status, router]);

  // 2. Initial Data Load
  useEffect(() => {
    if (status === "authenticated") {
      Promise.all([fetchCountries(), fetchVisas(filters)]).finally(() =>
        setInitialLoading(false)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // Only run once on auth confirmation

  // 3. Reactive Fetch on Filter Changes
  useEffect(() => {
    if (!initialLoading) {
      // Create a filter object with the DEBOUNCED search value
      const filtersToFetch = {
        ...filters,
        search: debouncedSearch
      };

      // We essentially want to ignore the direct filters.search update and wait for debouncedSearch
      // But we DO want to fetch immediately on other filter changes.
      // The dependency array handles this.
      fetchVisas(filtersToFetch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.countryId, filters.category, filters.status, debouncedSearch]); // Dependencies explicitly listed

  // -- Handlers --

  const handleFilterChange = (field: keyof VisaFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    // No manual fetch call needed thanks to useEffect
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVisas(filters, true);
  };

  const handleToggleStatus = async (visa: VisaRecord) => {
    try {
      // Optimistic update
      setVisas(prev => prev.map(v => v.id === visa.id ? { ...v, isActive: !v.isActive } : v));

      await fetch(`/api/admin/content/visas/${visa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !visa.isActive }),
      });
      // No refetch needed if optimistic update succeeds
    } catch (error) {
      console.error("Failed to toggle visa status", error);
      // Revert on failure
      fetchVisas(filters);
    }
  };


  const handleToggleFeatured = async (visa: VisaRecord) => {
    try {
      await fetch(`/api/admin/content/visas/${visa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !visa.isFeatured }),
      });
      fetchVisas(filters);
    } catch (error) {
      console.error("Failed to toggle featured status", error);
      alert("Failed to update featured status");
    }
  };



  const handleSelectAll = () => {
    if (selectedIds.size === filteredVisas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVisas.map((v) => v.id)));
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (
      !confirm(
        `Are you sure you want to permanently delete ${count} visa record(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/admin/content/visas/bulk/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        const result = await response.json();
        await fetchVisas(filters);
        setSelectedIds(new Set());
        alert(result.message || `Successfully deleted ${count} visa record(s)`);
      } else {
        const error = await response.json();
        if (error.details) {
          const details = error.details.visas || "";
          alert(
            `${error.error}\n\nFailed visas: ${details}\n\nThese visas have active applications.`
          );
        } else {
          alert(error.error || "Failed to delete visas");
        }
      }
    } catch (error) {
      console.error("Error bulk deleting visas:", error);
      alert("An error occurred while deleting");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const filteredVisas = useMemo(() => visas, [visas]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading visas...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Visa CMS</h1>
            <p className="text-neutral-500 mt-1">
              Manage visa products with pricing, requirements and Atlys-style content.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 border border-neutral-200 px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                disabled={refreshing || isFiltering}
              >
                <RefreshCw
                  size={16}
                  className={refreshing || isFiltering ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-2 border border-neutral-200 px-4 py-2 rounded-lg text-neutral-700 hover:bg-neutral-50"
              >
                <Upload size={18} />
                Import
              </button>
              <button
                onClick={() => {
                  window.open("/api/admin/content/visas/export?format=xlsx", "_blank");
                }}
                className="inline-flex items-center gap-2 border border-neutral-200 px-4 py-2 rounded-lg text-neutral-700 hover:bg-neutral-50 ml-2"
              >
                <Download size={18} />
                Export
              </button>
            </div>
            <Link
              href="/admin/content/visas/new"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700"
            >
              <Plus size={18} />
              Create Visa
            </Link>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <SearchInput
                value={filters.search}
                onChange={(value) => handleFilterChange("search", value)}
                placeholder="Search visas..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                <Filter size={16} />
                Filters
              </div>
              <SelectInput
                value={filters.countryId}
                onChange={(value) => handleFilterChange("countryId", value)}
              >
                <option value="">All countries</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                value={filters.category}
                onChange={(value) => handleFilterChange("category", value)}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                value={filters.status}
                onChange={(value) => handleFilterChange("status", value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary-900">
                {selectedIds.size} visa{selectedIds.size !== 1 ? "s" : ""} selected
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
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
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
        {filteredVisas.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
            >
              {selectedIds.size === filteredVisas.length ? (
                <CheckSquare size={18} className="text-primary-600" />
              ) : (
                <Square size={18} className="text-neutral-400" />
              )}
              <span>
                {selectedIds.size === filteredVisas.length
                  ? "Deselect all"
                  : "Select all"}
              </span>
            </button>
          </div>
        )}

        {/* List Content */}
        {isFiltering && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-2xl pointer-events-none">
            <div className="bg-white p-2 rounded-full shadow-lg">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          </div>
        )}

        {filteredVisas.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredVisas.map((visa, index) => {
              const visaModeDisplay =
                formatEnumLabel(visa.visaMode, visaModeLabels) || "Not specified";
              const entryDisplay =
                formatEnumLabel(visa.entryType, entryTypeLabels) ||
                visa.entryTypeLegacy ||
                "Not specified";
              const stayDisplay =
                formatEnumLabel(visa.stayType, stayTypeLabels) || "Not specified";
              const subtypeDisplay = buildVisaSubtypeLabel(visa);
              return (
                <motion.div
                  key={visa.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 hover:shadow-medium transition-shadow relative"
                >
                  <div className="absolute top-4 left-4">
                    <button
                      onClick={() => handleSelectOne(visa.id)}
                      className="flex items-center"
                    >
                      {selectedIds.has(visa.id) ? (
                        <CheckSquare size={18} className="text-primary-600" />
                      ) : (
                        <Square size={18} className="text-neutral-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-start justify-between gap-3 pl-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-neutral-900">
                          {visa.name}
                        </h2>
                      </div>
                      <p className="text-sm text-neutral-500">
                        {visa.country?.name || 'Unknown'} &middot; {visa.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFeatured(visa)}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition-colors ${visa.isFeatured
                          ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                          : "text-neutral-500 bg-neutral-100 hover:bg-neutral-200"
                          }`}
                        title={visa.isFeatured ? "Remove from homepage" : "Show on homepage"}
                      >
                        <Star size={12} className={visa.isFeatured ? "fill-amber-500 text-amber-500" : ""} />
                        Featured
                      </button>
                      <button
                        onClick={() => handleToggleStatus(visa)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${visa.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-neutral-100 text-neutral-600"
                          }`}
                      >
                        {visa.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-neutral-600">
                    <div>
                      <div className="text-xs text-neutral-500 uppercase">Processing</div>
                      <div className="font-medium text-neutral-900">{visa.processingTime}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 uppercase">Visa Mode</div>
                      <div className="font-medium text-neutral-900">{visaModeDisplay}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 uppercase">Entry Type</div>
                      <div className="font-medium text-neutral-900">{entryDisplay}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 uppercase">Stay Type</div>
                      <div className="font-medium text-neutral-900">{stayDisplay}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-neutral-500 uppercase">Subtype</div>
                      <div className="font-medium text-neutral-900">{subtypeDisplay}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 uppercase">Documents</div>
                      <div className="font-medium text-neutral-900">
                        {visa._count.requirements} requirements
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-primary-600">
                        {visa.currency === "INR" ? "₹" : visa.currency === "USD" ? "$" : visa.currency === "EUR" ? "€" : visa.currency === "AED" ? "د.إ" : visa.currency === "GBP" ? "£" : visa.currency || "₹"}
                        {visa.priceInInr.toLocaleString()}
                      </div>
                      <div className="text-xs text-neutral-500">Per traveller</div>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <Link
                        href={`/admin/content/visas/${visa.id}`}
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                      >
                        <Edit size={16} />
                        Edit
                      </Link>
                      <button
                        onClick={() =>
                          router.push(`/admin/content/visas/new?clone=${visa.id}`)
                        }
                        className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-800"
                      >
                        <Copy size={16} />
                        Duplicate
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-neutral-200 p-12 text-center">
            <FileText size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 mb-4">No visas match your filters.</p>
            <Link
              href="/admin/content/visas/new"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus size={18} />
              Add your first visa
            </Link>
          </div>
        )}
      </div>
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        entityType="visas"
        entityName="Visas"
        onImportComplete={() => {
          fetchVisas(filters);
          setShowImportModal(false);
        }}
      />
    </AdminLayout>
  );
}
