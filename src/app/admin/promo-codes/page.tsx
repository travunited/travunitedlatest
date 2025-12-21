"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Edit, Tag, CheckCircle, X, Calendar, TrendingUp, Copy } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minPurchaseAmount: number | null;
  maxDiscountAmount: number | null;
  applicableTo: string;
  maxUses: number | null;
  maxUsesPerUser: number;
  currentUses: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    usages: number;
  };
}

export default function PromoCodesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [applicableToFilter, setApplicableToFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        router.push("/admin");
      } else {
        fetchPromoCodes();
      }
    }
  }, [session, status, router, statusFilter, applicableToFilter, search, page]);

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        applicableTo: applicableToFilter,
        page: page.toString(),
        limit: "50",
      });
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/admin/promo-codes?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPromoCodes(data.promoCodes);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching promo codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (promoCode: PromoCode) => {
    const now = new Date();
    const validUntil = new Date(promoCode.validUntil);

    if (!promoCode.isActive) {
      return <span className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-700 rounded">Inactive</span>;
    }
    if (validUntil < now) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">Expired</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">Active</span>;
  };

  const getDiscountDisplay = (promoCode: PromoCode) => {
    switch (promoCode.discountType) {
      case "PERCENTAGE":
        return `${promoCode.discountValue}% OFF`;
      case "FIXED_AMOUNT":
        return `₹${promoCode.discountValue / 100} OFF`;
      case "FREE":
        return "FREE";
      default:
        return "-";
    }
  };

  const getUsageDisplay = (promoCode: PromoCode) => {
    if (promoCode.maxUses === null) {
      return `${promoCode.currentUses} uses`;
    }
    return `${promoCode.currentUses}/${promoCode.maxUses} uses`;
  };

  if (loading && promoCodes.length === 0) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Promo Codes</h1>
            <p className="text-neutral-600 mt-1">Create and manage promotional discount codes</p>
          </div>
          <Link
            href="/admin/promo-codes/new"
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            <span>Create Promo Code</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Applicable To</label>
              <select
                value={applicableToFilter}
                onChange={(e) => {
                  setApplicableToFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="VISAS">Visas Only</option>
                <option value="TOURS">Tours Only</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by code..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Promo Codes List */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          {promoCodes.length === 0 ? (
            <div className="p-12 text-center">
              <Tag size={48} className="mx-auto text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No promo codes found</h3>
              <p className="text-neutral-600 mb-6">Get started by creating your first promo code</p>
              <Link
                href="/admin/promo-codes/new"
                className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus size={20} />
                <span>Create Promo Code</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Discount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Applicable To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Usage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Valid Until</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {promoCodes.map((promoCode) => (
                      <tr key={promoCode.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Tag size={16} className="text-neutral-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-neutral-900 font-mono">{promoCode.code}</div>
                              {promoCode.description && (
                                <div className="text-xs text-neutral-500 mt-1">{promoCode.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-primary-600">{getDiscountDisplay(promoCode)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-neutral-900">{promoCode.applicableTo}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <TrendingUp size={16} className="text-neutral-400 mr-2" />
                            <span className="text-sm text-neutral-900">{getUsageDisplay(promoCode)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar size={16} className="text-neutral-400 mr-2" />
                            <span className="text-sm text-neutral-900">{formatDate(promoCode.validUntil)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(promoCode)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/admin/promo-codes/${promoCode.id}`}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            <Edit size={16} className="inline" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
                  <div className="text-sm text-neutral-700">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
