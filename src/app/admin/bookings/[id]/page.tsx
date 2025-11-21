"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, Upload, Download, User, Mail, Phone, Calendar, CreditCard, Send, Clock, CheckCircle, X, AlertCircle, ArrowLeft, UserPlus, ChevronDown, FileDown, MapPin, Globe } from "lucide-react";
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
        setAdmins(data.map((admin: any) => ({
          id: admin.id,
          name: admin.name || admin.email,
          email: admin.email,
        })));
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    }
  }, []);

  useEffect(() => {
    fetchBooking();
    fetchAdmins();
  }, [fetchBooking, fetchAdmins]);

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

  const handleAssignAdmin = async (adminId: string) => {
    if (!adminId) {
      alert("Please select an admin");
      return;
    }

    setAssigningAdmin(true);
    try {
      const response = await fetch(`/api/admin/bookings/${params.id}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      if (response.ok) {
        await fetchBooking();
        setShowAssignDropdown(false);
        alert("Booking assigned successfully");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to assign booking");
      }
    } catch (error) {
      console.error("Error assigning admin:", error);
      alert("An error occurred");
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

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      alert("Please enter a note");
      return;
    }

    setAddingNote(true);
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
        alert("Note added successfully");
      } else {
        alert("Failed to add note");
      }
    } catch (error) {
      console.error("Error adding note:", error);
      alert("An error occurred");
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
    await handleResendEmail("payment_reminder");
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
                
                {completedPayments.length > 0 && (
                  <button
                    onClick={() => {
                      // TODO: Generate/download invoice
                      alert("Invoice download coming soon");
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <FileDown size={16} />
                    Download Invoice
                  </button>
                )}
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
              </div>
            </div>

            {/* Primary Contact */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Primary Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
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
            </div>

            {/* Travellers List */}
            {booking.travellers.length > 0 && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Travellers</h2>
                <div className="space-y-4">
                  {booking.travellers.map((t, index) => (
                    <div key={t.traveller.id} className="border border-neutral-200 rounded-lg p-4">
                      <h3 className="font-semibold mb-3">
                        {index === 0 ? "Primary Traveller" : `Traveller ${index + 1}`}
                      </h3>
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
                        {t.traveller.email && (
                          <div>
                            <span className="text-neutral-600">Email:</span>{" "}
                            <span className="font-medium">{t.traveller.email}</span>
                          </div>
                        )}
                        {t.traveller.phone && (
                          <div>
                            <span className="text-neutral-600">Phone:</span>{" "}
                            <span className="font-medium">{t.traveller.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
