"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Filter, Calendar, CheckCircle, X, AlertCircle, Download, Mail, Trash2, UserCheck, ArrowRight } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";
import { useDebounce } from "@/hooks/useDebounce";

interface Booking {
  id: string;
  tourName: string;
  status: string;
  totalAmount: number;
  travelDate: string | null;
  createdAt: string;
  processedBy?: { id?: string; name: string; email: string } | null;
  user: { name: string; email: string; phone?: string | null };
  amountPaid?: number;
  pendingBalance?: number;
  paymentStatus?: string;
  source?: string;
  travellersCount?: number;
  tour?: {
    id: string;
    name: string;
    destination?: string | null;
    country?: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
}

function AdminBookingsPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "ALL");
  const [tourFilter, setTourFilter] = useState<string>("");
  const [assignedFilter, setAssignedFilter] = useState<string>("ALL");
  const [assignedAdminFilter, setAssignedAdminFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [travelDateFrom, setTravelDateFrom] = useState<string>("");
  const [travelDateTo, setTravelDateTo] = useState<string>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("ALL");
  const [destinationFilter, setDestinationFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const searchParamsKey = useMemo(() => searchParams.toString(), [searchParams]);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (tourFilter) params.append("tour", tourFilter);
      if (assignedFilter === "UNASSIGNED") params.append("unassigned", "true");
      if (assignedFilter === "ASSIGNED") params.append("assigned", "true");
      if (assignedAdminFilter) params.append("assignedAdmin", assignedAdminFilter);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (travelDateFrom) params.append("travelDateFrom", travelDateFrom);
      if (travelDateTo) params.append("travelDateTo", travelDateTo);
      if (paymentStatusFilter !== "ALL") params.append("paymentStatus", paymentStatusFilter);
      if (destinationFilter) params.append("destination", destinationFilter);
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);

      const currentParams = new URLSearchParams(searchParamsKey);
      const unconfirmed = currentParams.get("unconfirmed") === "true";
      if (unconfirmed) params.append("unconfirmed", "true");

      const response = await fetch(`/api/admin/bookings?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [statusFilter, tourFilter, assignedFilter, assignedAdminFilter, dateFrom, dateTo, travelDateFrom, travelDateTo, paymentStatusFilter, destinationFilter, debouncedSearchQuery, searchParamsKey]);

  const [admins, setAdmins] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [bulkActionMessage, setBulkActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    if (status === "authenticated") {
      fetchAdmins();
    }
  }, [status, fetchAdmins]);

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
        fetchBookings();
      }
    }
  }, [session, status, router, fetchBookings]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchBookings();
    }
  }, [status, fetchBookings]);

  const handleClaim = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/claim`, {
        method: "POST",
      });
      if (response.ok) {
        await fetchBookings();
      }
    } catch (error) {
      console.error("Error claiming booking:", error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(bookings.map(b => b.id)));
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
          const assignResponse = await fetch("/api/admin/bookings/bulk/assign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingIds: Array.from(selectedRows),
              adminId: value,
            }),
          });
          if (!assignResponse.ok) {
            const errorData = await assignResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to assign bookings");
          }
          setBulkActionMessage({ type: "success", text: `Successfully assigned ${selectedRows.size} booking(s)` });
          break;
        case "status":
          if (!value) {
            setBulkActionMessage({ type: "error", text: "Please select a status" });
            setBulkActionLoading(false);
            return;
          }
          const statusResponse = await fetch("/api/admin/bookings/bulk/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingIds: Array.from(selectedRows),
              status: value,
            }),
          });
          if (!statusResponse.ok) {
            const errorData = await statusResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to update booking status");
          }
          setBulkActionMessage({ type: "success", text: `Successfully updated ${selectedRows.size} booking(s) status` });
          break;
        case "export":
          const exportResponse = await fetch(`/api/admin/bookings/export?ids=${Array.from(selectedRows).join(",")}`);
          if (!exportResponse.ok) {
            const errorData = await exportResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to export bookings");
          }
          const blob = await exportResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          setBulkActionMessage({ type: "success", text: `Successfully exported ${selectedRows.size} booking(s)` });
          setBulkActionLoading(false);
          return;
        case "resend":
          const resendResponse = await fetch("/api/admin/bookings/bulk/resend-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingIds: Array.from(selectedRows),
            }),
          });
          if (!resendResponse.ok) {
            const errorData = await resendResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to resend emails");
          }
          setBulkActionMessage({ type: "success", text: `Successfully resent emails for ${selectedRows.size} booking(s)` });
          break;
        case "delete":
          if (!confirm("Are you absolutely sure? This action cannot be undone.")) {
            setBulkActionLoading(false);
            return;
          }
          const deleteResponse = await fetch("/api/admin/bookings/bulk/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingIds: Array.from(selectedRows),
            }),
          });
          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to delete bookings");
          }
          setBulkActionMessage({ type: "success", text: `Successfully deleted ${selectedRows.size} booking(s)` });
          break;
      }
      await fetchBookings();
      setSelectedRows(new Set());
      setShowBulkActions(false);
      // Clear message after 5 seconds
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
      REQUEST_RECEIVED: "bg-purple-100 text-purple-700",
      PAYMENT_PENDING: "bg-yellow-100 text-yellow-700",
      BOOKED: "bg-blue-100 text-blue-700",
      CONFIRMED: "bg-green-100 text-green-700",
      COMPLETED: "bg-neutral-100 text-neutral-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-neutral-200 text-neutral-700";
  };

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Tour Bookings</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-medium p-6 border border-neutral-200 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter size={20} className="text-neutral-400" />
            <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
          </div>
          <div className="space-y-4">
            {/* First Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Booking ID, phone, email, name"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Booking Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="REQUEST_RECEIVED">Request Received</option>
                  <option value="PAYMENT_PENDING">Payment Pending</option>
                  <option value="BOOKED">Booked</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Payment Status</label>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
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
              {assignedFilter === "ASSIGNED" && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Assigned Admin</label>
                  <select
                    value={assignedAdminFilter}
                    onChange={(e) => setAssignedAdminFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="">All Admins</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Tour Name</label>
                <input
                  type="text"
                  value={tourFilter}
                  onChange={(e) => setTourFilter(e.target.value)}
                  placeholder="Filter by tour name"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Destination</label>
                <input
                  type="text"
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                  placeholder="Country/State/City"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Created Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Created Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Travel Date From</label>
                <input
                  type="date"
                  value={travelDateFrom}
                  onChange={(e) => setTravelDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>
            {/* Third Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Travel Date To</label>
                <input
                  type="date"
                  value={travelDateTo}
                  onChange={(e) => setTravelDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-900">
                {selectedRows.size} booking(s) selected
              </span>
              <button
                onClick={() => {
                  setSelectedRows(new Set());
                  setShowBulkActions(false);
                  setBulkActionMessage(null);
                }}
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Clear Selection
              </button>
            </div>
            {bulkActionMessage && (
              <div className={`mb-3 p-2 rounded text-sm ${bulkActionMessage.type === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
                }`}>
                {bulkActionMessage.text}
              </div>
            )}
            <div className="flex items-center space-x-2 flex-wrap gap-2">
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
                    {admin.name} ({admin.email})
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
                <option value="CONFIRMED">Mark as Confirmed</option>
                <option value="COMPLETED">Mark as Completed</option>
                <option value="CANCELLED">Mark as Cancelled</option>
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
        )}

        {/* Bookings Table */}
        {bookings.length > 0 ? (
          <div className="bg-white rounded-lg shadow-medium border border-neutral-200 overflow-hidden relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === bookings.length && bookings.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Booking ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Tour Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Travel Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Travelers
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Paid / Due
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Booking Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-neutral-50 cursor-pointer"
                      onClick={(e) => {
                        // Don't navigate if clicking on checkbox or button
                        const target = e.target as HTMLElement;
                        if (target.closest('input[type="checkbox"]') || target.closest('button') || target.closest('a')) {
                          return;
                        }
                        router.push(`/admin/bookings/${booking.id}`);
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(booking.id)}
                          onChange={(e) => handleSelectRow(booking.id, e.target.checked)}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-neutral-900">
                          {booking.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{formatDate(booking.createdAt)}</div>
                        <div className="text-xs text-neutral-500">{new Date(booking.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{booking.tourName || "N/A"}</div>
                        {booking.tour?.destination && (
                          <div className="text-xs text-neutral-500">{booking.tour.destination}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{booking.user.name || "N/A"}</div>
                        <div className="text-sm text-neutral-500">{booking.user.email}</div>
                        {booking.user.phone && (
                          <div className="text-xs text-neutral-500">{booking.user.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">
                          {booking.travelDate ? formatDate(booking.travelDate) : "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {booking.travellersCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        ₹{booking.totalAmount?.toLocaleString() || "0"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-green-600 font-medium">₹{booking.amountPaid?.toLocaleString() || "0"}</div>
                        {booking.pendingBalance && booking.pendingBalance > 0 ? (
                          <div className="text-orange-600 font-medium">Due: ₹{booking.pendingBalance.toLocaleString()}</div>
                        ) : (
                          <div className="text-green-600 text-xs">Fully Paid</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${booking.paymentStatus === "PAID" ? "bg-green-100 text-green-700" :
                            booking.paymentStatus === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                              booking.paymentStatus === "FAILED" ? "bg-red-100 text-red-700" :
                                booking.paymentStatus === "REFUNDED" ? "bg-purple-100 text-purple-700" :
                                  "bg-neutral-100 text-neutral-700"
                          }`}>
                          {booking.paymentStatus || "PENDING"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {booking.processedBy ? (
                          <div className="text-sm text-neutral-900">{booking.processedBy.name || booking.processedBy.email}</div>
                        ) : (
                          <button
                            onClick={() => handleClaim(booking.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-primary-600 text-white rounded text-xs font-medium hover:bg-primary-700 transition-colors"
                          >
                            <UserCheck size={14} />
                            <span>Claim</span>
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {booking.source || "WEBSITE"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/bookings/${booking.id}`}
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
            <Calendar size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600">No bookings found</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function AdminBookingsSuspenseFallback() {
  return (
    <AdminLayout>
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-neutral-600">Loading bookings...</p>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<AdminBookingsSuspenseFallback />}>
      <AdminBookingsPageContent />
    </Suspense>
  );
}
