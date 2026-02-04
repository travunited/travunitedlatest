
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, TrendingUp, Filter, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";

interface PerformanceRow {
    srNo: number;
    reviewPeriod: string;
    entityCategory: string;
    entityId: string;
    entityName: string;
    department: string;
    productCategory: string;
    serviceType: string;
    channel: string;
    transactions: number;
    grossRevenue: number;
    discount: number;
    refund: number;
    netRevenue: number;
    gst: number;
    avgValue: number;
    newAdditions: number;
    repeatPercentage: number;
    crossSellRatio: number;
    slaPercentage: number;
    targetRevenue: number;
    targetAchievedPercentage: number;
    performanceRating: string;
    incentiveEligible: string;
    status: string;
}

export default function PerformanceOverviewPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<PerformanceRow[]>([]);
    const [filters, setFilters] = useState<ReportFilters>({
        dateFrom: "",
        dateTo: "",
        datePreset: "last30",
    });

    // Memoize filter values
    const dateFrom = useMemo(() => filters.dateFrom, [filters.dateFrom]);
    const dateTo = useMemo(() => filters.dateTo, [filters.dateTo]);

    // Track if component has mounted
    const hasMountedRef = useRef(false);
    const isInitialMountRef = useRef(true);

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

            const response = await fetch(`/api/admin/reports/performance/overview?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to load report: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            setRows(data.rows || []);
        } catch (error: any) {
            console.error("Error fetching report:", error);
            setError(error.message || "Failed to load report. Please try again or contact support.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateFrom, dateTo]);

    // Auth check
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
            hasMountedRef.current = true;
            isInitialMountRef.current = false;
            fetchReport();
        }
    }, [session?.user?.role, status, router, fetchReport]);

    // Refetch on filter change
    useEffect(() => {
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            return;
        }
        if (hasMountedRef.current && status === "authenticated" && session?.user?.role === "SUPER_ADMIN") {
            fetchReport();
        }
    }, [dateFrom, dateTo, status, session?.user?.role, fetchReport]);

    const handleExport = async (format: "xlsx" | "csv") => {
        try {
            const url = buildExportUrl("/api/admin/reports/performance/overview", filters, format);
            window.open(url, "_blank");
        } catch (error) {
            console.error("Export error:", error);
            alert(`Failed to export ${format.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };

    if (loading && rows.length === 0) {
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

    if (error && rows.length === 0) {
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
            <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-neutral-900">Performance Overview</h1>
                    <p className="text-neutral-600 mt-1">Detailed performance metrics across all entities</p>
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

                <div className={loading && rows.length > 0 ? "opacity-50 pointer-events-none transition-opacity" : ""}>
                    <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
                        <div className="p-6 border-b border-neutral-200">
                            <h2 className="text-xl font-bold text-neutral-900">Performance Data</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-neutral-200">
                                <thead className="bg-neutral-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Sr No</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Review Period</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap group cursor-pointer hover:bg-neutral-100">
                                            Entity Category <span className="ml-1 text-neutral-400">▼</span>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Entity ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Entity Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Department</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap group cursor-pointer hover:bg-neutral-100">
                                            Product Category <span className="ml-1 text-neutral-400">▼</span>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap group cursor-pointer hover:bg-neutral-100">
                                            Service Type <span className="ml-1 text-neutral-400">▼</span>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap group cursor-pointer hover:bg-neutral-100">
                                            Channel <span className="ml-1 text-neutral-400">▼</span>
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Transactions</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Gross Revenue (₹)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Discount (₹)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Refund (₹)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Net Revenue (₹)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">GST (₹)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Avg Value (₹)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">New Additions</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Repeat %</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Cross-Sell Ratio</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">SLA %</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Target Revenue (₹)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Target Achieved %</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Performance Rating</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Incentive Eligible</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-neutral-200">
                                    {rows.map((row) => (
                                        <tr key={`${row.entityId}-${row.productCategory}`} className="hover:bg-neutral-50">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.srNo}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.reviewPeriod}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900 font-medium">{row.entityCategory}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500 font-mono text-xs">{row.entityId.substring(0, 8)}...</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.entityName}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.department}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.productCategory}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.serviceType}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.channel}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.transactions}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">₹{row.grossRevenue.toLocaleString()}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600">₹{row.discount.toLocaleString()}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600">₹{row.refund.toLocaleString()}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-700">₹{row.netRevenue.toLocaleString()}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-600">₹{row.gst.toLocaleString()}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">₹{Math.round(row.avgValue).toLocaleString()}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.newAdditions}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.repeatPercentage}%</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.crossSellRatio}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.slaPercentage}%</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-600">₹{row.targetRevenue.toLocaleString()}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.targetAchievedPercentage}%</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">{row.performanceRating}</span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900">{row.incentiveEligible}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === "Active" ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-600"
                                                    }`}>
                                                    {row.status}
                                                </span>
                                            </td>
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
