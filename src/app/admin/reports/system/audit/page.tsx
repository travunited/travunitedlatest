"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, FileSearch, FileText } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";
import { formatDate } from "@/lib/dateFormat";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface AuditLogRow {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: any;
}

export default function AuditLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    datePreset: "last30",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      params.append("page", page.toString());
      params.append("limit", "50");

      const response = await fetch(`/api/admin/reports/system/audit?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setLogs(data.rows || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
      if (!isSuperAdmin) {
        router.push("/admin");
      } else {
        fetchReport();
      }
    }
  }, [session, status, router, fetchReport]);

  const handleExport = (format: "xlsx" | "csv" | "pdf") => {
    const url = buildExportUrl("/api/admin/reports/system/audit", filters, format);
    window.open(url, "_blank");
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
          <h1 className="text-3xl font-bold text-neutral-900">Audit Log Export</h1>
          <p className="text-neutral-600 mt-1">All important actions for legal/compliance</p>
        </div>

        <ReportFilterBar
          onFilterChange={setFilters}
          showCountry={false}
          showStatus={false}
          showPaymentStatus={false}
          showType={false}
        />

        {/* Export Buttons */}
        <div className="flex items-center gap-3 mb-6">
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
          <button
            onClick={() => handleExport("pdf")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
          >
            <FileText size={16} />
            Export PDF
          </button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-neutral-600">Total Logs</div>
                <div className="text-2xl font-bold text-neutral-900">{summary.totalLogs}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-600">Action Types</div>
                <div className="text-sm text-neutral-900">
                  {Object.keys(summary.actionCounts || {}).length} unique actions
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit Logs Table */}
        <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900">Audit Logs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Entity Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Entity ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{log.actor}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{log.entityType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-600">
                      {log.entityId?.slice(0, 8) || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900 max-w-md truncate">{log.description}</td>
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
    </AdminLayout>
  );
}

