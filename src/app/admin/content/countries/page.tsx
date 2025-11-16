"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Edit, Globe, Search, RefreshCw, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Image from "next/image";

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
    if (session.user.role !== "SUPER_ADMIN") {
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
      } else {
        const error = await response.json();
        alert(error.error || "Unable to delete country");
      }
    } catch (error) {
      console.error("Failed to delete country", error);
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="search"
              placeholder="Search by name, code or region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500"
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

        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
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
                    <div className="flex items-center gap-3">
                      {country.flagUrl ? (
                        <Image
                          src={country.flagUrl}
                          alt={`${country.name} flag`}
                          width={40}
                          height={24}
                          unoptimized
                          className="rounded object-cover border border-neutral-200"
                        />
                      ) : (
                        <div className="h-6 w-10 rounded bg-neutral-100 border border-neutral-200" />
                      )}
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
                  <td colSpan={7} className="text-center py-10 text-neutral-500">
                    No countries match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

