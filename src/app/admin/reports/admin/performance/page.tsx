"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, Shield, TrendingUp, Clock, FileText } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface AdminPerformance {
  id: string;
  name: string;
  email: string;
  applicationsAssigned: number;
  applicationsProcessed: number;
  avgProcessingTimeHours: number;
  pendingOver7Days: number;
  documentVerifications: number;
  bookingsProcessed: number;
}

export default function AdminPerformancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [admins, setAdmins] = useState<AdminPerformance[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    datePreset: "last30",
  });

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);

      const response = await fetch(`/api/admin/reports/admin/performance?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setAdmins(data.rows || []);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
    const url = buildExportUrl("/api/admin/reports/admin/performance", filters, format);
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
          <h1 className="text-3xl font-bold text-neutral-900">Admin Performance</h1>
          <p className="text-neutral-600 mt-1">Per admin workload and KPIs</p>
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

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Total Admins</h3>
                <Shield size={20} className="text-primary-600" />
              </div>
              <p className="text-3xl font-bold text-neutral-900">{summary.totalAdmins}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Applications Assigned</h3>
                <TrendingUp size={20} className="text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-700">{summary.totalApplicationsAssigned}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Applications Processed</h3>
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-700">{summary.totalApplicationsProcessed}</p>
            </div>
          </div>
        )}

        {/* Admins Table */}
        <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900">Admin Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Assigned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Processed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Avg Processing Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Pending >7 Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Doc Verifications</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{admin.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{admin.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{admin.applicationsAssigned}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-medium">{admin.applicationsProcessed}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{admin.avgProcessingTimeHours.toFixed(1)} hrs</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {admin.pendingOver7Days > 0 ? (
                        <span className="text-red-700 font-medium">{admin.pendingOver7Days}</span>
                      ) : (
                        <span className="text-neutral-600">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{admin.documentVerifications}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

