"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Filter, FileText, CheckCircle, X, Clock, AlertCircle, MoreVertical, Download, Mail, Trash2, UserCheck, ArrowUpDown } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

interface Application {
  id: string;
  country: string;
  visaType: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  processedBy?: { name: string; email: string } | null;
  user: { name: string; email: string };
}

function AdminApplicationsPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "ALL");
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [visaTypeFilter, setVisaTypeFilter] = useState<string>("");
  const [assignedFilter, setAssignedFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [assignedAdminFilter, setAssignedAdminFilter] = useState<string>("");

  const searchParamsKey = useMemo(() => searchParams.toString(), [searchParams]);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (countryFilter) params.append("country", countryFilter);
      if (visaTypeFilter) params.append("visaType", visaTypeFilter);
      if (assignedFilter === "UNASSIGNED") params.append("unassigned", "true");
      if (assignedFilter === "ASSIGNED") params.append("assigned", "true");
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (assignedAdminFilter) params.append("assignedAdmin", assignedAdminFilter);

      const currentSearchParams = new URLSearchParams(searchParamsKey);
      const unassigned = currentSearchParams.get("unassigned") === "true";
      const rejected = currentSearchParams.get("rejected") === "true";
      if (unassigned) params.append("unassigned", "true");
      if (rejected) params.append("rejected", "true");

      const response = await fetch(`/api/admin/applications?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    countryFilter,
    visaTypeFilter,
    assignedFilter,
    dateFrom,
    dateTo,
    assignedAdminFilter,
    searchParamsKey,
  ]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        router.push("/dashboard");
      } else {
        const params = new URLSearchParams(window.location.search);
        const urlStatus = params.get("status");
        if (urlStatus) {
          setStatusFilter(urlStatus);
        }
        fetchApplications();
      }
    }
  }, [session, status, router, fetchApplications]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchApplications();
    }
  }, [status, fetchApplications]);

  const handleClaim = async (applicationId: string) => {
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/claim`, {
        method: "POST",
      });
      if (response.ok) {
        await fetchApplications();
      }
    } catch (error) {
      console.error("Error claiming application:", error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(applications.map(app => app.id)));
      setShowBulkActions(true);
    } else {
      setSelectedRows(new Set());
      setShowBulkActions(false);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleBulkAction = async (action: string, value?: string) => {
    if (selectedRows.size === 0) return;

    setBulkActionLoading(true);
    try {
      switch (action) {
        case "assign":
          if (!value) {
            alert("Please select an admin to assign");
            setBulkActionLoading(false);
            return;
          }
          // TODO: Implement bulk assign
          await fetch("/api/admin/applications/bulk/assign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationIds: Array.from(selectedRows),
              adminId: value,
            }),
          });
          break;
        case "status":
          if (!value) {
            alert("Please select a status");
            setBulkActionLoading(false);
            return;
          }
          // TODO: Implement bulk status change
          await fetch("/api/admin/applications/bulk/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationIds: Array.from(selectedRows),
              status: value,
            }),
          });
          break;
        case "export":
          // TODO: Implement CSV/Excel export
          window.location.href = `/api/admin/applications/export?ids=${Array.from(selectedRows).join(",")}`;
          break;
        case "resend":
          // TODO: Implement bulk resend emails
          await fetch("/api/admin/applications/bulk/resend-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationIds: Array.from(selectedRows),
            }),
          });
          break;
        case "delete":
          if (!confirm("Are you absolutely sure? This action cannot be undone.")) {
            setBulkActionLoading(false);
            return;
          }
          // TODO: Implement bulk delete
          await fetch("/api/admin/applications/bulk/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationIds: Array.from(selectedRows),
            }),
          });
          break;
      }
      await fetchApplications();
      setSelectedRows(new Set());
      setShowBulkActions(false);
      alert("Bulk action completed");
    } catch (error) {
      console.error("Error performing bulk action:", error);
      alert("Failed to perform bulk action");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-neutral-200 text-neutral-700",
      PAYMENT_PENDING: "bg-yellow-100 text-yellow-700",
      SUBMITTED: "bg-blue-100 text-blue-700",
      IN_PROCESS: "bg-primary-100 text-primary-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-neutral-200 text-neutral-700";
  };

  const uniqueCountries = Array.from(new Set(applications.map(app => app.country).filter(Boolean)));
  const uniqueVisaTypes = Array.from(new Set(applications.map(app => app.visaType).filter(Boolean)));

  if (loading) {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Visa Applications</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-medium p-6 border border-neutral-200 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter size={20} className="text-neutral-400" />
            <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PAYMENT_PENDING">Payment Pending</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="IN_PROCESS">In Process</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Country</label>
              <input
                type="text"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                placeholder="Filter by country"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Visa Type</label>
              <input
                type="text"
                value={visaTypeFilter}
                onChange={(e) => setVisaTypeFilter(e.target.value)}
                placeholder="Filter by visa type"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Assigned</label>
              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="ALL">All</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="UNASSIGNED">Unassigned</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Assigned Admin</label>
              <input
                type="text"
                value={assignedAdminFilter}
                onChange={(e) => setAssignedAdminFilter(e.target.value)}
                placeholder="Filter by admin email"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-neutral-900">
                {selectedRows.size} application(s) selected
              </span>
              <div className="flex items-center space-x-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkAction("assign", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="px-3 py-1 border border-neutral-300 rounded text-sm"
                  disabled={bulkActionLoading}
                >
                  <option value="">Bulk Assign To...</option>
                  {/* TODO: Load admin list */}
                  <option value="current">Assign to Me</option>
                </select>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkAction("status", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="px-3 py-1 border border-neutral-300 rounded text-sm"
                  disabled={bulkActionLoading}
                >
                  <option value="">Bulk Status Change...</option>
                  <option value="IN_PROCESS">Mark as In Process</option>
                  <option value="APPROVED">Mark as Approved</option>
                  <option value="REJECTED">Mark as Rejected</option>
                </select>
                <button
                  onClick={() => handleBulkAction("resend")}
                  disabled={bulkActionLoading}
                  className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded text-sm hover:bg-neutral-200 disabled:opacity-50 flex items-center space-x-1"
                >
                  <Mail size={14} />
                  <span>Resend Email</span>
                </button>
                <button
                  onClick={() => handleBulkAction("export")}
                  disabled={bulkActionLoading}
                  className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded text-sm hover:bg-neutral-200 disabled:opacity-50 flex items-center space-x-1"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => handleBulkAction("delete")}
                  disabled={bulkActionLoading}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 disabled:opacity-50 flex items-center space-x-1"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedRows(new Set());
                setShowBulkActions(false);
              }}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Applications Table */}
        {applications.length > 0 ? (
          <div className="bg-white rounded-lg shadow-medium border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === applications.length && applications.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Application ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Country / Visa Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {applications.map((app) => (
                    <tr 
                      key={app.id} 
                      className="hover:bg-neutral-50 cursor-pointer"
                      onClick={(e) => {
                        // Don't navigate if clicking on checkbox or button
                        const target = e.target as HTMLElement;
                        if (target.closest('input[type="checkbox"]') || target.closest('button') || target.closest('a')) {
                          return;
                        }
                        router.push(`/admin/applications/${app.id}`);
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(app.id)}
                          onChange={(e) => handleSelectRow(app.id, e.target.checked)}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-neutral-900">
                          {app.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{app.country || "N/A"}</div>
                        <div className="text-sm text-neutral-500">{app.visaType || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{app.user.name || "N/A"}</div>
                        <div className="text-sm text-neutral-500">{app.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                          {app.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        ₹{app.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {app.processedBy ? (
                          <div className="text-sm text-neutral-900">{app.processedBy.name || app.processedBy.email}</div>
                        ) : (
                          <button
                            onClick={() => handleClaim(app.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700 transition-colors"
                          >
                            <UserCheck size={14} />
                            <span>Claim</span>
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {formatDate(app.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center space-x-1"
                        >
                          <Eye size={16} />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <FileText size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600">No applications found</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function AdminApplicationsSuspenseFallback() {
  return (
    <AdminLayout>
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-neutral-600">Loading applications...</p>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={<AdminApplicationsSuspenseFallback />}>
      <AdminApplicationsPageContent />
    </Suspense>
  );
}
