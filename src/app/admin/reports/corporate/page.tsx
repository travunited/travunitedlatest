"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, Users, FileText, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";
import { formatDate } from "@/lib/dateFormat";
import { useDebounce } from "@/hooks/useDebounce";

interface CorporateLead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function CorporateLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [leads, setLeads] = useState<CorporateLead[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    datePreset: "last30",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Use ref to track abort controller for canceling previous requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize filter values to prevent infinite re-renders
  const dateFrom = filters.dateFrom;
  const dateTo = filters.dateTo;
  const filterStatus = filters.status;

  const fetchReport = useCallback(async (abortSignal?: AbortSignal, showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (filterStatus && filterStatus !== "ALL" && filterStatus !== "all") {
        params.append("status", filterStatus);
      }
      if (debouncedSearchQuery) {
        params.append("q", debouncedSearchQuery);
      }
      params.append("page", page.toString());
      params.append("limit", "50");

      const response = await fetch(`/api/admin/reports/corporate?${params.toString()}`, {
        signal: abortSignal,
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setLeads(data.rows || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Fetch aborted");
        return;
      }
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, filterStatus, debouncedSearchQuery, page]);

  // Separate effect for auth check
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

  // Separate effect for fetching data when filters change
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "SUPER_ADMIN") {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      fetchReport(abortController.signal);

      // Cleanup: abort request if component unmounts or dependencies change
      return () => {
        abortController.abort();
      };
    }
  }, [fetchReport, status, session?.user?.role]);

  const handleExport = async (format: "xlsx" | "csv") => {
    try {
      const url = buildExportUrl("/api/admin/reports/corporate", filters, format);
      // For CSV/XLSX, open in new tab (works for these formats)
      window.open(url, "_blank");
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export ${format.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "WON":
        return "bg-green-100 text-green-700";
      case "LOST":
        return "bg-red-100 text-red-700";
      case "PROPOSAL_SENT":
        return "bg-blue-100 text-blue-700";
      case "CONTACTED":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-neutral-100 text-neutral-700";
    }
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold text-neutral-900">Corporate Leads</h1>
          <p className="text-neutral-600 mt-1">Corporate leads and clients tracking</p>
        </div>

        <ReportFilterBar
          onFilterChange={setFilters}
          showCountry={false}
          showStatus={true}
          showPaymentStatus={false}
          showType={false}
          showSearch={true}
          onSearchChange={setSearchQuery}
          initialSearchQuery={searchQuery}
          statusOptions={[
            { label: "All Statuses", value: "ALL" },
            { label: "New", value: "NEW" },
            { label: "Contacted", value: "CONTACTED" },
            { label: "Proposal Sent", value: "PROPOSAL_SENT" },
            { label: "Won", value: "WON" },
            { label: "Lost", value: "LOST" },
          ]}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              // Cancel any pending request
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              // Create new abort controller
              abortControllerRef.current = new AbortController();
              fetchReport(abortControllerRef.current.signal, true);
            }}
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

        <div className={loading && summary ? "opacity-50 pointer-events-none transition-opacity" : ""}>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Total Leads</h3>
                  <Users size={20} className="text-primary-600" />
                </div>
                <p className="text-3xl font-bold text-neutral-900">{summary.totalLeads}</p>
              </div>
              {Object.entries(summary.statusCounts || {}).map(([status, count]: [string, any]) => (
                <div key={status} className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-neutral-600">{status}</h3>
                  </div>
                  <p className="text-3xl font-bold text-neutral-900">{count}</p>
                </div>
              ))}
            </div>
          )}

          {/* Leads Table */}
          <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900">Corporate Leads</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{lead.companyName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{lead.contactName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{lead.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{lead.phone || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(lead.status)}`}>
                          {lead.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900" suppressHydrationWarning>{formatDate(lead.createdAt)}</td>
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

