"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, FileText, TrendingUp, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { ColumnSelector } from "@/components/admin/ColumnSelector";
import { buildExportUrl } from "@/lib/report-export";

interface VisaSummary {
  totalApplications: number;
  paidApplications: number;
  statusCounts: Record<string, number>;
  conversionRate: number;
  totalRevenue: number;
}

export default function VisaApplicationsReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<VisaSummary | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [countries, setCountries] = useState<Array<{ id: string; name: string }>>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    datePreset: "last30",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Define available columns for export (all 34 columns)
  const availableColumns = useMemo(() => [
    { key: "Sr No", label: "Sr No" },
    { key: "Application ID", label: "Application ID" },
    { key: "Reference Number", label: "Reference Number" },
    { key: "Lead Date", label: "Lead Date" },
    { key: "Booking Date", label: "Booking Date" },
    { key: "Sales Person Name", label: "Sales Person Name" },
    { key: "Department", label: "Department" },
    { key: "Customer Type (Indian / Foreign)", label: "Customer Type" },
    { key: "Customer Name", label: "Customer Name" },
    { key: "Mobile No", label: "Mobile No" },
    { key: "Email ID", label: "Email ID" },
    { key: "Passport No", label: "Passport No" },
    { key: "Nationality", label: "Nationality" },
    { key: "Visa Country", label: "Visa Country" },
    { key: "Visa Category", label: "Visa Category" },
    { key: "Visa Sub Type", label: "Visa Sub Type" },
    { key: "Entry Type", label: "Entry Type" },
    { key: "Processing Mode", label: "Processing Mode" },
    { key: "Lead Source", label: "Lead Source" },
    { key: "Processing Executive", label: "Processing Executive" },
    { key: "Vendor / Embassy / VFS", label: "Vendor / Embassy / VFS" },
    { key: "Current Status", label: "Current Status" },
    { key: "Case Stage", label: "Case Stage" },
    { key: "Documents Collected (Y/N)", label: "Documents Collected" },
    { key: "Missing Documents", label: "Missing Documents" },
    { key: "Submission Date", label: "Submission Date" },
    { key: "Appointment / Biometrics Date", label: "Appointment Date" },
    { key: "Decision / Completion Date", label: "Completion Date" },
    { key: "TAT (Days)", label: "TAT (Days)" },
    { key: "SLA Target (Days)", label: "SLA Target" },
    { key: "SLA Status (Met / Breached)", label: "SLA Status" },
    { key: "Visa Outcome (Approved / Rejected / Pending)", label: "Visa Outcome" },
    { key: "Visa Validity From", label: "Visa Validity From" },
    { key: "Visa Validity To", label: "Visa Validity To" },
    { key: "Remarks", label: "Remarks" },
  ], []);

  // Initialize selected columns with a sensible subset for UI view
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "Sr No",
    "Reference Number",
    "Lead Date",
    "Customer Name",
    "Visa Country",
    "Visa Sub Type",
    "Current Status",
    "TAT (Days)",
    "SLA Status (Met / Breached)"
  ]);

  const dateFrom = useMemo(() => filters.dateFrom, [filters.dateFrom]);
  const dateTo = useMemo(() => filters.dateTo, [filters.dateTo]);
  const filterStatus = useMemo(() => filters.status, [filters.status]);
  const countryIds = useMemo(() => filters.countryIds || [], [filters.countryIds]);

  const fetchCountries = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content/countries");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setCountries(data
            .filter((c: any) => c && c.id && c.name)
            .map((c: any) => ({ id: c.id, name: c.name })));
        } else {
          setCountries([]);
        }
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  }, []);

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
      if (filterStatus) params.append("status", filterStatus);
      if (countryIds.length > 0) {
        countryIds.forEach((id) => params.append("countryIds", id));
      }
      params.append("page", page.toString());
      params.append("limit", "50");

      const response = await fetch(`/api/admin/reports/visas/summary?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to load report: ${response.statusText}`);
      }
      const data = await response.json();
      setSummary(data.summary);
      setApplications(data.rows || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error: any) {
      console.error("Error fetching report:", error);
      setError(error.message || "Failed to load report. Please try again or contact support.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, filterStatus, countryIds, page]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

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
  }, [session?.user?.role, status, router, fetchReport]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "SUPER_ADMIN") {
      fetchReport();
    }
  }, [dateFrom, dateTo, filterStatus, countryIds, page, status, session?.user?.role, fetchReport]);

  const handleExport = async (format: "xlsx" | "csv") => {
    try {
      // Using all available columns available in the API definition for default export if simply clicking export. 
      // However, to respect the "Column Selector", we pass the selected columns. 
      // If user wants ALL columns, they should check "Select All" in the selector.

      const columnsToExport = selectedColumns.length > 0 ? selectedColumns : availableColumns.map(c => c.key);

      const exportFilters = {
        ...filters,
        selectedColumns: columnsToExport,
      };

      const url = buildExportUrl("/api/admin/reports/visas/summary", exportFilters, format);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export ${format.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      case "IN_PROCESS":
        return "bg-primary-100 text-primary-700";
      case "SUBMITTED":
        return "bg-blue-100 text-blue-700";
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
          <h1 className="text-3xl font-bold text-neutral-900">Visa Applications Summary</h1>
          <p className="text-neutral-600 mt-1">Detailed operational report</p>
        </div>

        <ReportFilterBar
          onFilterChange={setFilters}
          showCountry={true}
          showStatus={true}
          showPaymentStatus={false}
          showType={false}
          countries={countries}
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
                  <h3 className="text-sm font-medium text-neutral-600">Total Applications</h3>
                  <FileText size={20} className="text-neutral-600" />
                </div>
                <p className="text-3xl font-bold text-neutral-900">{summary.totalApplications}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Paid Applications</h3>
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-700">{summary.paidApplications}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Conversion Rate</h3>
                  <TrendingUp size={20} className="text-primary-600" />
                </div>
                <p className="text-3xl font-bold text-primary-700">{summary.conversionRate.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Total Revenue</h3>
                  <FileText size={20} className="text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-700">₹{summary.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900">Applications</h2>
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
                  {applications.map((app, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      {selectedColumns.map((colKey) => (
                        <td key={`${idx}-${colKey}`} className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                          {colKey === "Current Status" || colKey === "Visa Outcome (Approved / Rejected / Pending)" ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app[colKey])}`}>
                              {app[colKey]}
                            </span>
                          ) : (
                            app[colKey]
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
