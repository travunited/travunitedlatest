"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, Users, FileText } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";
import { formatDate } from "@/lib/dateFormat";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
  const [summary, setSummary] = useState<any>(null);
  const [leads, setLeads] = useState<CorporateLead[]>([]);
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
      if (filters.status) params.append("status", filters.status);
      params.append("page", page.toString());
      params.append("limit", "50");

      const response = await fetch(`/api/admin/reports/corporate?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setLeads(data.rows || []);
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
    const url = buildExportUrl("/api/admin/reports/corporate", filters, format);
    window.open(url, "_blank");
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{formatDate(lead.createdAt)}</td>
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

