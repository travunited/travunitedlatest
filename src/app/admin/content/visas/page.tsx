"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Edit,
  FileText,
  Search,
  Filter,
  Star,
  Copy,
  RefreshCw,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface VisaRecord {
  id: string;
  name: string;
  slug: string;
  subtitle?: string | null;
  category: string;
  priceInInr: number;
  processingTime: string;
  stayDuration: string;
  entryType: string;
  isActive: boolean;
  isFeatured: boolean;
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

const categories = ["Tourist", "Business", "Transit", "Student", "Other"];

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
  const [visas, setVisas] = useState<VisaRecord[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VisaFilters>(VISA_FILTER_DEFAULT);
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
      console.error("Error loading countries", error);
    }
  }, []);

  const fetchVisas = useCallback(async (activeFilters: VisaFilters) => {
    try {
      const params = new URLSearchParams();
      if (activeFilters.countryId) params.set("countryId", activeFilters.countryId);
      if (activeFilters.category) params.set("category", activeFilters.category);
      if (activeFilters.status && activeFilters.status !== "all")
        params.set("status", activeFilters.status);
      if (activeFilters.search) params.set("search", activeFilters.search);

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
    Promise.all([fetchCountries(), fetchVisas(VISA_FILTER_DEFAULT)]).finally(() =>
      setLoading(false)
    );
  }, [session, status, router, fetchCountries, fetchVisas]);

  const handleFilterChange = (field: string, value: string) => {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
    fetchVisas(nextFilters);
  };

  const handleToggleStatus = async (visa: VisaRecord) => {
    try {
      await fetch(`/api/admin/content/visas/${visa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !visa.isActive }),
      });
      fetchVisas();
    } catch (error) {
      console.error("Failed to toggle visa status", error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVisas(filters);
  };

  const filteredVisas = useMemo(() => visas, [visas]);

  if (loading) {
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
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 border border-neutral-200 px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                placeholder="Search visas..."
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
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
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

        {filteredVisas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVisas.map((visa, index) => (
              <motion.div
                key={visa.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 hover:shadow-medium transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-neutral-900">
                        {visa.name}
                      </h2>
                      {visa.isFeatured && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Star size={12} className="fill-amber-500 text-amber-500" />
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500">
                      {visa.country.name} &middot; {visa.category}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(visa)}
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      visa.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {visa.isActive ? "Active" : "Inactive"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-neutral-600">
                  <div>
                    <div className="text-xs text-neutral-500 uppercase">Processing</div>
                    <div className="font-medium text-neutral-900">{visa.processingTime}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase">Stay</div>
                    <div className="font-medium text-neutral-900">{visa.stayDuration}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 uppercase">Entry Type</div>
                    <div className="font-medium text-neutral-900">{visa.entryType}</div>
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
                      ₹{visa.priceInInr.toLocaleString()}
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
            ))}
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
    </AdminLayout>
  );
}
