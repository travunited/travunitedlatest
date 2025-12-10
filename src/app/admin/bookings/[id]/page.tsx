"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, Upload, Download, User, Mail, Phone, Calendar, CreditCard, Send, Clock, CheckCircle, X, AlertCircle, ArrowLeft, UserPlus, ChevronDown, FileDown, FileText, MapPin, Globe, MessageCircle, Ban, DollarSign, AlertTriangle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";
import { getCountryFlagUrl } from "@/lib/flags";

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
  email?: string | null;
  phone?: string | null;
}

interface TimelineEvent {
  id: string;
  time: string;
  event: string;
  adminName: string;
}

interface Booking {
  id: string;
  referenceNumber?: string;
  tourId: string | null;
  tourName: string | null;
  status: string;
  totalAmount: number;
  currency: string;
  travelDate: string | null;
  voucherUrl: string | null;
  invoiceUrl: string | null;
  invoiceUploadedAt: string | null;
  invoiceUploadedByAdminId: string | null;
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
    firstName?: string | null;
    lastName?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    nationality?: string | null;
    passportNumber?: string | null;
    passportExpiry?: string | null;
    passportIssuingCountry?: string | null;
    passportFileKey?: string | null;
    passportFileName?: string | null;
  }>;
  payments?: Payment[];
  processedBy?: {
    id?: string;
    name: string;
    email: string;
  } | null;
  tour?: {
    id: string;
    name: string;
    destination?: string | null;
    duration?: string | null;
    price?: number | null;
    cancellationTerms?: string | null;
    bookingPolicies?: string | null;
    country?: {
      id: string;
      name: string;
      code: string;
      flagUrl: string | null;
    } | null;
  } | null;
  timeline?: TimelineEvent[];
  amountPaid?: number;
  pendingBalance?: number;
  foodPreference?: string | null;
  foodPreferenceNotes?: string | null;
  languagePreference?: string | null;
  languagePreferenceOther?: string | null;
  driverPreference?: string | null;
  specialRequests?: string | null;
  policyAccepted?: boolean;
  policyAcceptedAt?: string | null;
  policyAcceptedIp?: string | null;
  policyAcceptedUserAgent?: string | null;
  addOns?: Array<{
    id: string;
    addOnId?: string | null;
    name: string;
    pricingType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
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
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [admins, setAdmins] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [removingInvoice, setRemovingInvoice] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showOfflinePaymentModal, setShowOfflinePaymentModal] = useState(false);
  const [offlinePaymentAmount, setOfflinePaymentAmount] = useState("");
  const [offlinePaymentProof, setOfflinePaymentProof] = useState<File | null>(null);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string;
    action: string;
    description: string;
    createdAt: string;
    adminName?: string;
  }>>([]);

  const fetchBooking = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setBooking(data);
        setSelectedStatus(data.status);
        setNotes(data.notes || "");
        if (data.processedBy?.id) {
          setSelectedAdminId(data.processedBy.id);
        }
        // Set all payments (not just completed)
        if (data.payments) {
          setAllPayments(data.payments);
        }
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchAdmins = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/settings/admins");
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.map((admin: { id: string; name: string | null; email: string }) => ({
          id: admin.id,
          name: admin.name || admin.email,
          email: admin.email,
        })));
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/activities`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    }
  }, [params.id]);

  useEffect(() => {
    fetchBooking();
    fetchAdmins();
    fetchAuditLogs();
  }, [fetchBooking, fetchAdmins, fetchAuditLogs]);

  const handleStatusChange = async () => {
    if (!booking) return;
    
    if (selectedStatus === "CANCELLED") {
      if (!confirm("Are you sure you want to cancel this booking?")) {
        return;
      }
    }
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (response.ok) {
        await fetchBooking();
        setActionMessage({ type: "success", text: "Status updated successfully" });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setActionMessage({ type: "error", text: errorData.error || "Failed to update status" });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (error) {
      setActionMessage({ type: "error", text: "An error occurred while updating status" });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignAdmin = async (adminId: string) => {
    if (!adminId) {
      setActionMessage({ type: "error", text: "Please select an admin" });
      setTimeout(() => setActionMessage(null), 5000);
      return;
    }

    setAssigningAdmin(true);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      if (response.ok) {
        await fetchBooking();
        setShowAssignDropdown(false);
        setActionMessage({ type: "success", text: "Booking assigned successfully" });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        const error = await response.json();
        setActionMessage({ type: "error", text: error.error || "Failed to assign booking" });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (error) {
      console.error("Error assigning admin:", error);
      setActionMessage({ type: "error", text: "An error occurred while assigning admin" });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setAssigningAdmin(false);
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
        setVoucherFile(null);
        setActionMessage({ type: "success", text: "Voucher uploaded successfully" });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setActionMessage({ type: "error", text: errorData.error || "Failed to upload voucher" });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (error) {
      setActionMessage({ type: "error", text: "An error occurred while uploading voucher" });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      setActionMessage({ type: "error", text: "Please enter a note" });
      setTimeout(() => setActionMessage(null), 5000);
      return;
    }

    setAddingNote(true);
    setActionMessage(null);
    try {
      // Append to existing notes
      const updatedNotes = notes ? `${notes}\n\n[${new Date().toLocaleString()}] ${newNote}` : `[${new Date().toLocaleString()}] ${newNote}`;
      
      const response = await fetch(`/api/admin/bookings/${params.id}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updatedNotes }),
      });

      if (response.ok) {
        await fetchBooking();
        setNewNote("");
        setActionMessage({ type: "success", text: "Note added successfully" });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setActionMessage({ type: "error", text: errorData.error || "Failed to add note" });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (error) {
      console.error("Error adding note:", error);
      setActionMessage({ type: "error", text: "An error occurred while adding note" });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setAddingNote(false);
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
        setActionMessage({ type: "success", text: "Email sent successfully" });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setActionMessage({ type: "error", text: errorData.error || "Failed to send email" });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (error) {
      setActionMessage({ type: "error", text: "An error occurred while sending email" });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setResendingEmail(null);
    }
  };

  const handleSendPaymentReminder = async () => {
    await handleResendEmail("payment_reminder");
  };

  const handleConfirmBooking = async () => {
    if (!booking) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });

      if (response.ok) {
        await fetchBooking();
        await fetchAuditLogs();
        setActionMessage({ type: "success", text: "Booking confirmed successfully. Customer will be notified." });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setActionMessage({ type: "error", text: errorData.error || "Failed to confirm booking" });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (error) {
      setActionMessage({ type: "error", text: "An error occurred while confirming booking" });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !cancelReason.trim()) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reason: cancelReason,
          status: "CANCELLED"
        }),
      });

      if (response.ok) {
        await fetchBooking();
        await fetchAuditLogs();
        setShowCancelModal(false);
        setCancelReason("");
        setActionMessage({ type: "success", text: "Booking cancelled successfully. Customer will be notified." });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setActionMessage({ type: "error", text: errorData.error || "Failed to cancel booking" });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (error) {
      setActionMessage({ type: "error", text: "An error occurred while cancelling booking" });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setUpdating(false);
    }
  };

  const handleRecordOfflinePayment = async () => {
    if (!booking || !offlinePaymentAmount) return;
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append("amount", offlinePaymentAmount);
      if (offlinePaymentProof) {
        formData.append("proof", offlinePaymentProof);
      }

      const response = await fetch(`/api/admin/bookings/${params.id}/offline-payment`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await fetchBooking();
        await fetchAuditLogs();
        setShowOfflinePaymentModal(false);
        setOfflinePaymentAmount("");
        setOfflinePaymentProof(null);
        setActionMessage({ type: "success", text: "Offline payment recorded successfully" });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setActionMessage({ type: "error", text: errorData.error || "Failed to record offline payment" });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (error) {
      setActionMessage({ type: "error", text: "An error occurred while recording offline payment" });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setUpdating(false);
    }
  };

  const handleSendNotification = async (notificationType: string) => {
    if (!booking) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationType }),
      });

      if (response.ok) {
        setActionMessage({ type: "success", text: "Notification sent successfully" });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setActionMessage({ type: "error", text: errorData.error || "Failed to send notification" });
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (error) {
      setActionMessage({ type: "error", text: "An error occurred while sending notification" });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setUpdating(false);
    }
  };

  // Parse notes into list (if formatted with timestamps)
  const parseNotes = (notesText: string | null): Array<{ timestamp: string; message: string }> => {
    if (!notesText) return [];
    
    // Try to parse notes that are formatted as [timestamp] message
    const lines = notesText.split('\n\n');
    return lines.map(line => {
      const match = line.match(/^\[(.+?)\]\s*(.+)$/);
      if (match) {
        return { timestamp: match[1], message: match[2] };
      }
      return { timestamp: '', message: line };
    }).filter(n => n.message.trim());
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
  const notesList = parseNotes(booking.notes);
  const primaryTraveller = booking.travellers[0]?.traveller;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Messages */}
        {actionMessage && (
          <div
            className={`mb-6 rounded-lg p-4 flex items-center space-x-2 ${
              actionMessage.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {actionMessage.type === "success" ? (
              <CheckCircle size={20} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={20} className="flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="ml-auto text-current opacity-70 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Header Bar */}
        <div className="mb-8">
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6 text-sm"
          >
            <ArrowLeft size={16} />
            Back to Bookings
          </Link>
          
          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Left: Reference & Tour Info */}
              <div className="flex items-start gap-4">
                {(() => {
                  if (!booking.tour?.country) return null;
                  const flagUrl = getCountryFlagUrl(booking.tour.country.flagUrl, booking.tour.country.code, 160);
                  return flagUrl ? (
                    <Image
                      src={flagUrl}
                      alt={booking.tour.country.name}
                      width={48}
                      height={32}
                      className="rounded object-cover border border-neutral-200"
                    />
                  ) : null;
                })()}
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">
                    {booking.tourName || booking.tour?.name || "Tour Booking"}
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    Reference: <span className="font-mono font-semibold">{booking.referenceNumber || `TRB-${new Date(booking.createdAt).getFullYear()}-${booking.id.slice(-5).toUpperCase()}`}</span>
                  </p>
                </div>
              </div>

              {/* Right: Status Badge & Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  booking.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                  booking.status === "COMPLETED" ? "bg-neutral-100 text-neutral-700" :
                  booking.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                  booking.status === "BOOKED" ? "bg-blue-100 text-blue-700" :
                  booking.status === "REQUEST_RECEIVED" ? "bg-purple-100 text-purple-700" :
                  booking.status === "PAYMENT_PENDING" ? "bg-yellow-100 text-yellow-700" :
                  "bg-neutral-100 text-neutral-700"
                }`}>
                  {booking.status.replace(/_/g, " ")}
                </span>
                
                {/* Assign Admin Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <UserPlus size={16} />
                    {booking.processedBy ? booking.processedBy.name || booking.processedBy.email : "Assign Admin"}
                    <ChevronDown size={16} />
                  </button>
                  {showAssignDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                      {admins.length > 0 ? (
                        <div className="p-2">
                          {admins.map((admin) => (
                            <button
                              key={admin.id}
                              onClick={() => handleAssignAdmin(admin.id)}
                              disabled={assigningAdmin}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 rounded ${
                                booking.processedBy?.id === admin.id ? "bg-primary-50 text-primary-700" : ""
                              }`}
                            >
                              <div className="font-medium">{admin.name}</div>
                              <div className="text-xs text-neutral-500">{admin.email}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-sm text-neutral-500">No admins available</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Booking & Traveller Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Overview */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Booking Overview</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Tour Name</div>
                  <div className="font-medium text-neutral-900">{booking.tourName || booking.tour?.name || "N/A"}</div>
                </div>
                {booking.tour?.destination && (
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Destination</div>
                    <div className="font-medium text-neutral-900">{booking.tour.destination}</div>
                  </div>
                )}
                {booking.tour?.duration && (
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Duration</div>
                    <div className="font-medium text-neutral-900">{booking.tour.duration}</div>
                  </div>
                )}
                {booking.travelDate && (
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Travel Date</div>
                    <div className="font-medium text-neutral-900">{formatDate(booking.travelDate)}</div>
                  </div>
                )}
                {booking.tour?.country && (
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Country</div>
                    <div className="font-medium text-neutral-900">{booking.tour.country.name}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Total Amount</div>
                  <div className="font-medium text-neutral-900">₹{booking.totalAmount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Booked Date</div>
                  <div className="font-medium text-neutral-900">{formatDate(booking.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Last Updated</div>
                  <div className="font-medium text-neutral-900">{formatDate(booking.updatedAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Policy Acceptance</div>
                  {booking.policyAccepted ? (
                    <div className="font-medium text-green-700">
                      Accepted {booking.policyAcceptedAt ? `on ${formatDate(booking.policyAcceptedAt)}` : ""}
                      {booking.policyAcceptedIp && (
                        <span className="block text-xs text-neutral-500">IP: {booking.policyAcceptedIp}</span>
                      )}
                    </div>
                  ) : (
                    <div className="font-medium text-red-600">Not accepted</div>
                  )}
                </div>
              </div>
            </div>

            {/* Primary Contact */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Customer & Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Full Name</div>
                  <div className="font-medium text-neutral-900">{booking.user.name || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Email</div>
                  <div className="font-medium text-neutral-900">{booking.user.email}</div>
                </div>
                {booking.user.phone && (
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Phone</div>
                    <div className="font-medium text-neutral-900">{booking.user.phone}</div>
                  </div>
                )}
              </div>
              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-200">
                {booking.user.phone && (
                  <>
                    <a
                      href={`tel:${booking.user.phone}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <Phone size={16} />
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${booking.user.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <MessageCircle size={16} />
                      WhatsApp
                    </a>
                  </>
                )}
                <a
                  href={`mailto:${booking.user.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  <Mail size={16} />
                  Email
                </a>
              </div>
            </div>

            {/* Custom Package Request */}
            {booking.status === "REQUEST_RECEIVED" && booking.specialRequests && booking.specialRequests.includes("[CUSTOMISED PACKAGE REQUEST]") && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl shadow-medium p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="text-purple-600" size={24} />
                  <h2 className="text-xl font-bold text-purple-900">Custom Package Request</h2>
                </div>
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-neutral-700 whitespace-pre-line">
                    {booking.specialRequests.split("[CUSTOMISED PACKAGE REQUEST]")[1]?.trim() || booking.specialRequests}
                  </p>
                </div>
                <p className="text-sm text-purple-700 mt-3">
                  This booking requires admin approval. Review the custom request details above and approve or reject accordingly.
                </p>
              </div>
            )}

            {(booking.foodPreference ||
              booking.foodPreferenceNotes ||
              booking.languagePreference ||
              booking.languagePreferenceOther ||
              booking.driverPreference ||
              booking.specialRequests) && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Guest Preferences</h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-neutral-700">
                  {booking.foodPreference && (
                    <div>
                      <span className="text-neutral-500 block mb-1">Food Preference</span>
                      <span className="font-medium text-neutral-900">{booking.foodPreference}</span>
                    </div>
                  )}
                  {booking.foodPreferenceNotes && (
                    <div>
                      <span className="text-neutral-500 block mb-1">Food Notes</span>
                      <span className="font-medium text-neutral-900">{booking.foodPreferenceNotes}</span>
                    </div>
                  )}
                  {booking.languagePreference && (
                    <div>
                      <span className="text-neutral-500 block mb-1">Language Preference</span>
                      <span className="font-medium text-neutral-900">
                        {booking.languagePreference === "other"
                          ? booking.languagePreferenceOther || "Other"
                          : booking.languagePreference}
                      </span>
                    </div>
                  )}
                  {booking.driverPreference && (
                    <div>
                      <span className="text-neutral-500 block mb-1">Driver Preference</span>
                      <span className="font-medium text-neutral-900">{booking.driverPreference}</span>
                    </div>
                  )}
                  {booking.specialRequests && (
                    <div className="md:col-span-2">
                      <span className="text-neutral-500 block mb-1">Special Requests</span>
                      <span className="font-medium text-neutral-900 whitespace-pre-line">
                        {booking.specialRequests}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Travellers List */}
            {booking.travellers.length > 0 && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Travellers</h2>
                <div className="space-y-4">
                  {booking.travellers.map((t, index) => {
                    const profile = t.traveller;
                    const displayFirstName = t.firstName || profile.firstName;
                    const displayLastName = t.lastName || profile.lastName;
                    const passportNumber = t.passportNumber || null;
                    const passportExpiry = t.passportExpiry || null;
                    return (
                      <div key={profile.id} className="border border-neutral-200 rounded-lg p-4">
                        <h3 className="font-semibold mb-3">
                          {index === 0 ? "Primary Traveller" : `Traveller ${index + 1}`}
                        </h3>
                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-neutral-600">Name:</span>{" "}
                            <span className="font-medium">
                              {displayFirstName} {displayLastName}
                            </span>
                          </div>
                          {(t.dateOfBirth || profile.dateOfBirth) && (
                            <div>
                              <span className="text-neutral-600">Date of Birth:</span>{" "}
                              <span className="font-medium">
                                {formatDate(t.dateOfBirth || profile.dateOfBirth!)}
                              </span>
                            </div>
                          )}
                          {(t.gender || profile.gender) && (
                            <div>
                              <span className="text-neutral-600">Gender:</span>{" "}
                              <span className="font-medium">{t.gender || profile.gender}</span>
                            </div>
                          )}
                          {(profile.email || profile.phone) && (
                            <>
                              {profile.email && (
                                <div>
                                  <span className="text-neutral-600">Email:</span>{" "}
                                  <span className="font-medium">{profile.email}</span>
                                </div>
                              )}
                              {profile.phone && (
                                <div>
                                  <span className="text-neutral-600">Phone:</span>{" "}
                                  <span className="font-medium">{profile.phone}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {(t.nationality || passportNumber || passportExpiry || t.passportFileKey) && (
                          <div className="grid md:grid-cols-2 gap-3 text-sm text-neutral-700 mt-4">
                            {t.nationality && (
                              <div>
                                <span className="text-neutral-500">Nationality:</span>{" "}
                                <span className="font-medium text-neutral-900">{t.nationality}</span>
                              </div>
                            )}
                            {passportNumber && (
                              <div>
                                <span className="text-neutral-500">Passport #:</span>{" "}
                                <span className="font-medium text-neutral-900 font-mono">{passportNumber}</span>
                              </div>
                            )}
                            {t.passportIssuingCountry && (
                              <div>
                                <span className="text-neutral-500">Issuing Country:</span>{" "}
                                <span className="font-medium text-neutral-900">{t.passportIssuingCountry}</span>
                              </div>
                            )}
                            {passportExpiry && (
                              <div>
                                <span className="text-neutral-500">Passport Expiry:</span>{" "}
                                <span className={`font-medium ${(() => {
                                  if (!booking.travelDate) return "text-neutral-900";
                                  const expiryDate = new Date(passportExpiry);
                                  const travelDate = new Date(booking.travelDate);
                                  const sixMonthsFromTravel = new Date(travelDate);
                                  sixMonthsFromTravel.setMonth(sixMonthsFromTravel.getMonth() + 6);
                                  if (expiryDate < sixMonthsFromTravel) {
                                    return "text-red-600";
                                  }
                                  return "text-green-600";
                                })()}`}>
                                  {formatDate(passportExpiry)}
                                </span>
                                {booking.travelDate && (() => {
                                  const expiryDate = new Date(passportExpiry);
                                  const travelDate = new Date(booking.travelDate);
                                  const sixMonthsFromTravel = new Date(travelDate);
                                  sixMonthsFromTravel.setMonth(sixMonthsFromTravel.getMonth() + 6);
                                  if (expiryDate < sixMonthsFromTravel) {
                                    return (
                                      <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <AlertTriangle size={12} />
                                        Passport expires less than 6 months from travel date
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                        {t.passportFileKey && (
                          <div className="mt-3 pt-3 border-t border-neutral-200">
                            <div className="flex items-center justify-between">
                              <a
                                href={`/api/files?key=${encodeURIComponent(t.passportFileKey)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                              >
                                <Download size={16} />
                                Download Passport Copy
                              </a>
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                Received
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Documents Section */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Documents</h2>
              <div className="space-y-4">
                {booking.travellers.map((t, index) => {
                  if (!t.passportFileKey) return null;
                  return (
                    <div key={index} className="border border-neutral-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-neutral-900">
                            {t.firstName || t.traveller.firstName} {t.lastName || t.traveller.lastName} - Passport
                          </div>
                          <div className="text-sm text-neutral-500 mt-1">
                            {t.passportFileName || "passport.pdf"}
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Received
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <a
                          href={`/api/files?key=${encodeURIComponent(t.passportFileKey)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <Download size={16} />
                          Download
                        </a>
                      </div>
                    </div>
                  );
                })}
                {booking.travellers.every(t => !t.passportFileKey) && (
                  <div className="text-center py-8 text-neutral-500">
                    <FileText size={48} className="mx-auto mb-2 text-neutral-300" />
                    <p className="text-sm">No documents uploaded yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Add-ons */}
            {booking.addOns && booking.addOns.length > 0 && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Add-ons & Upgrades</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-600 uppercase text-xs tracking-wide">
                        <th className="px-4 py-2 font-medium">Add-on</th>
                        <th className="px-4 py-2 font-medium">Pricing Type</th>
                        <th className="px-4 py-2 font-medium">Quantity</th>
                        <th className="px-4 py-2 font-medium">Unit Price</th>
                        <th className="px-4 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booking.addOns.map((addOn) => (
                        <tr key={addOn.id} className="border-b border-neutral-100">
                          <td className="px-4 py-3 font-medium text-neutral-900">{addOn.name}</td>
                          <td className="px-4 py-3 capitalize text-neutral-600">
                            {addOn.pricingType.replace("_", " ").toLowerCase()}
                          </td>
                          <td className="px-4 py-3">{addOn.quantity}</td>
                          <td className="px-4 py-3">₹{addOn.unitPrice.toLocaleString()}</td>
                          <td className="px-4 py-3 font-semibold text-neutral-900">
                            ₹{addOn.totalPrice.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Payment Summary</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <div className="text-sm text-neutral-600 mb-1">Total Amount</div>
                    <div className="text-2xl font-bold text-neutral-900">₹{booking.totalAmount.toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-neutral-600 mb-1">Amount Paid</div>
                    <div className="text-2xl font-bold text-green-700">₹{amountPaid.toLocaleString()}</div>
                  </div>
                  <div className={`p-4 rounded-lg ${pendingBalance > 0 ? "bg-orange-50" : "bg-green-50"}`}>
                    <div className="text-sm text-neutral-600 mb-1">Pending Balance</div>
                    <div className={`text-2xl font-bold ${pendingBalance > 0 ? "text-orange-700" : "text-green-700"}`}>
                      ₹{pendingBalance.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Payment Timeline */}
                <div className="pt-4 border-t border-neutral-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-neutral-900">Payment Timeline</h3>
                    <button
                      onClick={() => setShowOfflinePaymentModal(true)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                      <DollarSign size={16} />
                      Record Offline Payment
                    </button>
                  </div>
                  {allPayments.length > 0 ? (
                    <div className="space-y-3">
                      {allPayments.map((payment, index) => (
                        <div key={payment.id} className={`flex items-center justify-between p-3 rounded-lg ${
                          payment.status === "COMPLETED" ? "bg-green-50 border border-green-200" :
                          payment.status === "FAILED" ? "bg-red-50 border border-red-200" :
                          payment.status === "REFUNDED" ? "bg-purple-50 border border-purple-200" :
                          "bg-neutral-50 border border-neutral-200"
                        }`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-sm font-medium text-neutral-900">
                                Payment {index + 1} - {payment.amount < booking.totalAmount ? "Advance" : "Full Payment"}
                              </div>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                payment.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                                payment.status === "FAILED" ? "bg-red-100 text-red-700" :
                                payment.status === "REFUNDED" ? "bg-purple-100 text-purple-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {payment.status}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-500 mt-1">
                              {formatDate(payment.createdAt)} • {new Date(payment.createdAt).toLocaleTimeString()}
                            </div>
                            {payment.razorpayPaymentId && (
                              <div className="text-xs text-neutral-500 mt-1">
                                Transaction ID: {payment.razorpayPaymentId.slice(0, 20)}...
                              </div>
                            )}
                            {payment.razorpayOrderId && (
                              <div className="text-xs text-neutral-500 mt-1">
                                Order ID: {payment.razorpayOrderId}
                              </div>
                            )}
                          </div>
                          <div className={`text-lg font-bold ${
                            payment.status === "COMPLETED" ? "text-green-700" :
                            payment.status === "REFUNDED" ? "text-purple-700" :
                            "text-neutral-700"
                          }`}>
                            ₹{payment.amount.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-neutral-500 text-sm">
                      No payment attempts yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cancellation & Refund */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Cancellation & Refund</h2>
              <div className="space-y-4">
                {booking.status === "CANCELLED" ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="text-red-600" size={20} />
                      <span className="font-medium text-red-900">Booking Cancelled</span>
                    </div>
                    <p className="text-sm text-red-700">
                      This booking has been cancelled. Refund processing will be handled separately.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <h3 className="font-semibold text-neutral-900 mb-2">Cancellation Policy</h3>
                      <p className="text-sm text-neutral-700 mb-3">
                        Cancellation policies vary by tour. Please refer to the tour&apos;s specific cancellation terms.
                        Refunds, if applicable, will be processed according to the policy.
                      </p>
                      {booking.tour?.cancellationTerms && (
                        <div className="mt-3 p-3 bg-white rounded border border-neutral-200">
                          <p className="text-sm text-neutral-700 whitespace-pre-line">
                            {booking.tour.cancellationTerms}
                          </p>
                        </div>
                      )}
                    </div>
                    {booking.status !== "CANCELLED" && (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <Ban size={16} />
                        Cancel Booking
                      </button>
                    )}
                  </>
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

            {/* Timeline */}
            {booking.timeline && booking.timeline.length > 0 && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Booking Timeline</h2>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-200"></div>
                  <div className="space-y-6">
                    {booking.timeline.map((event, index) => (
                      <div key={event.id || index} className="relative pl-12">
                        <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-primary-100 border-2 border-primary-600 flex items-center justify-center">
                          <Clock size={14} className="text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900">{event.event}</div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {formatDate(event.time)} {event.adminName && `• by ${event.adminName}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {booking.status === "REQUEST_RECEIVED" && (
                  <>
                    <button
                      onClick={async () => {
                        if (!booking) return;
                        setUpdating(true);
                        try {
                          const response = await fetch(`/api/admin/bookings/${params.id}/status`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "CONFIRMED" }),
                          });

                          if (response.ok) {
                            await fetchBooking();
                            await fetchAuditLogs();
                            setActionMessage({ type: "success", text: "Custom package request approved. Booking confirmed." });
                            setTimeout(() => setActionMessage(null), 5000);
                          } else {
                            const errorData = await response.json().catch(() => ({}));
                            setActionMessage({ type: "error", text: errorData.error || "Failed to approve request" });
                            setTimeout(() => setActionMessage(null), 5000);
                          }
                        } catch (error) {
                          setActionMessage({ type: "error", text: "An error occurred while approving request" });
                          setTimeout(() => setActionMessage(null), 5000);
                        } finally {
                          setUpdating(false);
                        }
                      }}
                      disabled={updating}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Approve Custom Package
                    </button>
                    <button
                      onClick={async () => {
                        if (!booking) return;
                        const reason = prompt("Please provide a reason for rejection:");
                        if (!reason) return;
                        setUpdating(true);
                        try {
                          const response = await fetch(`/api/admin/bookings/${params.id}/cancel`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ reason, status: "CANCELLED" }),
                          });

                          if (response.ok) {
                            await fetchBooking();
                            await fetchAuditLogs();
                            setActionMessage({ type: "success", text: "Custom package request rejected." });
                            setTimeout(() => setActionMessage(null), 5000);
                          } else {
                            const errorData = await response.json().catch(() => ({}));
                            setActionMessage({ type: "error", text: errorData.error || "Failed to reject request" });
                            setTimeout(() => setActionMessage(null), 5000);
                          }
                        } catch (error) {
                          setActionMessage({ type: "error", text: "An error occurred while rejecting request" });
                          setTimeout(() => setActionMessage(null), 5000);
                        } finally {
                          setUpdating(false);
                        }
                      }}
                      disabled={updating}
                      className="w-full bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      Reject Request
                    </button>
                  </>
                )}
                {booking.status !== "CONFIRMED" && booking.status !== "CANCELLED" && booking.status !== "REQUEST_RECEIVED" && (
                  <button
                    onClick={handleConfirmBooking}
                    disabled={updating}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Confirm Booking
                  </button>
                )}
                {booking.status !== "CANCELLED" && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={updating}
                    className="w-full bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Ban size={16} />
                    Cancel Booking
                  </button>
                )}
                {pendingBalance > 0 && (
                  <button
                    onClick={() => setShowOfflinePaymentModal(true)}
                    disabled={updating}
                    className="w-full bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <DollarSign size={16} />
                    Mark as Paid
                  </button>
                )}
                <button
                  onClick={() => handleSendNotification("status_update")}
                  disabled={updating}
                  className="w-full bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  Send Notification
                </button>
              </div>
            </div>

            {/* Booking Status Control */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Change Status</h3>
              <div className="space-y-4">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="REQUEST_RECEIVED">Request Received</option>
                  <option value="PAYMENT_PENDING">Payment Pending</option>
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
                  {updating ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>

            {/* Payment Reminder */}
            {pendingBalance > 0 && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h3 className="font-semibold text-neutral-900 mb-4">Payment Reminder</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-sm text-neutral-600 mb-1">Pending Balance</div>
                    <div className="text-xl font-bold text-orange-700">₹{pendingBalance.toLocaleString()}</div>
                  </div>
                  <button
                    onClick={handleSendPaymentReminder}
                    disabled={resendingEmail === "payment_reminder" || updating}
                    className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    {resendingEmail === "payment_reminder" ? "Sending..." : "Send Payment Reminder"}
                  </button>
                </div>
              </div>
            )}

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

            {/* Invoice Management */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Invoice</h3>
              {booking.invoiceUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText size={20} className="text-green-600" />
                      <div>
                        <div className="text-sm font-medium text-green-900">Invoice Available</div>
                        {booking.invoiceUploadedAt && (
                          <div className="text-xs text-green-700">
                            Uploaded {formatDate(booking.invoiceUploadedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/api/invoices/download/booking/${params.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Download
                    </a>
                  </div>
                  <div className="flex space-x-2">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setUploadingInvoice(true);
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            
                            const response = await fetch(`/api/admin/bookings/${params.id}/invoice`, {
                              method: "POST",
                              body: formData,
                            });
                            
                            if (response.ok) {
                              await fetchBooking();
                              setActionMessage({ type: "success", text: "Invoice uploaded successfully" });
                              setTimeout(() => setActionMessage(null), 5000);
                            } else {
                              const error = await response.json();
                              setActionMessage({ type: "error", text: error.error || "Failed to upload invoice" });
                              setTimeout(() => setActionMessage(null), 5000);
                            }
                          } catch (error) {
                            setActionMessage({ type: "error", text: "An error occurred while uploading invoice" });
                            setTimeout(() => setActionMessage(null), 5000);
                          } finally {
                            setUploadingInvoice(false);
                            if (e.target) e.target.value = "";
                          }
                        }}
                        disabled={uploadingInvoice}
                      />
                      <div className="w-full bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-center text-sm">
                        {uploadingInvoice ? "Uploading..." : "Replace Invoice"}
                      </div>
                    </label>
                    <button
                      onClick={async () => {
                        if (!confirm("Are you sure you want to remove this invoice?")) return;
                        
                        setRemovingInvoice(true);
                        try {
                          const response = await fetch(`/api/admin/bookings/${params.id}/invoice`, {
                            method: "DELETE",
                          });
                          
                          if (response.ok) {
                            await fetchBooking();
                            setActionMessage({ type: "success", text: "Invoice removed successfully" });
                            setTimeout(() => setActionMessage(null), 5000);
                          } else {
                            const errorData = await response.json().catch(() => ({}));
                            setActionMessage({ type: "error", text: errorData.error || "Failed to remove invoice" });
                            setTimeout(() => setActionMessage(null), 5000);
                          }
                        } catch (error) {
                          setActionMessage({ type: "error", text: "An error occurred while removing invoice" });
                          setTimeout(() => setActionMessage(null), 5000);
                        } finally {
                          setRemovingInvoice(false);
                        }
                      }}
                      disabled={removingInvoice}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {removingInvoice ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-center">
                    <FileText size={24} className="text-neutral-400 mx-auto mb-2" />
                    <p className="text-sm text-neutral-600 mb-4">No invoice uploaded</p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setUploadingInvoice(true);
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            
                            const response = await fetch(`/api/admin/bookings/${params.id}/invoice`, {
                              method: "POST",
                              body: formData,
                            });
                            
                            if (response.ok) {
                              await fetchBooking();
                              setActionMessage({ type: "success", text: "Invoice uploaded successfully" });
                              setTimeout(() => setActionMessage(null), 5000);
                            } else {
                              const error = await response.json();
                              setActionMessage({ type: "error", text: error.error || "Failed to upload invoice" });
                              setTimeout(() => setActionMessage(null), 5000);
                            }
                          } catch (error) {
                            setActionMessage({ type: "error", text: "An error occurred while uploading invoice" });
                            setTimeout(() => setActionMessage(null), 5000);
                          } finally {
                            setUploadingInvoice(false);
                            if (e.target) e.target.value = "";
                          }
                        }}
                        disabled={uploadingInvoice}
                      />
                      <div className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-center text-sm">
                        {uploadingInvoice ? "Uploading..." : "Upload Invoice (PDF)"}
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Internal Notes */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Internal Notes</h3>
              <div className="space-y-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
                  rows={3}
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="w-full bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingNote ? "Adding..." : "Add Note"}
                </button>
                
                {notesList.length > 0 && (
                  <div className="pt-4 border-t border-neutral-200">
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {notesList.map((note, index) => (
                        <div key={index} className="text-sm">
                          {note.timestamp && (
                            <div className="text-xs text-neutral-500 mb-1">{note.timestamp}</div>
                          )}
                          <div className="text-neutral-900">{note.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Log */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Audit Log</h3>
              {auditLogs.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="text-sm border-l-2 border-neutral-200 pl-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-neutral-900">{log.action}</span>
                        <span className="text-xs text-neutral-500">{formatDate(log.createdAt)}</span>
                      </div>
                      <div className="text-neutral-700">{log.description}</div>
                      {log.adminName && (
                        <div className="text-xs text-neutral-500 mt-1">by {log.adminName}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-neutral-500 text-sm">
                  No audit logs available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cancel Booking Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-neutral-900 mb-4">Cancel Booking</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Please provide a reason for cancelling this booking. The customer will be notified.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm mb-4"
                rows={4}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                  }}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={!cancelReason.trim() || updating}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offline Payment Modal */}
        {showOfflinePaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-neutral-900 mb-4">Record Offline Payment</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={offlinePaymentAmount}
                    onChange={(e) => setOfflinePaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
                    min="0"
                    max={pendingBalance}
                  />
                  {pendingBalance > 0 && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Pending balance: ₹{pendingBalance.toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Payment Proof (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setOfflinePaymentProof(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowOfflinePaymentModal(false);
                      setOfflinePaymentAmount("");
                      setOfflinePaymentProof(null);
                    }}
                    className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecordOfflinePayment}
                    disabled={!offlinePaymentAmount || updating}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? "Recording..." : "Record Payment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
