"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, Mail, Phone, Calendar, FileText, Plane, Star, Edit, Save, X, CheckCircle, Eye, ArrowLeft } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface Application {
  id: string;
  country: string;
  visaType: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface Booking {
  id: string;
  tourName: string;
  status: string;
  totalAmount: number;
  travelDate: string | null;
  createdAt: string;
}

interface Review {
  id: string;
  type: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  applications: Application[];
  bookings: Booking[];
  reviews: Review[];
}

export default function AdminCustomerDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "applications" | "bookings" | "reviews">("overview");
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchCustomer = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/customers/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
        setEditedName(data.name || "");
        setEditedPhone(data.phone || "");
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleSave = async () => {
    if (!customer) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/customers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editedName,
          phone: editedPhone,
        }),
      });

      if (response.ok) {
        await fetchCustomer();
        setEditing(false);
        alert("Customer info updated successfully");
      } else {
        alert("Failed to update customer info");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!customer) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/customers/${params.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !customer.isActive }),
      });

      if (response.ok) {
        await fetchCustomer();
        alert(`Customer ${!customer.isActive ? "enabled" : "disabled"} successfully`);
      } else {
        alert("Failed to update customer status");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
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
      BOOKED: "bg-blue-100 text-blue-700",
      CONFIRMED: "bg-green-100 text-green-700",
      COMPLETED: "bg-neutral-100 text-neutral-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-neutral-200 text-neutral-700";
  };

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

  if (!customer) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Customer Not Found</h1>
            <Link href="/admin/customers" className="text-primary-600 hover:text-primary-700">
              ← Back to Customers
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-sm mb-4"
          >
            <ArrowLeft size={16} />
            Back to Customers
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">{customer.name || "N/A"}</h1>
              <p className="text-neutral-600 mt-1">{customer.email}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                customer.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}>
                {customer.isActive ? "Active" : "Disabled"}
              </span>
              <button
                onClick={handleToggleStatus}
                disabled={updating}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                  customer.isActive
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {customer.isActive ? "Disable Login" : "Enable Login"}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("applications")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "applications"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
              }`}
            >
              Visa Applications ({customer.applications.length})
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "bookings"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
              }`}
            >
              Tour Bookings ({customer.bookings.length})
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "reviews"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
              }`}
            >
              Reviews ({customer.reviews.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Info */}
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-neutral-900">Customer Information</h2>
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 text-sm"
                    >
                      <Edit size={16} />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSave}
                        disabled={updating}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        <Save size={16} />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false);
                          setEditedName(customer.name || "");
                          setEditedPhone(customer.phone || "");
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 text-sm"
                      >
                        <X size={16} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <div className="text-neutral-900 font-medium">{customer.name || "N/A"}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                    <div className="text-neutral-900 font-medium">{customer.email}</div>
                    <p className="text-xs text-neutral-500 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editedPhone}
                        onChange={(e) => setEditedPhone(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <div className="text-neutral-900 font-medium">{customer.phone || "N/A"}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Date Joined</label>
                    <div className="text-neutral-900 font-medium">
                      {formatDate(customer.createdAt)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Account Status</label>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      customer.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {customer.isActive ? "Active" : "Disabled"}
                    </span>
                    {!customer.isActive && (
                      <p className="text-xs text-red-600 mt-1">
                        This user will see an error if they try to log in.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Statistics</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText size={24} className="text-blue-600" />
                      <div>
                        <div className="text-sm text-neutral-600">Visa Applications</div>
                        <div className="text-2xl font-bold text-blue-700">{customer.applications.length}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <Plane size={24} className="text-green-600" />
                      <div>
                        <div className="text-sm text-neutral-600">Tour Bookings</div>
                        <div className="text-2xl font-bold text-green-700">{customer.bookings.length}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <Star size={24} className="text-yellow-600" />
                      <div>
                        <div className="text-sm text-neutral-600">Reviews Submitted</div>
                        <div className="text-2xl font-bold text-yellow-700">{customer.reviews.length}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === "applications" && (
            <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
              {customer.applications.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Application ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Country / Visa Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {customer.applications.map((app) => (
                        <tr key={app.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                            {app.id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-neutral-900">{app.country || "N/A"}</div>
                            <div className="text-sm text-neutral-500">{app.visaType || "N/A"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                              {app.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            ₹{app.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {formatDate(app.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
              ) : (
                <div className="p-12 text-center">
                  <FileText size={48} className="text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-600">No visa applications found</p>
                </div>
              )}
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === "bookings" && (
            <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
              {customer.bookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Booking ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Tour Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Travel Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {customer.bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-neutral-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                            {booking.id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            {booking.tourName || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {booking.travelDate ? formatDate(booking.travelDate) : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                            ₹{booking.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {formatDate(booking.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
              ) : (
                <div className="p-12 text-center">
                  <Plane size={48} className="text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-600">No tour bookings found</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
              {customer.reviews.length > 0 ? (
                <div className="divide-y divide-neutral-200">
                  {customer.reviews.map((review) => (
                    <div key={review.id} className="p-6 hover:bg-neutral-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              review.type === "VISA" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                            }`}>
                              {review.type}
                            </span>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  className={i < review.rating ? "text-yellow-400 fill-current" : "text-neutral-300"}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-neutral-900 mb-2">{review.comment}</p>
                          <p className="text-xs text-neutral-500">
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Star size={48} className="text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-600">No reviews found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

