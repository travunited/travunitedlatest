"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Calendar, Users, DollarSign, Download, CheckCircle, Clock, AlertCircle, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/dateFormat";
import { loadRazorpayScript } from "@/lib/razorpay-client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface Booking {
  id: string;
  tourId: string;
  tourName: string;
  status: string;
  totalAmount: number;
  discountAmount?: number;
  travelDate: string | null;
  voucherUrl: string | null;
  invoiceUrl: string | null;
  createdAt: string;
  travellers: Array<{
    traveller: {
      firstName: string;
      lastName: string;
    };
  }>;
  promoCode?: {
    id: string;
    code: string;
  } | null;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setBooking(data);
        // Calculate pending balance (if advance payment was made)
        // In production, this would come from payment records
        if (data.status === "BOOKED" || data.status === "PAYMENT_PENDING") {
          // Check if full payment was made
          // For now, assume if status is BOOKED, full payment is done
        }
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (session) {
      fetchBooking();
    }
  }, [session, fetchBooking]);

  const handlePayRemaining = async () => {
    if (!booking) return;

    try {
      setPaymentLoading(true);
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: pendingBalance,
          bookingId: booking.id,
          paymentType: "full",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment order");
      }

      const { orderId, keyId, amount, currency } = await response.json();
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay SDK.");
      }

      const options = {
        key: keyId,
        amount,
        currency,
        name: "Travunited",
        description: `${booking.tourName} - Remaining Balance`,
        order_id: orderId,
        prefill: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
        },
        notes: {
          bookingId: booking.id,
        },
        handler: async (response: any) => {
          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: booking.id,
              }),
            });

            if (verifyResponse.ok) {
              router.push(`/bookings/thank-you?bookingId=${booking.id}`);
            } else {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || "Payment verification failed");
            }
          } catch (error: any) {
            console.error("Payment verification error:", error);
            alert(`Payment verification failed: ${error.message || "Please contact support"}`);
            setPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (response: any) => {
        console.error("Payment failed:", response);
        setPaymentLoading(false);
        const errorMessage = response.error?.description || response.error?.reason || "Payment failed. Please try again.";
        alert(errorMessage);
      });

      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      alert(`Unable to process payment: ${error.message || "Please try again."}`);
      setPaymentLoading(false);
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Booking Not Found</h1>
          <Link href="/dashboard" className="text-primary-600 hover:text-primary-700">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">{booking.tourName}</h1>
              <p className="text-neutral-600 mt-1">
                Booking ID: {booking.id.slice(0, 8)}...
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
              {booking.status}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Details */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Booking Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-neutral-600">Tour</div>
                  <div className="font-medium text-neutral-900">{booking.tourName}</div>
                </div>
                {booking.travelDate && (
                  <div>
                    <div className="text-sm text-neutral-600">Travel Date</div>
                    <div className="font-medium text-neutral-900">
                      {formatDate(booking.travelDate)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-neutral-600">Booked Date</div>
                  <div className="font-medium text-neutral-900">
                    {formatDate(booking.createdAt)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600">Total Amount</div>
                  <div className="font-medium text-neutral-900">
                    ₹{booking.totalAmount.toLocaleString()}
                  </div>
                  {booking.discountAmount && booking.discountAmount > 0 && booking.promoCode && (
                    <div className="text-xs text-green-600 mt-1">
                      Promo code {booking.promoCode.code} applied - Saved ₹{(booking.discountAmount / 100).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Travellers */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Travellers</h2>
              <div className="space-y-2">
                {booking.travellers.map((t, index) => (
                  <div key={index} className="text-neutral-700">
                    {index + 1}. {t.traveller.firstName} {t.traveller.lastName}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Status */}
            {booking.status === "PAYMENT_PENDING" && pendingBalance > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-yellow-900 mb-4 flex items-center space-x-2">
                  <AlertCircle size={24} />
                  <span>Pending Balance</span>
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-700">Amount Paid</span>
                    <span className="font-semibold">
                      ₹{(booking.totalAmount - pendingBalance).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-700">Pending Balance</span>
                    <span className="text-xl font-bold text-yellow-900">
                      ₹{pendingBalance.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={handlePayRemaining}
                    disabled={paymentLoading}
                    className="w-full bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paymentLoading ? "Processing..." : "Pay Remaining Amount"}
                  </button>
                </div>
              </div>
            )}

            {/* Vouchers */}
            {booking.status === "CONFIRMED" && booking.voucherUrl && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-green-900 mb-4 flex items-center space-x-2">
                  <CheckCircle size={24} />
                  <span>Your Tour is Confirmed!</span>
                </h2>
                <p className="text-green-700 mb-4">
                  Your tour booking has been confirmed. Download your vouchers below.
                </p>
                <a
                  href={`/api/files?key=${encodeURIComponent(booking.voucherUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <Download size={20} />
                  <span>Download Vouchers</span>
                </a>
              </div>
            )}

            {/* Payment Pending */}
            {booking.status === "PAYMENT_PENDING" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-yellow-900 mb-4 flex items-center space-x-2">
                  <AlertCircle size={24} />
                  <span>Payment Pending</span>
                </h2>
                <p className="text-yellow-700 mb-4">
                  Your booking is ready but payment is pending. Complete payment to proceed.
                </p>
                <button
                  onClick={async () => {
                    try {
                      setPaymentLoading(true);
                      const response = await fetch("/api/payments/create-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          amount: booking.totalAmount,
                          bookingId: booking.id,
                          paymentType: "full",
                        }),
                      });

                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || "Failed to create payment order");
                      }

                      const { orderId, keyId, amount, currency } = await response.json();
                      const scriptLoaded = await loadRazorpayScript();
                      if (!scriptLoaded || !window.Razorpay) {
                        throw new Error("Failed to load Razorpay SDK.");
                      }

                      const options = {
                        key: keyId,
                        amount,
                        currency,
                        name: "Travunited",
                        description: `${booking.tourName} - Tour Booking`,
                        order_id: orderId,
                        prefill: {
                          name: session?.user?.name || "",
                          email: session?.user?.email || "",
                        },
                        notes: {
                          bookingId: booking.id,
                        },
                        handler: async (response: any) => {
                          try {
                            const verifyResponse = await fetch("/api/payments/verify", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                bookingId: booking.id,
                              }),
                            });

                            if (verifyResponse.ok) {
                              router.push(`/bookings/thank-you?bookingId=${booking.id}`);
                            } else {
                              const errorData = await verifyResponse.json();
                              throw new Error(errorData.error || "Payment verification failed");
                            }
                          } catch (error: any) {
                            console.error("Payment verification error:", error);
                            alert(`Payment verification failed: ${error.message || "Please contact support"}`);
                            setPaymentLoading(false);
                          }
                        },
                        modal: {
                          ondismiss: () => {
                            setPaymentLoading(false);
                          },
                        },
                      };

                      const razorpay = new window.Razorpay(options);

                      razorpay.on("payment.failed", (response: any) => {
                        console.error("Payment failed:", response);
                        setPaymentLoading(false);
                        const errorMessage = response.error?.description || response.error?.reason || "Payment failed. Please try again.";
                        alert(errorMessage);
                      });

                      razorpay.open();
                    } catch (error: any) {
                      console.error("Payment error:", error);
                      alert(`Unable to process payment: ${error.message || "Please try again."}`);
                      setPaymentLoading(false);
                    }
                  }}
                  disabled={paymentLoading}
                  className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentLoading ? "Processing..." : "Pay Now"}
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 sticky top-24">
              <h3 className="font-semibold text-neutral-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {(booking.status === "BOOKED" || booking.status === "CONFIRMED" || booking.status === "COMPLETED") && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/invoices/download/booking/${booking.id}`, {
                          method: "GET",
                          headers: {
                            "Accept": "application/pdf",
                          },
                        });
                        
                        if (!response.ok) {
                          let errorMessage = "Failed to download invoice";
                          try {
                            const errorData = await response.json();
                            errorMessage = errorData.error || errorData.message || errorMessage;
                          } catch {
                            errorMessage = `Server error: ${response.status} ${response.statusText}`;
                          }
                          throw new Error(errorMessage);
                        }
                        
                        const blob = await response.blob();
                        if (!blob || blob.size === 0) {
                          throw new Error("Received empty file");
                        }
                        
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `invoice-booking-${booking.id}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (error) {
                        console.error("Error downloading invoice:", error);
                        const errorMessage = error instanceof Error 
                          ? error.message 
                          : "Network error. Please check your connection and try again.";
                        alert(`Failed to download invoice: ${errorMessage}`);
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <FileText size={16} />
                    <span>Download Invoice</span>
                  </button>
                )}
                <Link
                  href="/help"
                  className="block w-full text-center border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Get Help
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}

