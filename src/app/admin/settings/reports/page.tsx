"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Download, BarChart3, TrendingUp, Users, DollarSign, Calendar } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface VisaReport {
  statusCounts: Record<string, number>;
  topCountries: Array<{ country: string; count: number }>;
  conversion: {
    started: number;
    paid: number;
    approved: number;
    conversionRate: number;
  };
}

interface TourReport {
  tours: Array<{
    tourName: string;
    bookings: number;
    revenue: number;
    fullPayment: number;
    advancePayment: number;
  }>;
}

interface AdminPerformance {
  admins: Array<{
    adminName: string;
    adminEmail: string;
    applicationsHandled: number;
    bookingsHandled: number;
    avgProcessingTime: number;
  }>;
}

interface RevenueSummary {
  visaRevenue: number;
  tourRevenue: number;
  totalRevenue: number;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [visaReport, setVisaReport] = useState<VisaReport | null>(null);
  const [tourReport, setTourReport] = useState<TourReport | null>(null);
  const [adminPerformance, setAdminPerformance] = useState<AdminPerformance | null>(null);
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      // Fetch all reports in parallel
      const [visaRes, tourRes, adminRes, revenueRes] = await Promise.all([
        fetch(`/api/admin/settings/reports/visas?${params.toString()}`),
        fetch(`/api/admin/settings/reports/tours?${params.toString()}`),
        fetch(`/api/admin/settings/reports/admin-performance?${params.toString()}`),
        fetch(`/api/admin/settings/reports/revenue?${params.toString()}`),
      ]);

      if (visaRes.ok) {
        const data = await visaRes.json();
        setVisaReport(data);
      }
      if (tourRes.ok) {
        const data = await tourRes.json();
        setTourReport(data);
      }
      if (adminRes.ok) {
        const data = await adminRes.json();
        setAdminPerformance(data);
      }
      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenueSummary(data);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
      if (!isSuperAdmin) {
        router.push("/admin");
      } else {
        fetchReports();
      }
    }
  }, [session, status, router, fetchReports]);

  const exportToCSV = async (reportType: string) => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      params.append("format", "csv");

      const response = await fetch(`/api/admin/settings/reports/${reportType}?${params.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}-report-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      alert("Failed to export report");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading reports...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Reports & Analytics</h1>
          <p className="text-neutral-600 mt-1">Comprehensive business insights and analytics</p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 mb-6">
          <div className="flex items-center space-x-4">
            <Calendar size={20} className="text-neutral-600" />
            <div className="flex items-center space-x-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="self-end">
                <button
                  onClick={fetchReports}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Summary */}
        {revenueSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Visa Revenue</h3>
                <DollarSign size={20} className="text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-neutral-900">₹{revenueSummary.visaRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Tour Revenue</h3>
                <DollarSign size={20} className="text-green-600" />
              </div>
              <p className="text-3xl font-bold text-neutral-900">₹{revenueSummary.tourRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-600">Total Revenue</h3>
                <TrendingUp size={20} className="text-primary-600" />
              </div>
              <p className="text-3xl font-bold text-primary-600">₹{revenueSummary.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Visa Reports */}
        {visaReport && (
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BarChart3 size={24} className="text-blue-600" />
                <h2 className="text-xl font-bold text-neutral-900">Visa Reports</h2>
              </div>
              <button
                onClick={() => exportToCSV("visas")}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Status Counts */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Applications by Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(visaReport.statusCounts).map(([status, count]) => (
                  <div key={status} className="bg-neutral-50 rounded-lg p-4">
                    <div className="text-sm text-neutral-600 mb-1">{status}</div>
                    <div className="text-2xl font-bold text-neutral-900">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Countries */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Top Countries by Volume</h3>
              <div className="space-y-2">
                {visaReport.topCountries.map((country, index) => (
                  <div key={index} className="flex items-center justify-between bg-neutral-50 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-neutral-600">#{index + 1}</span>
                      <span className="text-sm font-medium text-neutral-900">{country.country}</span>
                    </div>
                    <span className="text-sm font-bold text-neutral-900">{country.count} applications</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion Stats */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Conversion Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-neutral-600 mb-1">Started</div>
                  <div className="text-2xl font-bold text-blue-700">{visaReport.conversion.started}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-sm text-neutral-600 mb-1">Paid</div>
                  <div className="text-2xl font-bold text-yellow-700">{visaReport.conversion.paid}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-neutral-600 mb-1">Approved</div>
                  <div className="text-2xl font-bold text-green-700">{visaReport.conversion.approved}</div>
                </div>
                <div className="bg-primary-50 rounded-lg p-4">
                  <div className="text-sm text-neutral-600 mb-1">Conversion Rate</div>
                  <div className="text-2xl font-bold text-primary-700">{visaReport.conversion.conversionRate.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tour Reports */}
        {tourReport && (
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <BarChart3 size={24} className="text-green-600" />
                <h2 className="text-xl font-bold text-neutral-900">Tour Reports</h2>
              </div>
              <button
                onClick={() => exportToCSV("tours")}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Tour Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Full Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Advance Payment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {tourReport.tours.map((tour, index) => (
                    <tr key={index} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{tour.tourName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{tour.bookings}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">₹{tour.revenue.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">₹{tour.fullPayment.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">₹{tour.advancePayment.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Admin Performance */}
        {adminPerformance && (
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Users size={24} className="text-purple-600" />
                <h2 className="text-xl font-bold text-neutral-900">Admin Performance</h2>
              </div>
              <button
                onClick={() => exportToCSV("admin-performance")}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Applications Handled</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Bookings Handled</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Avg Processing Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {adminPerformance.admins.map((admin, index) => (
                    <tr key={index} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-neutral-900">{admin.adminName}</div>
                          <div className="text-xs text-neutral-500">{admin.adminEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{admin.applicationsHandled}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">{admin.bookingsHandled}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {admin.avgProcessingTime > 0 ? `${admin.avgProcessingTime.toFixed(1)} days` : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
