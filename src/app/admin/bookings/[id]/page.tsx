"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Upload, Download, User, Mail, Phone, Calendar, CreditCard, Send, Clock, CheckCircle, X, AlertCircle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Traveller {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  createdBy: string | null;
  createdAt: string;
}

interface Booking {
  id: string;
  tourId: string;
  tourName: string;
  status: string;
  totalAmount: number;
  currency: string;
  travelDate: string | null;
  voucherUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  travellers: Array<{
    traveller: Traveller;
  }>;
  payments?: Payment[];
  processedBy?: {
    name: string;
    email: string;
  } | null;
  amountPaid?: number;
  pendingBalance?: number;
}

export default function AdminBookingDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setBooking(data);
        setSelectedStatus(data.status);
        setNotes(data.notes || "");
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  }, [params.id]);

  useEffect(() => {
    fetchBooking();
    fetchActivities();
  }, [fetchBooking, fetchActivities]);

  const handleStatusChange = async () => {
    if (!booking) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (response.ok) {
        await fetchBooking();
        await fetchActivities();
        alert("Status updated successfully");
      } else {
        alert("Failed to update status");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleVoucherUpload = async () => {
    if (!voucherFile || !booking) return;

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append("file", voucherFile);

      const response = await fetch(`/api/admin/bookings/${params.id}/voucher`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await fetchBooking();
        await fetchActivities();
        setVoucherFile(null);
        alert("Voucher uploaded successfully");
      } else {
        alert("Failed to upload voucher");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        await fetchActivities();
        alert("Notes saved");
      }
    } catch (error) {
      alert("Failed to save notes");
    } finally {
      setUpdating(false);
    }
  };

  const handleResendEmail = async (emailType: string) => {
    if (!booking) return;

    setResendingEmail(emailType);
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/resend-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailType }),
      });

      if (response.ok) {
        alert("Email sent successfully");
      } else {
        alert("Failed to send email");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setResendingEmail(null);
    }
  };

  const handleSendPaymentReminder = async () => {
    if (!booking) return;

    setResendingEmail("payment_reminder");
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/resend-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailType: "payment_reminder" }),
      });

      if (response.ok) {
        alert("Payment reminder sent successfully");
      } else {
        alert("Failed to send payment reminder");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setResendingEmail(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-neutral-200 text-neutral-700",
      PAYMENT_PENDING: "bg-yellow-100 text-yellow-700",
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

  if (!booking) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Booking Not Found</h1>
            <Link href="/admin/bookings" className="text-primary-600 hover:text-primary-700">
              ← Back to Bookings
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const amountPaid = booking.amountPaid || booking.payments?.reduce((sum, p) => sum + (p.status === "COMPLETED" ? p.amount : 0), 0) || 0;
  const pendingBalance = booking.pendingBalance !== undefined ? booking.pendingBalance : (booking.totalAmount - amountPaid);
  const completedPayments = booking.payments?.filter(p => p.status === "COMPLETED") || [];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/admin/bookings"
            className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-4 text-sm"
          >
            ← Back to Bookings
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">{booking.tourName}</h1>
              <p className="text-neutral-600 mt-1">
                Booking ID: {booking.id.slice(0, 8)}...
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
              {booking.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Contact */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Primary Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <User size={20} className="text-neutral-400" />
                  <div>
                    <div className="text-sm text-neutral-600">Full Name</div>
                    <div className="font-medium">{booking.user.name || "N/A"}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail size={20} className="text-neutral-400" />
                  <div>
                    <div className="text-sm text-neutral-600">Email</div>
                    <div className="font-medium">{booking.user.email}</div>
                  </div>
                </div>
                {booking.user.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone size={20} className="text-neutral-400" />
                    <div>
                      <div className="text-sm text-neutral-600">Phone</div>
                      <div className="font-medium">{booking.user.phone}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Travellers List */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Travellers</h2>
              <div className="space-y-4">
                {booking.travellers.map((t, index) => (
                  <div key={t.traveller.id} className="border border-neutral-200 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Traveller {index + 1}</h3>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-neutral-600">Name:</span>{" "}
                        <span className="font-medium">{t.traveller.firstName} {t.traveller.lastName}</span>
                      </div>
                      {t.traveller.dateOfBirth && (
                        <div>
                          <span className="text-neutral-600">Date of Birth:</span>{" "}
                          <span className="font-medium">{formatDate(t.traveller.dateOfBirth)}</span>
                        </div>
                      )}
                      {t.traveller.gender && (
                        <div>
                          <span className="text-neutral-600">Gender:</span>{" "}
                          <span className="font-medium">{t.traveller.gender}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Payment Information</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <div className="text-sm text-neutral-600 mb-1">Total Amount</div>
                    <div className="text-2xl font-bold text-neutral-900">₹{booking.totalAmount.toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-neutral-600 mb-1">Amount Paid</div>
                    <div className="text-2xl font-bold text-green-700">₹{amountPaid.toLocaleString()}</div>
                  </div>
                  {pendingBalance > 0 && (
                    <div className="p-4 bg-orange-50 rounded-lg md:col-span-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-neutral-600 mb-1">Pending Balance</div>
                          <div className="text-2xl font-bold text-orange-700">₹{pendingBalance.toLocaleString()}</div>
                        </div>
                        <button
                          onClick={handleSendPaymentReminder}
                          disabled={resendingEmail === "payment_reminder" || updating}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 text-sm flex items-center space-x-2"
                        >
                          <Send size={16} />
                          <span>Send Payment Reminder</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment History */}
                {completedPayments.length > 0 && (
                  <div className="pt-4 border-t border-neutral-200">
                    <h3 className="font-semibold text-neutral-900 mb-3">Payment History</h3>
                    <div className="space-y-3">
                      {completedPayments.map((payment, index) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                          <div>
                            <div className="text-sm font-medium text-neutral-900">
                              Payment {index + 1} - {payment.amount < booking.totalAmount ? "Advance" : "Full Payment"}
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">
                              {formatDate(payment.createdAt)} • {new Date(payment.createdAt).toLocaleTimeString()}
                            </div>
                            {payment.razorpayPaymentId && (
                              <div className="text-xs text-neutral-500 mt-1">
                                Transaction ID: {payment.razorpayPaymentId.slice(0, 20)}...
                              </div>
                            )}
                          </div>
                          <div className="text-lg font-bold text-green-700">₹{payment.amount.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vouchers / Itinerary */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Vouchers / Itinerary</h2>
              {booking.voucherUrl ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-900">Vouchers Uploaded</span>
                    <a
                      href={`/api/files?key=${encodeURIComponent(booking.voucherUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-green-700 hover:text-green-800 text-sm"
                    >
                      <Download size={16} />
                      <span>Download</span>
                    </a>
                  </div>
                  <p className="text-xs text-green-700">Uploaded on {formatDate(booking.updatedAt)}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-neutral-600">
                    Upload the final itinerary / vouchers as PDFs. This will be sent to the customer via email and made available in their dashboard.
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setVoucherFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                  />
                  {voucherFile && (
                    <button
                      onClick={handleVoucherUpload}
                      disabled={updating}
                      className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
                    >
                      {updating ? "Uploading..." : "Upload Vouchers"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Activity Log</h2>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div key={activity.id || index} className="flex items-start space-x-3 pb-4 border-b border-neutral-200 last:border-b-0 last:pb-0">
                      <div className="flex-shrink-0 mt-1">
                        <Clock size={16} className="text-neutral-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-neutral-900">{activity.description}</div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {new Date(activity.createdAt).toLocaleString()}
                          {activity.createdBy && ` • by ${activity.createdBy}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">No activity logged yet</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Booking Status */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Booking Status</h3>
              <div className="space-y-4">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
                >
                  <option value="BOOKED">Booked</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <button
                  onClick={handleStatusChange}
                  disabled={updating || selectedStatus === booking.status}
                  className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Status
                </button>
              </div>
            </div>

            {/* Email Actions */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Email Actions</h3>
              <div className="space-y-2">
                {booking.status === "CONFIRMED" && (
                  <button
                    onClick={() => handleResendEmail("tour_confirmed")}
                    disabled={resendingEmail === "tour_confirmed" || updating}
                    className="w-full text-left px-4 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                  >
                    <Send size={16} />
                    <span>Re-send &ldquo;Tour Confirmed&rdquo;</span>
                  </button>
                )}
                {booking.voucherUrl && (
                  <button
                    onClick={() => handleResendEmail("vouchers_ready")}
                    disabled={resendingEmail === "vouchers_ready" || updating}
                    className="w-full text-left px-4 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                  >
                    <Send size={16} />
                    <span>Re-send &ldquo;Vouchers Ready&rdquo;</span>
                  </button>
                )}
                {pendingBalance > 0 && (
                  <button
                    onClick={handleSendPaymentReminder}
                    disabled={resendingEmail === "payment_reminder" || updating}
                    className="w-full text-left px-4 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                  >
                    <Send size={16} />
                    <span>Send Payment Reminder</span>
                  </button>
                )}
                <button
                  onClick={() => handleResendEmail("status_update")}
                  disabled={resendingEmail === "status_update" || updating}
                  className="w-full text-left px-4 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                >
                  <Send size={16} />
                  <span>Re-send Status Update</span>
                </button>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Internal Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private notes visible only to admins..."
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm mb-3"
                rows={6}
              />
              <button
                onClick={handleSaveNotes}
                disabled={updating}
                className="w-full bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg font-medium hover:bg-neutral-200 disabled:opacity-50 text-sm"
              >
                Save Notes
              </button>
            </div>

            {/* Booking Info */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Booking Info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-600">Tour:</span>
                  <div className="font-medium">{booking.tourName || "N/A"}</div>
                </div>
                {booking.travelDate && (
                  <div>
                    <span className="text-neutral-600">Travel Date:</span>
                    <div className="font-medium">{formatDate(booking.travelDate)}</div>
                  </div>
                )}
                <div>
                  <span className="text-neutral-600">Total Amount:</span>
                  <div className="font-medium">₹{booking.totalAmount.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-neutral-600">Booked Date:</span>
                  <div className="font-medium">{formatDate(booking.createdAt)}</div>
                </div>
                {booking.processedBy && (
                  <div>
                    <span className="text-neutral-600">Assigned to:</span>
                    <div className="font-medium">{booking.processedBy.name || booking.processedBy.email}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
