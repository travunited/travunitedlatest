"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, Shield, TrendingUp, Clock, FileText, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";

interface AdminPerformance {
  id: string;
  name: string;
  email: string;
  applicationsAssigned: number;
  applicationsProcessed: number;
  avgProcessingTimeHours: number;
  pendingOver7Days: number;
  documentVerifications: number;
  bookingsProcessed: number;
}

export default function AdminPerformancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [admins, setAdmins] = useState<AdminPerformance[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    datePreset: "last30",
  });

  // Memoize filter values to prevent infinite re-renders
  const dateFrom = useMemo(() => filters.dateFrom, [filters.dateFrom]);
  const dateTo = useMemo(() => filters.dateTo, [filters.dateTo]);

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

      const response = await fetch(`/api/admin/reports/admin/performance?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load report: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setSummary(data.summary);
      setAdmins(data.rows || []);
    } catch (error: any) {
      console.error("Error fetching report:", error);
      setError(error.message || "Failed to load report. Please try again or contact support.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo]);

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
  }, [dateFrom, dateTo]);

  const handleExport = async (format: "xlsx" | "csv") => {
    try {
      const url = buildExportUrl("/api/admin/reports/admin/performance", filters, format);
      // For CSV/XLSX, open in new tab (works for these formats)
      window.open(url, "_blank");
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export ${format.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Only show full-page loader on initial load
  const isInitialLoad = loading && !summary && !error;

  if (isInitialLoad) {
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

  if (error && admins.length === 0) {
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
          <h1 className="text-3xl font-bold text-neutral-900">Admin Performance</h1>
          <p className="text-neutral-600 mt-1">Per admin workload and KPIs</p>
        </div>

        <ReportFilterBar
          onFilterChange={setFilters}
          showCountry={false}
          showStatus={false}
          showPaymentStatus={false}
          showType={false}
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

        <div className={loading && (summary || admins.length > 0) ? "opacity-50 pointer-events-none transition-opacity" : ""}>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Total Admins</h3>
                  <Shield size={20} className="text-primary-600" />
                </div>
                <p className="text-3xl font-bold text-neutral-900">{summary.totalAdmins}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Applications Assigned</h3>
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-700">{summary.totalApplicationsAssigned}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Applications Processed</h3>
                  <TrendingUp size={20} className="text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-700">{summary.totalApplicationsProcessed}</p>
              </div>
            </div>
          )}

          {/* Admins Table */}
          <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900">Admin Performance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Assigned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Processed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Avg Processing Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Pending &gt;7 Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Doc Verifications</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{admin.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{admin.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{admin.applicationsAssigned}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-medium">{admin.applicationsProcessed}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{admin.avgProcessingTimeHours.toFixed(1)} hrs</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {admin.pendingOver7Days > 0 ? (
                          <span className="text-red-700 font-medium">{admin.pendingOver7Days}</span>
                        ) : (
                          <span className="text-neutral-600">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{admin.documentVerifications}</td>
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

