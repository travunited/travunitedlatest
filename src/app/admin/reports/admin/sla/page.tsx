"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, Clock, AlertCircle, FileText } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface SLASummary {
  totalApplications: number;
  avgTimeToFirstReview: number;
  avgTimeToDecision: number;
  slaBreaches: {
    notTouched24h: number;
    notTouched48h: number;
    notDecided48h: number;
    notDecided72h: number;
  };
}

export default function SLATurnaroundPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SLASummary | null>(null);
  const [countries, setCountries] = useState<Array<{ id: string; name: string }>>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    datePreset: "last30",
  });

  const fetchCountries = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content/countries");
      if (response.ok) {
        const data = await response.json();
        setCountries(data.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.countryIds && filters.countryIds.length > 0) {
        filters.countryIds.forEach((id) => params.append("countryIds", id));
      }

      const response = await fetch(`/api/admin/reports/admin/sla?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

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
    const url = buildExportUrl("/api/admin/reports/admin/sla", filters, format);
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
          <h1 className="text-3xl font-bold text-neutral-900">SLA & Turnaround Time</h1>
          <p className="text-neutral-600 mt-1">Service quality and SLA compliance</p>
        </div>

        <ReportFilterBar
          onFilterChange={setFilters}
          showCountry={true}
          showStatus={false}
          showPaymentStatus={false}
          showType={false}
          countries={countries}
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Total Applications</h3>
                  <Clock size={20} className="text-primary-600" />
                </div>
                <p className="text-3xl font-bold text-neutral-900">{summary.totalApplications}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Avg Time to First Review</h3>
                  <Clock size={20} className="text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-700">{summary.avgTimeToFirstReview.toFixed(1)} hrs</p>
              </div>
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-neutral-600">Avg Time to Decision</h3>
                  <Clock size={20} className="text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-700">{summary.avgTimeToDecision.toFixed(1)} hrs</p>
              </div>
            </div>

            {/* SLA Breaches */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-red-600" />
                SLA Breaches
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-sm text-red-600 mb-1">Not Touched > 24h</div>
                  <div className="text-2xl font-bold text-red-700">{summary.slaBreaches.notTouched24h}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-sm text-red-600 mb-1">Not Touched > 48h</div>
                  <div className="text-2xl font-bold text-red-700">{summary.slaBreaches.notTouched48h}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="text-sm text-orange-600 mb-1">Not Decided > 48h</div>
                  <div className="text-2xl font-bold text-orange-700">{summary.slaBreaches.notDecided48h}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-sm text-red-600 mb-1">Not Decided > 72h</div>
                  <div className="text-2xl font-bold text-red-700">{summary.slaBreaches.notDecided72h}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

