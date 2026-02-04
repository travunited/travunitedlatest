"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, Calendar, TrendingUp, Users, FileText, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { ColumnSelector } from "@/components/admin/ColumnSelector";
import { buildExportUrl } from "@/lib/report-export";

interface TourSummary {
  totalBookings: number;
  paidBookings: number;
  statusCounts: Record<string, number>;
  totalRevenue: number;
  avgBookingValue: number;
  avgGroupSize: number;
}

export default function TourBookingsReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<TourSummary | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    datePreset: "last30",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Define available columns for export (21 columns)
  const availableColumns = useMemo(() => [
    { key: "Sr No", label: "Sr No" },
    { key: "Booking ID", label: "Booking ID" },
    { key: "Lead Date", label: "Lead Date" },
    { key: "Booking Date", label: "Booking Date" },
    { key: "Travel Start Date", label: "Travel Start Date" },
    { key: "Travel End Date", label: "Travel End Date" },
    { key: "Sales Person Name", label: "Sales Person Name" },
    { key: "Department", label: "Department" },
    { key: "Tour Type", label: "Tour Type" },
    { key: "Package Type", label: "Package Type" },
    { key: "Package Name", label: "Package Name" },
    { key: "Destination Country", label: "Destination Country" },
    { key: "Destination City", label: "Destination City" },
    { key: "No. of Nights", label: "No. of Nights" },
    { key: "No. of Adults", label: "No. of Adults" },
    { key: "No. of Children", label: "No. of Children" },
    { key: "Customer Type (Indian / Foreign)", label: "Customer Type" },
    { key: "Customer Name", label: "Customer Name" },
    { key: "PAN Number (Mandatory – International)", label: "PAN Number" },
    { key: "Mobile No", label: "Mobile No" },
    { key: "Email ID", label: "Email ID" },
    { key: "Status", label: "Status" }, // Helper for UI
    { key: "Payment Status", label: "Payment Status" }, // Helper
    { key: "Total Amount (INR)", label: "Amount" }, // Helper
  ], []);

  // Initialize selected columns with key columns for view
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "Sr No",
    "Booking ID",
    "Package Name",
    "Travel Start Date",
    "Customer Name",
    "Status",
    "Total Amount (INR)"
  ]);

  const dateFrom = useMemo(() => filters.dateFrom, [filters.dateFrom]);
  const dateTo = useMemo(() => filters.dateTo, [filters.dateTo]);
  const filterStatus = useMemo(() => filters.status, [filters.status]);

  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchReport = useCallback(async (showRefreshing = false) => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
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
      if (filterStatus) params.append("status", filterStatus);
      params.append("page", page.toString());
      params.append("limit", "50");

      const response = await fetch(`/api/admin/reports/tours/summary?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to load report: ${response.statusText}`);
      }
      const data = await response.json();

      if (mountedRef.current) {
        setSummary(data.summary);
        setBookings(data.rows || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error: any) {
      console.error("Error fetching report:", error);
      if (mountedRef.current) {
        setError(error.message || "Failed to load report. Please try again or contact support.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      isFetchingRef.current = false;
    }
  }, [dateFrom, dateTo, filterStatus, page]);

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
    }
  }, [session?.user?.role, status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "SUPER_ADMIN") {
      fetchReport();
    }
  }, [status, session?.user?.role, dateFrom, dateTo, filterStatus, page, fetchReport]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleExport = async (format: "xlsx" | "csv") => {
    try {
      const columnsToExport = selectedColumns.length > 0 ? selectedColumns : availableColumns.map(c => c.key);
      const exportFilters = {
        ...filters,
        selectedColumns: columnsToExport,
      };
      const url = buildExportUrl("/api/admin/reports/tours/summary", exportFilters, format);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export ${format.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-100 text-green-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      case "BOOKED":
        return "bg-blue-100 text-blue-700";
      case "COMPLETED":
        return "bg-neutral-100 text-neutral-700";
      default:
        return "bg-neutral-100 text-neutral-700";
    }
  };

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

  return (
    <AdminLayout>
      <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Tour Bookings Summary</h1>
          <p className="text-neutral-600 mt-1">Operational view of tour bookings</p>
        </div>

        <ReportFilterBar
          onFilterChange={setFilters}
          showCountry={false}
          showStatus={true}
          showPaymentStatus={false}
          showType={false}
        />

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={() => fetchReport(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <ColumnSelector
            columns={availableColumns}
            selectedColumns={selectedColumns}
            onSelectionChange={setSelectedColumns}
            label="Select Columns"
          />

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

        {error && !summary && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button onClick={() => fetchReport()} className="mt-2 text-sm text-red-700 font-medium underline">Try Again</button>
          </div>
        )}

        <div className={loading && summary ? "opacity-50 pointer-events-none transition-opacity" : ""}>
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Total Bookings</h3>
                  <Calendar size={20} className="text-neutral-600" />
                </div>
                <p className="text-3xl font-bold text-neutral-900">{summary.totalBookings}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Paid Bookings</h3>
                  <TrendingUp size={20} className="text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-700">{summary.paidBookings}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Total Revenue</h3>
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-700">₹{summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Avg Group Size</h3>
                  <Users size={20} className="text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-purple-700">{summary.avgGroupSize.toFixed(1)}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900">Bookings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    {selectedColumns.map((colKey) => (
                      <th key={colKey} className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                        {availableColumns.find(c => c.key === colKey)?.label || colKey}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {bookings.map((booking, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      {selectedColumns.map((colKey) => (
                        <td key={`${idx}-${colKey}`} className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                          {colKey === "Status" ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking[colKey])}`}>
                              {booking[colKey]}
                            </span>
                          ) : colKey === "Payment Status" ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking[colKey] === "Paid" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-700"}`}>
                              {booking[colKey]}
                            </span>
                          ) : (
                            booking[colKey]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-neutral-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
