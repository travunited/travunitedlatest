"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, AlertCircle, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";
import { formatDate } from "@/lib/dateFormat";

interface RefundRow {
    paymentReceiptDateTime: string;
    partyName: string;
    transactionId: string;
    amount: number;
    paidForServiceName: string;
    cancellationDate: string;
    cancellationCharges: number;
    refundableAmount: number;
    refundDate: string;
    partyBankDetails: string;
    refundRefId: string;
    status: string;
    salesPerson: string;
}

export default function RefundReportPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<RefundRow[]>([]);
    const [filters, setFilters] = useState<ReportFilters>({
        dateFrom: "",
        dateTo: "",
        datePreset: "last30",
    });

    const dateFrom = useMemo(() => filters.dateFrom, [filters.dateFrom]);
    const dateTo = useMemo(() => filters.dateTo, [filters.dateTo]);
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

            const response = await fetch(`/api/admin/reports/finance/refunds?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Failed to load report: ${response.statusText}`);
            }
            const data = await response.json();
            setRows(data.rows || []);
        } catch (error: any) {
            console.error("Error fetching report:", error);
            setError(error.message || "Failed to load report. Please try again or contact support.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateFrom, dateTo]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }
        if (status === "authenticated") {
            if (session?.user?.role !== "SUPER_ADMIN") {
                router.push("/admin");
                return;
            }
            hasMountedRef.current = true;
            isInitialMountRef.current = false;
            fetchReport();
        }
    }, [status, session?.user?.role, router, fetchReport]);

    useEffect(() => {
        if (isInitialMountRef.current) return;
        if (hasMountedRef.current && status === "authenticated") {
            fetchReport();
        }
    }, [dateFrom, dateTo, status, fetchReport]);

    const handleExport = async (format: "xlsx" | "csv") => {
        try {
            const url = buildExportUrl("/api/admin/reports/finance/refunds", filters, format);
            window.open(url, "_blank");
        } catch (error) {
            console.error("Export error:", error);
            alert(`Failed to export: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };

    if (loading && rows.length === 0) {
        return (
            <AdminLayout>
                <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-neutral-600">Loading refunds...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-neutral-900">Cancel & Refund Report</h1>
                    <p className="text-neutral-600 mt-1">Details of cancelled services and processed refunds</p>
                </div>

                <ReportFilterBar
                    onFilterChange={setFilters}
                    showCountry={false}
                    showStatus={false}
                    showPaymentStatus={false}
                    showType={false}
                />

                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => fetchReport(true)}
                        disabled={refreshing || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
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

                {error && rows.length === 0 && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-600">{error}</p>
                        <button onClick={() => fetchReport()} className="mt-2 text-sm text-red-700 font-medium underline">Try Again</button>
                    </div>
                )}

                <div className={loading ? "opacity-50 pointer-events-none" : ""}>
                    <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-neutral-200">
                                <thead className="bg-neutral-50">
                                    <tr>
                                        {[
                                            "Receipt Date", "Party Name", "Transaction ID", "Amount",
                                            "Service Name", "Cancel Date", "Charges", "Refundable Amt",
                                            "Refund Date", "Bank/UPI", "Refund Ref ID", "Status", "Sales Person"
                                        ].map((h) => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-neutral-200">
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={13} className="px-6 py-12 text-center text-neutral-500">
                                                No refund records found for the selected period.
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-neutral-50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">{formatDate(row.paymentReceiptDateTime)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">{row.partyName}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500 font-mono text-xs">{row.transactionId}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">₹{row.amount.toLocaleString()}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">{row.paidForServiceName}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">{row.cancellationDate !== "N/A" ? formatDate(row.cancellationDate) : "-"}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">₹{row.cancellationCharges}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-700">₹{row.refundableAmount.toLocaleString()}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">{formatDate(row.refundDate)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500 text-xs">{row.partyBankDetails}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500 font-mono text-xs">{row.refundRefId}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">{row.salesPerson}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
