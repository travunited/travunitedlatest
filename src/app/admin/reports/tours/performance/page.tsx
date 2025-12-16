"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, TrendingUp, Calendar, FileText, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";

interface TourPerformance {
  tourId: string;
  tourName: string;
  countryName: string;
  totalBookings: number;
  paidBookings: number;
  totalRevenue: number;
  avgTravellers: number;
  cancelledCount: number;
  cancellationRate: number;
}

export default function TourPerformancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tours, setTours] = useState<TourPerformance[]>([]);
  const [countries, setCountries] = useState<Array<{ id: string; name: string }>>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    datePreset: "last30",
  });

  const fetchCountries = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content/countries");
      if (response.ok) {
        const data = await response.json();
        setCountries(data.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  }, []);

  // Memoize filter values to prevent infinite re-renders
  const dateFrom = useMemo(() => filters.dateFrom, [filters.dateFrom]);
  const dateTo = useMemo(() => filters.dateTo, [filters.dateTo]);
  const countryIds = useMemo(() => filters.countryIds || [], [filters.countryIds]);

  const fetchReport = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (countryIds.length > 0) {
        countryIds.forEach((id) => params.append("countryIds", id));
      }

      const response = await fetch(`/api/admin/reports/tours/performance?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load report: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setTours(data.rows || []);
    } catch (error: any) {
      console.error("Error fetching report:", error);
      setError(error.message || "Failed to load report. Please try again or contact support.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, countryIds]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  // Fetch report when authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
      if (!isSuperAdmin) {
        router.push("/admin");
        return;
      }
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.role, status]);

  // Refetch when filters change
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "SUPER_ADMIN") {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, countryIds]);

  const handleExport = async (format: "xlsx" | "csv") => {
    try {
      const url = buildExportUrl("/api/admin/reports/tours/performance", filters, format);
      // For CSV/XLSX, open in new tab (works for these formats)
      window.open(url, "_blank");
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export ${format.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  if (loading && tours.length === 0) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading report...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && tours.length === 0) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Failed to Load Report</h2>
            <p className="text-neutral-600 mb-6">{error}</p>
            <button
              onClick={() => fetchReport()}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Tour Performance</h1>
          <p className="text-neutral-600 mt-1">Per tour package performance metrics</p>
        </div>

        <ReportFilterBar
          onFilterChange={setFilters}
          showCountry={true}
          showStatus={false}
          showPaymentStatus={false}
          showType={false}
          countries={countries}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => fetchReport(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            <FileDown size={16} />
            Export Excel
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        <div className={loading && tours.length > 0 ? "opacity-50 pointer-events-none transition-opacity" : ""}>
          {/* Summary Cards */}
          {tours.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Total Tours</h3>
                  <Calendar size={20} className="text-primary-600" />
                </div>
                <p className="text-3xl font-bold text-neutral-900">{tours.length}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Total Bookings</h3>
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-700">
                  {tours.reduce((sum, t) => sum + t.totalBookings, 0)}
                </p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Total Revenue</h3>
                  <TrendingUp size={20} className="text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-700">
                  ₹{tours.reduce((sum, t) => sum + t.totalRevenue, 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Tours Table */}
          <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900">Tour Performance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Tour Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Country</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Avg Travellers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Cancellation Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {tours.map((tour) => (
                    <tr key={tour.tourId} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{tour.tourName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{tour.countryName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{tour.totalBookings}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{tour.paidBookings}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">₹{tour.totalRevenue.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{tour.avgTravellers.toFixed(1)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{tour.cancellationRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

