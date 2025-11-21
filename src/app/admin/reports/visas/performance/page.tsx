"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, TrendingUp, Globe, FileText } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";

interface VisaTypePerformance {
  visaId: string;
  visaName: string;
  countryName: string;
  totalApplications: number;
  paidApplications: number;
  totalRevenue: number;
  avgTravellers: number;
  approvalRate: number;
  refundRate: number;
}

export default function VisaTypePerformancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [visaTypes, setVisaTypes] = useState<VisaTypePerformance[]>([]);
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

  // Memoize filter values to prevent infinite re-renders
  const dateFrom = filters.dateFrom;
  const dateTo = filters.dateTo;
  const countryIds = useMemo(() => filters.countryIds || [], [filters.countryIds]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (countryIds.length > 0) {
        countryIds.forEach((id) => params.append("countryIds", id));
      }

      const response = await fetch(`/api/admin/reports/visas/performance?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setVisaTypes(data.rows || []);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, countryIds]);

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

  const handleExport = (format: "xlsx" | "csv" | "pdf") => {
    const url = buildExportUrl("/api/admin/reports/visas/performance", filters, format);
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
          <h1 className="text-3xl font-bold text-neutral-900">Visa Type Performance</h1>
          <p className="text-neutral-600 mt-1">Know which visa packages work best</p>
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
        {visaTypes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Total Visa Types</h3>
                <FileText size={20} className="text-primary-600" />
              </div>
              <p className="text-3xl font-bold text-neutral-900">{visaTypes.length}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Total Applications</h3>
                <TrendingUp size={20} className="text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-700">
                {visaTypes.reduce((sum, v) => sum + v.totalApplications, 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Total Revenue</h3>
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-700">
                ₹{visaTypes.reduce((sum, v) => sum + v.totalRevenue, 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Visa Types Table */}
        <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900">Visa Type Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Visa Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Country</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Applications</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Avg Travellers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Approval Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Refund Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {visaTypes.map((visa) => (
                  <tr key={visa.visaId} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{visa.visaName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{visa.countryName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{visa.totalApplications}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{visa.paidApplications}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">₹{visa.totalRevenue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{visa.avgTravellers.toFixed(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{visa.approvalRate.toFixed(1)}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{visa.refundRate.toFixed(1)}%</td>
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

