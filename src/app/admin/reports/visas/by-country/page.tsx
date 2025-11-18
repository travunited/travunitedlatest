"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, FileDown, Globe, TrendingUp, FileText } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportFilterBar, ReportFilters } from "@/components/admin/ReportFilterBar";
import { buildExportUrl } from "@/lib/report-export";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface CountryData {
  countryId: string;
  countryName: string;
  totalApplications: number;
  paidApplications: number;
  totalRevenue: number;
  approvedCount: number;
  rejectedCount: number;
  decidedCount: number;
  avgTicketSize: number;
  approvalRate: number;
}

export default function CountryWiseVisaReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [countryData, setCountryData] = useState<CountryData[]>([]);
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

      const response = await fetch(`/api/admin/reports/visas/by-country?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setCountryData(data.rows || []);
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
    const url = buildExportUrl("/api/admin/reports/visas/by-country", filters, format);
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
          <h1 className="text-3xl font-bold text-neutral-900">Country-wise Visa Report</h1>
          <p className="text-neutral-600 mt-1">See which countries are performing best</p>
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

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Total Countries</h3>
                <Globe size={20} className="text-neutral-600" />
              </div>
              <p className="text-3xl font-bold text-neutral-900">{summary.totalCountries}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Total Applications</h3>
                <TrendingUp size={20} className="text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-700">{summary.totalApplications}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Total Revenue</h3>
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-700">₹{summary.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Country Table */}
        <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900">Performance by Country</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Country</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Applications</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Paid Applications</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Avg Ticket Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Approval Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {countryData.map((country) => (
                  <tr key={country.countryId} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      {country.countryName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{country.totalApplications}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-medium">{country.paidApplications}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-neutral-900">₹{country.totalRevenue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">₹{Math.round(country.avgTicketSize).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        country.approvalRate >= 80 ? "bg-green-100 text-green-700" :
                        country.approvalRate >= 60 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {country.approvalRate.toFixed(1)}%
                      </span>
                    </td>
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

