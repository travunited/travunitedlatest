"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, FileText, TrendingUp, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { ColumnSelector } from "@/components/admin/ColumnSelector";
import { buildExportUrl } from "@/lib/report-export";

interface ServiceSummary {
    totalApplications: number;
    paidApplications: number;
    statusCounts: Record<string, number>;
    conversionRate: number;
    totalRevenue: number;
}

export default function MiscServicesReportPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<ServiceSummary | null>(null);
    const [rows, setRows] = useState<any[]>([]);
    const [filters, setFilters] = useState<ReportFilters>({
        dateFrom: "",
        dateTo: "",
        datePreset: "last30",
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Define available columns for export (37 columns)
    const availableColumns = useMemo(() => [
        { key: "Sr No", label: "Sr No" },
        { key: "Service Application ID", label: "Service App ID" },
        { key: "Lead Date", label: "Lead Date" },
        { key: "Booking Date", label: "Booking Date" },
        { key: "Sales Persona", label: "Sales Persona" },
        { key: "Department", label: "Department" },
        { key: "Product Category", label: "Product Category" },
        { key: "Service Type", label: "Service Type" },
        { key: "Sub Service", label: "Sub Service" },
        { key: "Customer Type (Indian / Foreign)", label: "Customer Type" },
        { key: "Customer Name", label: "Customer Name" },
        { key: "Mobile No", label: "Mobile No" },
        { key: "Email ID", label: "Email ID" },
        { key: "Passport No (If Applicable)", label: "Passport No" },
        { key: "Nationality", label: "Nationality" },
        { key: "Service Country", label: "Service Country" },
        { key: "City / Location", label: "City" },
        { key: "Lead Source", label: "Lead Source" },
        { key: "Processing Executive", label: "Processing Exec" },
        { key: "Vendor / Authority / Partner", label: "Vendor" },
        { key: "Current Status", label: "Status" },
        { key: "Case Stage", label: "Stage" },
        { key: "Documents Collected (Y/N)", label: "Docs Collected" },
        { key: "Missing Documents", label: "Missing Docs" },
        { key: "Submission Date", label: "Submission Date" },
        { key: "Completion Date", label: "Completion Date" },
        { key: "TAT (Days)", label: "TAT" },
        { key: "SLA Target (Days)", label: "SLA Target" },
        { key: "SLA Status", label: "SLA Status" },
        { key: "Invoice No", label: "Invoice No" },
        { key: "Invoice Date", label: "Invoice Date" },
        { key: "Gross Amount", label: "Gross Amount" },
        { key: "Discount", label: "Discount" },
        { key: "Tax", label: "Tax" },
        { key: "Net Amount", label: "Net Amount" },
        { key: "Payment Status", label: "Payment Status" },
        { key: "Payment Mode", label: "Payment Mode" },
        { key: "Remarks", label: "Remarks" },
    ], []);

    // Initialize selected columns with key columns for view
    const [selectedColumns, setSelectedColumns] = useState<string[]>([
        "Sr No",
        "Service Application ID",
        "Service Type",
        "Customer Name",
        "Current Status",
        "Net Amount",
        "SLA Status"
    ]);

    const dateFrom = useMemo(() => filters.dateFrom, [filters.dateFrom]);
    const dateTo = useMemo(() => filters.dateTo, [filters.dateTo]);
    const filterStatus = useMemo(() => filters.status, [filters.status]);

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
            params.append("page", page.toString());
            params.append("limit", "50");

            const response = await fetch(`/api/admin/reports/services/misc?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Failed to load report: ${response.statusText}`);
            }
            const data = await response.json();
            setSummary(data.summary);
            setRows(data.rows || []);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (error: any) {
            console.error("Error fetching report:", error);
            setError(error.message || "Failed to load report. Please try again or contact support.");
        } finally {
            setLoading(false);
            setRefreshing(false);
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
            fetchReport();
        }
    }, [session?.user?.role, status, router, fetchReport]);

    const handleExport = async (format: "xlsx" | "csv") => {
        try {
            const columnsToExport = selectedColumns.length > 0 ? selectedColumns : availableColumns.map(c => c.key);
            const exportFilters = {
                ...filters,
                selectedColumns: columnsToExport,
            };
            const url = buildExportUrl("/api/admin/reports/services/misc", exportFilters, format);
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
            case "Paid":
                return "bg-green-100 text-green-700";
            case "Unpaid":
                return "bg-red-100 text-red-700";
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
                    <h1 className="text-3xl font-bold text-neutral-900">Misc Services Report</h1>
                    <p className="text-neutral-600 mt-1">Operational report for various services</p>
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
                                    <h3 className="text-sm font-medium text-neutral-600">Total Services</h3>
                                    <FileText size={20} className="text-neutral-600" />
                                </div>
                                <p className="text-3xl font-bold text-neutral-900">{summary.totalApplications}</p>
                            </div>
                            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-neutral-600">Paid Services</h3>
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
                            <h2 className="text-xl font-bold text-neutral-900">Services Details</h2>
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
                                    {rows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-neutral-50">
                                            {selectedColumns.map((colKey) => (
                                                <td key={`${idx}-${colKey}`} className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                                                    {colKey === "Current Status" || colKey === "Payment Status" || colKey.includes("SLA") ? (
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row[colKey])}`}>
                                                            {row[colKey]}
                                                        </span>
                                                    ) : (
                                                        row[colKey]
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
