"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, TrendingUp, Users, DollarSign, FileText, Calendar, Download } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface AnalyticsData {
  promoCode: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    currentUses: number;
    maxUses: number | null;
  };
  statistics: {
    totalUses: number;
    totalDiscountGiven: number;
    totalRevenueGenerated: number;
    averageDiscount: number;
    visaCount: number;
    tourCount: number;
  };
  usageByDate: Record<string, number>;
  topUsers: Array<{
    userId: string;
    count: number;
    totalDiscount: number;
    email: string;
    name: string | null;
  }>;
  recentUsages: Array<{
    id: string;
    userEmail: string;
    userName: string | null;
    discountAmount: number;
    finalAmount: number;
    usedAt: string;
    type: string;
    application: {
      id: string;
      country: string;
      visaType: string;
    } | null;
    booking: {
      id: string;
      tourName: string;
    } | null;
  }>;
}

export default function PromoCodeAnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (session && (session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN")) {
      fetchAnalytics();
    }
  }, [session, params.id]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/promo-codes/${params.id}/analytics`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading analytics...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!analytics) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-neutral-600">Failed to load analytics</p>
            <Link
              href="/admin/promo-codes"
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Back to Promo Codes
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/admin/promo-codes/${params.id}`}
          className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Edit Promo Code
        </Link>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <BarChart3 size={32} className="text-primary-600" />
              <h1 className="text-3xl font-bold text-neutral-900">Promo Code Analytics</h1>
            </div>
            <a
              href={`/api/admin/promo-codes/${params.id}/analytics/export`}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Download size={20} />
              <span>Export CSV</span>
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-lg font-mono font-semibold text-primary-600">{analytics.promoCode.code}</span>
            <span className="text-neutral-600">
              {analytics.statistics.totalUses} total uses
            </span>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-600">Total Uses</span>
              <TrendingUp size={20} className="text-primary-600" />
            </div>
            <div className="text-3xl font-bold text-neutral-900">{analytics.statistics.totalUses}</div>
            {analytics.promoCode.maxUses && (
              <div className="text-xs text-neutral-500 mt-1">
                of {analytics.promoCode.maxUses} max
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-600">Total Discount Given</span>
              <DollarSign size={20} className="text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">
              ₹{(analytics.statistics.totalDiscountGiven / 100).toLocaleString()}
            </div>
            <div className="text-xs text-neutral-500 mt-1">In paise: {analytics.statistics.totalDiscountGiven}</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-600">Revenue Generated</span>
              <DollarSign size={20} className="text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600">
              ₹{(analytics.statistics.totalRevenueGenerated / 100).toLocaleString()}
            </div>
            <div className="text-xs text-neutral-500 mt-1">After discounts</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-600">Average Discount</span>
              <TrendingUp size={20} className="text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-600">
              ₹{(analytics.statistics.averageDiscount / 100).toFixed(2)}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Per use</div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Usage Breakdown</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText size={20} className="text-primary-600" />
                  <span className="text-neutral-700">Visa Applications</span>
                </div>
                <span className="font-semibold text-neutral-900">{analytics.statistics.visaCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar size={20} className="text-green-600" />
                  <span className="text-neutral-700">Tour Bookings</span>
                </div>
                <span className="font-semibold text-neutral-900">{analytics.statistics.tourCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Top Users</h2>
            {analytics.topUsers.length > 0 ? (
              <div className="space-y-3">
                {analytics.topUsers.slice(0, 5).map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-neutral-400 font-medium">#{index + 1}</span>
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {user.name || user.email}
                        </div>
                        {user.name && (
                          <div className="text-xs text-neutral-500">{user.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-neutral-900">{user.count} uses</div>
                      <div className="text-xs text-green-600">
                        ₹{(user.totalDiscount / 100).toFixed(0)} saved
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No usage data yet</p>
            )}
          </div>
        </div>

        {/* Recent Usage */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Recent Usage</h2>
          {analytics.recentUsages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Final Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {analytics.recentUsages.map((usage) => (
                    <tr key={usage.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {formatDate(usage.usedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{usage.userName || usage.userEmail}</div>
                        {usage.userName && (
                          <div className="text-xs text-neutral-500">{usage.userEmail}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {usage.type === "visa" && usage.application ? (
                          <Link
                            href={`/admin/applications/${usage.application.id}`}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            {usage.application.country} {usage.application.visaType}
                          </Link>
                        ) : usage.type === "tour" && usage.booking ? (
                          <Link
                            href={`/admin/bookings/${usage.booking.id}`}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            {usage.booking.tourName}
                          </Link>
                        ) : (
                          <span className="text-sm text-neutral-600 capitalize">{usage.type}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        -₹{(usage.discountAmount / 100).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 font-medium">
                        ₹{(usage.finalAmount / 100).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No usage recorded yet</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
