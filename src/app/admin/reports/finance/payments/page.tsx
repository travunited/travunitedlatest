"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, CreditCard, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";
import { formatDate } from "@/lib/dateFormat";

interface PaymentRow {
  id: string;
  receiptDate: string;
  particulars: string;
  transactionId: string;
  amount: number;
  modeOfPayment: string;
  receivedBankName: string;
  currency: string;
  payingPartyName: string;
  receiptVoucherNo: string;
  salesPerson: string;
  status: string; // Used for styling
}

interface PaymentSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  refundedTransactions: number;
  totalAmount: number;
  visaAmount: number;
  tourAmount: number;
}

export default function PaymentsReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    datePreset: "last30",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Memoize filter values
  const dateFrom = useMemo(() => filters.dateFrom, [filters.dateFrom]);
  const dateTo = useMemo(() => filters.dateTo, [filters.dateTo]);
  const filterStatus = useMemo(() => filters.status, [filters.status]);
  const filterType = useMemo(() => filters.type, [filters.type]);

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
      if (filterStatus) params.append("status", filterStatus);
      if (filterType) params.append("type", filterType);
      params.append("page", page.toString());
      params.append("limit", "50");

      const response = await fetch(`/api/admin/reports/finance/payments?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to load report: ${response.statusText}`);
      }
      const data = await response.json();
      setSummary(data.summary);
      setPayments(data.rows || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error: any) {
      console.error("Error fetching report:", error);
      setError(error.message || "Failed to load report. Please try again or contact support.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, filterStatus, filterType, page]);

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
      hasMountedRef.current = true;
      isInitialMountRef.current = false;
      fetchReport();
    }
  }, [session?.user?.role, status, router, fetchReport]);

  // Refetch when filters or page change
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (hasMountedRef.current && status === "authenticated" && session?.user?.role === "SUPER_ADMIN") {
      fetchReport();
    }
  }, [dateFrom, dateTo, filterStatus, filterType, page, status, session?.user?.role, fetchReport]);

  const handleExport = async (format: "xlsx" | "csv") => {
    try {
      const url = buildExportUrl("/api/admin/reports/finance/payments", filters, format);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export ${format.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "FAILED":
        return "bg-red-100 text-red-700";
      case "REFUNDED":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-neutral-100 text-neutral-700";
    }
  };

  if (loading && !summary && !error) {
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
          <h1 className="text-3xl font-bold text-neutral-900">Payment Receipt Report</h1>
          <p className="text-neutral-600 mt-1">Detailed transaction-level report</p>
        </div>

        <ReportFilterBar
          onFilterChange={setFilters}
          showCountry={false}
          showStatus={false}
          showPaymentStatus={true}
          showType={true}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Total Transactions</h3>
                  <CreditCard size={20} className="text-neutral-600" />
                </div>
                <p className="text-3xl font-bold text-neutral-900">{summary.totalTransactions}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Successful</h3>
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-700">{summary.successfulTransactions}</p>
                <p className="text-sm text-neutral-600 mt-2">₹{summary.totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Failed</h3>
                  <XCircle size={20} className="text-red-600" />
                </div>
                <p className="text-3xl font-bold text-red-700">{summary.failedTransactions}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Refunded</h3>
                  <AlertCircle size={20} className="text-orange-600" />
                </div>
                <p className="text-3xl font-bold text-orange-700">{summary.refundedTransactions}</p>
              </div>
            </div>
          )}

          {/* Payment Receipts Table */}
          <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900">Payment Receipts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Sl No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Receipt Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Particulars</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Transaction Id / UTR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Mode of Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Received Bank Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Currency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Paying Party</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Receipt Voucher No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Sales Person</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {payments.map((payment, index) => (
                    <tr key={payment.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{(page - 1) * 50 + index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900" suppressHydrationWarning>
                        {formatDate(payment.receiptDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{payment.particulars}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-600 text-xs">{payment.transactionId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-neutral-900">
                        ₹{payment.amount.toLocaleString()}
                        <div className={`text-xs mt-1 ${payment.status === "COMPLETED" ? "text-green-600" :
                            payment.status === "FAILED" ? "text-red-600" : "text-orange-600"
                          }`}>
                          {payment.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{payment.modeOfPayment}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{payment.receivedBankName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{payment.currency}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 font-medium">{payment.payingPartyName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{payment.receiptVoucherNo.substring(0, 8)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{payment.salesPerson}</td>
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
