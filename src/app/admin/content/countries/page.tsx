"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Edit, Globe, Search, RefreshCw, Trash2, ToggleLeft, ToggleRight, CheckSquare, Square, ChevronDown, Upload, Download } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ImportModal } from "@/components/admin/ImportModal";
import Image from "next/image";
import { getCountryFlagUrl } from "@/lib/flags";

// Memoized search input to prevent focus loss
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

interface CountryRecord {
  id: string;
  name: string;
  code: string;
  region?: string | null;
  flagUrl?: string | null;
  isActive: boolean;
  _count: {
    visas: number;
    tours: number;
  };
}

export default function AdminCountriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchCountries = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/content/countries");
      if (response.ok) {
        const data = await response.json();
        setCountries(data);
      }
    } catch (error) {
      console.error("Failed to load countries", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      router.push("/admin");
      return;
    }
    fetchCountries();
  }, [session, status, router, fetchCountries]);

  const filteredCountries = useMemo(() => {
    return countries.filter((country) => {
      const matchesSearch =
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (country.region?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && country.isActive) ||
        (statusFilter === "inactive" && !country.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [countries, searchQuery, statusFilter]);

  const handleToggleStatus = async (country: CountryRecord) => {
    try {
      const response = await fetch(`/api/admin/content/countries/${country.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...country,
          region: country.region || "",
          flagUrl: country.flagUrl || "",
          isActive: !country.isActive,
        }),
      });
      if (response.ok) {
        fetchCountries();
      }
    } catch (error) {
      console.error("Failed to toggle country status", error);
    }
  };

  const handleDelete = async (country: CountryRecord) => {
    if (country._count.visas > 0 || country._count.tours > 0) {
      alert("Cannot delete a country while visas or tours exist. Deactivate instead.");
      return;
    }
    if (!confirm(`Delete ${country.name}? This action cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/admin/content/countries/${country.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setCountries((prev) => prev.filter((item) => item.id !== country.id));
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(country.id);
          return newSet;
        });
      } else {
        const error = await response.json();
        alert(error.error || "Unable to delete country");
      }
    } catch (error) {
      console.error("Failed to delete country", error);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredCountries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCountries.map((c) => c.id)));
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
    const selectedCountries = filteredCountries.filter((c) => selectedIds.has(c.id));
    const hasLinkedItems = selectedCountries.some(
      (c) => c._count.visas > 0 || c._count.tours > 0
    );

    if (hasLinkedItems) {
      alert(
        "Some selected countries have linked visas or tours. Please deselect them or deactivate instead."
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to permanently delete ${count} country record(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/admin/content/countries/bulk/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        const result = await response.json();
        await fetchCountries();
        setSelectedIds(new Set());
        alert(result.message || `Successfully deleted ${count} country record(s)`);
      } else {
        const error = await response.json();
        if (error.details) {
          const details = error.details.countries || [];
          const failedNames = details.map((d: any) => d.name).join(", ");
          alert(
            `${error.error}\n\nFailed countries: ${failedNames}\n\nThese countries have linked visas or tours.`
          );
        } else {
          alert(error.error || "Failed to delete countries");
        }
      }
    } catch (error) {
      console.error("Error bulk deleting countries:", error);
      alert("An error occurred while deleting");
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (loading && !countries.length) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-neutral-600">Loading countries...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">
              <Globe className="text-primary-600" /> Countries
            </h1>
            <p className="text-neutral-500 mt-1">
              Manage destination countries for visas and tours.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchCountries();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 border border-neutral-200 px-4 py-2 rounded-lg text-neutral-700 hover:bg-neutral-50"
            >
              <Upload size={18} />
              Import
            </button>
            <button
              onClick={() => {
                window.open("/api/admin/content/countries/export?format=xlsx", "_blank");
              }}
              className="inline-flex items-center gap-2 border border-neutral-200 px-4 py-2 rounded-lg text-neutral-700 hover:bg-neutral-50"
            >
              <Download size={18} />
              Export
            </button>
            <Link
              href="/admin/content/countries/new"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700"
            >
              <Plus size={18} />
              Add Country
            </Link>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, code or region..."
            />
          </div>
          <div className="flex items-center gap-2">
            {["all", "active", "inactive"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as typeof statusFilter)}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize ${
                  statusFilter === status
                    ? "bg-primary-600 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary-900">
                {selectedIds.size} country{selectedIds.size !== 1 ? "ies" : ""} selected
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

        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center"
                    title={
                      selectedIds.size === filteredCountries.length
                        ? "Deselect all"
                        : "Select all"
                    }
                  >
                    {selectedIds.size === filteredCountries.length &&
                    filteredCountries.length > 0 ? (
                      <CheckSquare size={18} className="text-primary-600" />
                    ) : (
                      <Square size={18} className="text-neutral-400" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Country</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Region</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">Visas</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase">Tours</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredCountries.map((country) => (
                <tr key={country.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleSelectOne(country.id)}
                      className="flex items-center"
                    >
                      {selectedIds.has(country.id) ? (
                        <CheckSquare size={18} className="text-primary-600" />
                      ) : (
                        <Square size={18} className="text-neutral-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const flagUrl = getCountryFlagUrl(country.flagUrl, country.code, 160);
                        return flagUrl ? (
                          <Image
                            src={flagUrl}
                            alt={`${country.name} flag`}
                            width={40}
                            height={24}
                            unoptimized
                            className="rounded object-cover border border-neutral-200"
                          />
                        ) : (
                          <div className="h-6 w-10 rounded bg-neutral-100 border border-neutral-200" />
                        );
                      })()}
                      <div>
                        <div className="font-medium text-neutral-900">{country.name}</div>
                        {country.region && (
                          <div className="text-xs text-neutral-500">{country.region}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-neutral-800">{country.code}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{country.region || "—"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        country.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {country.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-neutral-900">
                    {country._count.visas}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-neutral-900">
                    {country._count.tours}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-3 text-sm">
                      <button
                        onClick={() => handleToggleStatus(country)}
                        className="text-neutral-500 hover:text-primary-600"
                        title={country.isActive ? "Deactivate" : "Activate"}
                      >
                        {country.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <Link
                        href={`/admin/content/countries/${country.id}`}
                        className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                      >
                        <Edit size={16} />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(country)}
                        className="text-red-500 hover:text-red-600 disabled:opacity-40"
                        disabled={country._count.visas > 0 || country._count.tours > 0}
                        title={
                          country._count.visas > 0 || country._count.tours > 0
                            ? "Linked entries exist"
                            : "Delete country"
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCountries.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-neutral-500">
                    No countries match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        entityType="countries"
        entityName="Countries"
        onImportComplete={() => {
          fetchCountries();
          setShowImportModal(false);
        }}
      />
    </AdminLayout>
  );
}

