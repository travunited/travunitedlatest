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
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [sortField, setSortField] = useState<"createdAt" | "totalAmount" | "status">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [bulkActionMessage, setBulkActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [admins, setAdmins] = useState<Array<{ id: string; name: string; email: string }>>([]);

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
      setInitialLoad(false);
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

  const fetchAdmins = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/settings/admins");
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.map((admin: { id: string; name: string; email: string }) => ({
          id: admin.id,
          name: admin.name,
          email: admin.email,
        })));
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    }
  }, []);

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
        fetchAdmins();
      }
    }
  }, [session, status, router, fetchApplications, fetchAdmins]);

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
      setSelectedRows(new Set(sortedApplications.map(app => app.id)));
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
    setBulkActionMessage(null);
    try {
      switch (action) {
        case "assign":
          if (!value) {
            setBulkActionMessage({ type: "error", text: "Please select an admin to assign" });
            setBulkActionLoading(false);
            return;
          }
          const assignResponse = await fetch("/api/admin/applications/bulk/assign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationIds: Array.from(selectedRows),
              adminId: value,
            }),
          });
          if (!assignResponse.ok) {
            const errorData = await assignResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to assign applications");
          }
          setBulkActionMessage({ type: "success", text: `Successfully assigned ${selectedRows.size} application(s)` });
          break;
        case "status":
          if (!value) {
            setBulkActionMessage({ type: "error", text: "Please select a status" });
            setBulkActionLoading(false);
            return;
          }
          const statusResponse = await fetch("/api/admin/applications/bulk/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationIds: Array.from(selectedRows),
              status: value,
            }),
          });
          if (!statusResponse.ok) {
            const errorData = await statusResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to update status");
          }
          setBulkActionMessage({ type: "success", text: `Successfully updated status for ${selectedRows.size} application(s)` });
          break;
        case "export":
          const exportResponse = await fetch(`/api/admin/applications/export?ids=${Array.from(selectedRows).join(",")}`);
          if (!exportResponse.ok) {
            const errorData = await exportResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to export applications");
          }
          // Create blob from response and trigger download
          const blob = await exportResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `applications-${new Date().toISOString().split("T")[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          setBulkActionMessage({ type: "success", text: `Successfully exported ${selectedRows.size} application(s)` });
          setBulkActionLoading(false);
          setTimeout(() => setBulkActionMessage(null), 5000);
          return; // Don't refresh table for export
        case "resend":
          const resendResponse = await fetch("/api/admin/applications/bulk/resend-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationIds: Array.from(selectedRows),
            }),
          });
          if (!resendResponse.ok) {
            const errorData = await resendResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to resend emails");
          }
          setBulkActionMessage({ type: "success", text: `Successfully resent emails for ${selectedRows.size} application(s)` });
          break;
        case "delete":
          if (!confirm("Are you absolutely sure? This action cannot be undone.")) {
            setBulkActionLoading(false);
            return;
          }
          const deleteResponse = await fetch("/api/admin/applications/bulk/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ids: Array.from(selectedRows),
            }),
          });
          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to delete applications");
          }
          setBulkActionMessage({ type: "success", text: `Successfully deleted ${selectedRows.size} application(s)` });
          break;
        default:
          throw new Error("Unknown action");
      }
      await fetchApplications();
      setSelectedRows(new Set());
      setShowBulkActions(false);
      // Auto-hide success message after 5 seconds (export handles its own timeout)
      setTimeout(() => setBulkActionMessage(null), 5000);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to perform bulk action";
      setBulkActionMessage({ type: "error", text: errorMessage });
      setTimeout(() => setBulkActionMessage(null), 5000);
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

  const stats = useMemo(() => {
    const totalValue = applications.reduce((sum, app) => sum + (app.totalAmount || 0), 0);
    const awaitingPayment = applications.filter(app => app.status === "PAYMENT_PENDING").length;
    const approved = applications.filter(app => app.status === "APPROVED").length;
    const unassigned = applications.filter(app => !app.processedBy).length;
    const drafts = applications.filter(app => app.status === "DRAFT").length;
    return {
      totalApplications: applications.length,
      totalValue,
      awaitingPayment,
      approved,
      unassigned,
      drafts,
    };
  }, [applications]);

  const sortedApplications = useMemo(() => {
    const cloned = [...applications];
    return cloned.sort((a, b) => {
      let comparison = 0;
      if (sortField === "createdAt") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === "totalAmount") {
        comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
      } else if (sortField === "status") {
        comparison = a.status.localeCompare(b.status);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [applications, sortField, sortDirection]);

  const handleSortChange = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "totalAmount" ? "desc" : "asc");
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  if (initialLoad) {
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
        <div className="mb-8 space-y-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold text-neutral-900">Visa Applications</h1>
            <p className="text-neutral-500 text-sm md:text-base">
              Monitor pipeline health, triage unassigned requests, and keep approvals moving with quicker bulk actions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Total Applications",
                value: stats.totalApplications.toString(),
                accent: "bg-primary-50 text-primary-700 border border-primary-100",
              },
              {
                label: "Pipeline Value",
                value: stats.totalValue ? formatCurrency(stats.totalValue) : "₹0",
                accent: "bg-emerald-50 text-emerald-700 border border-emerald-100",
              },
              {
                label: "Awaiting Payment",
                value: stats.awaitingPayment.toString(),
                accent: "bg-amber-50 text-amber-700 border border-amber-100",
              },
              {
                label: "Unassigned Cases",
                value: stats.unassigned.toString(),
                accent: "bg-rose-50 text-rose-700 border border-rose-100",
              },
              {
                label: "Draft Leads",
                value: stats.drafts.toString(),
                accent: "bg-neutral-50 text-neutral-700 border border-neutral-100",
                onClick: () => {
                  setStatusFilter("DRAFT");
                  setAssignedFilter("ALL");
                },
              },
            ].map((card, idx) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={(card as any).onClick}
                className={`rounded-2xl px-5 py-4 backdrop-blur shadow-sm ${card.accent} ${(card as any).onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
              >
                <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">{card.label}</p>
                <p className="text-2xl font-semibold mt-1">{card.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "All",
                action: () => {
                  setStatusFilter("ALL");
                  setAssignedFilter("ALL");
                },
                active: statusFilter === "ALL" && assignedFilter === "ALL",
              },
              {
                label: "Awaiting Payment",
                action: () => {
                  setStatusFilter("PAYMENT_PENDING");
                  setAssignedFilter("ALL");
                },
                active: statusFilter === "PAYMENT_PENDING",
              },
              {
                label: "In Process",
                action: () => {
                  setStatusFilter("IN_PROCESS");
                  setAssignedFilter("ALL");
                },
                active: statusFilter === "IN_PROCESS",
              },
              {
                label: "Approved",
                action: () => {
                  setStatusFilter("APPROVED");
                  setAssignedFilter("ALL");
                },
                active: statusFilter === "APPROVED",
              },
              {
                label: "Rejected",
                action: () => {
                  setStatusFilter("REJECTED");
                  setAssignedFilter("ALL");
                },
                active: statusFilter === "REJECTED",
              },
              {
                label: "Drafts (Leads)",
                action: () => {
                  setStatusFilter("DRAFT");
                  setAssignedFilter("ALL");
                },
                active: statusFilter === "DRAFT",
              },
              {
                label: "Unassigned",
                action: () => setAssignedFilter("UNASSIGNED"),
                active: assignedFilter === "UNASSIGNED",
              },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={chip.action}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${chip.active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          {uniqueCountries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
              <span className="font-medium">Popular countries:</span>
              {uniqueCountries.slice(0, 6).map((country) => (
                <button
                  key={country}
                  onClick={() => setCountryFilter(country)}
                  className="rounded-full border border-neutral-200 px-3 py-1 text-neutral-600 hover:border-neutral-400"
                >
                  {country}
                </button>
              ))}
            </div>
          )}
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

        {/* Bulk Action Messages */}
        {bulkActionMessage && (
          <div
            className={`mb-6 rounded-lg p-4 flex items-center space-x-2 ${bulkActionMessage.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
              }`}
          >
            {bulkActionMessage.type === "success" ? (
              <CheckCircle size={20} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={20} className="flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{bulkActionMessage.text}</span>
            <button
              onClick={() => setBulkActionMessage(null)}
              className="ml-auto text-current opacity-70 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

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
                  <option value="current">Assign to Me</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name || admin.email}
                    </option>
                  ))}
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
        {sortedApplications.length > 0 ? (
          <div className="bg-white rounded-lg shadow-medium border border-neutral-200 overflow-hidden relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            )}
            <div className="flex flex-col gap-3 px-6 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-neutral-500">
                  Showing <span className="font-semibold text-neutral-800">{sortedApplications.length}</span> record(s)
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: "Date", field: "createdAt" as const },
                    { label: "Amount", field: "totalAmount" as const },
                    { label: "Status", field: "status" as const },
                  ].map((option) => (
                    <button
                      key={option.field}
                      onClick={() => handleSortChange(option.field)}
                      className={`inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm transition-colors ${sortField === option.field
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                        }`}
                    >
                      <ArrowUpDown size={14} />
                      {option.label}
                      {sortField === option.field && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-px bg-neutral-100" />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === sortedApplications.length && sortedApplications.length > 0}
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
                  {sortedApplications.map((app) => (
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
                        {formatCurrency(app.totalAmount || 0)}
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
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center space-y-4">
            <FileText size={48} className="text-neutral-300 mx-auto" />
            <div>
              <p className="text-lg font-semibold text-neutral-900">No applications match your filters</p>
              <p className="text-neutral-500 text-sm">Try clearing filters or adjusting the quick chips above.</p>
            </div>
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setCountryFilter("");
                setVisaTypeFilter("");
                setAssignedFilter("ALL");
                setDateFrom("");
                setDateTo("");
                setAssignedAdminFilter("");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Reset filters
            </button>
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
