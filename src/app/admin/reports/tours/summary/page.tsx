"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, Calendar, TrendingUp, Users, FileText, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { ReportSkeleton } from "@/components/admin/ReportSkeleton";
import { buildExportUrl } from "@/lib/report-export";
import { formatDate } from "@/lib/dateFormat";

interface BookingRow {
  id: string;
  referenceNumber: string;
  createdAt: string;
  tourName: string | null;
  country: string | null;
  travellerCount: number;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  amountPaid: number;
  customerName: string | null;
  customerEmail: string;
  travelDate: string | null;
}

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
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    datePreset: "last30",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Memoize filter values to prevent infinite re-renders
  const dateFrom = useMemo(() => filters.dateFrom, [filters.dateFrom]);
  const dateTo = useMemo(() => filters.dateTo, [filters.dateTo]);
  const filterStatus = useMemo(() => filters.status, [filters.status]);

  // Use ref to prevent multiple simultaneous fetches
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchReport = useCallback(async (showRefreshing = false) => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      return;
    }

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

      // Only update state if component is still mounted
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

  // Handle authentication and authorization
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

  // Single useEffect to handle all data fetching
  useEffect(() => {
    // Only fetch if authenticated and authorized
    if (status === "authenticated" && session?.user?.role === "SUPER_ADMIN") {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role, dateFrom, dateTo, filterStatus, page]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleExport = async (format: "xlsx" | "csv") => {
    try {
      const url = buildExportUrl("/api/admin/reports/tours/summary", filters, format);
      // For CSV/XLSX, open in new tab (works for these formats)
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

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Tour Bookings Summary</h1>
          <p className="text-neutral-600 mt-1">Overview of tour bookings and revenue</p>
        </div>

        <ReportFilterBar
          onFilterChange={setFilters}
          showCountry={false}
          showStatus={true}
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
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <FileDown size={16} />
            Export Excel
          </button>
          <button
            onClick={() => handleExport("csv")}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {error && !summary && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-red-800 font-semibold">Failed to Load Report</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => fetchReport()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <div className={loading && summary ? "opacity-50 pointer-events-none transition-opacity" : ""}>
          {summary && (
            <>
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

              {/* Status Breakdown */}
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Bookings by Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.entries(summary.statusCounts).map(([status, count]) => (
                    <div key={status} className="bg-neutral-50 rounded-lg p-4">
                      <div className="text-sm text-neutral-600 mb-1">{status.replace(/_/g, " ")}</div>
                      <div className="text-2xl font-bold text-neutral-900">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Bookings Table */}
          <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900">Bookings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Tour Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Country</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Travellers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-neutral-900">
                        {booking.referenceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900" suppressHydrationWarning>
                        {formatDate(booking.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                        {booking.tourName || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {booking.country || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {booking.travellerCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${booking.paymentStatus === "Paid" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-700"
                          }`}>
                          {booking.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-neutral-900">
                        ₹{booking.totalAmount.toLocaleString()}
                      </td>
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

