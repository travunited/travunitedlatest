"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle, FileText, ArrowRight, Download, Printer } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function BookingThankYouContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("bookingId");
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (bookingId) {
      const fetchBooking = async () => {
        try {
          const res = await fetch(`/api/bookings/${bookingId}`);
          if (res.ok) {
            const data = await res.json();
            setBooking(data);
          } else {
            console.error("Failed to fetch booking");
          }
        } catch (error) {
          console.error("Error fetching booking:", error);
        }
      };
      fetchBooking();
      
      // Poll for payment status update (in case webhook is delayed)
      const interval = setInterval(() => {
        fetchBooking();
      }, 3000); // Check every 3 seconds
      
      // Stop polling after 30 seconds
      setTimeout(() => clearInterval(interval), 30000);
      
      return () => clearInterval(interval);
    }
  }, [bookingId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-large p-8"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">
              {booking?.status === "BOOKED" 
                ? "Booking Confirmed!" 
                : booking?.status === "PAYMENT_PENDING"
                ? "Payment Processing..."
                : "Booking Received!"}
            </h1>
            
            <p className="text-lg text-neutral-600">
              {booking?.status === "BOOKED" 
                ? "Thank you for your booking. Your tour has been confirmed and payment received."
                : booking?.status === "PAYMENT_PENDING"
                ? "Your payment is being processed. You'll receive a confirmation email shortly."
                : "Thank you for your booking. We're processing your request."}
            </p>
            
            {booking?.status === "PAYMENT_PENDING" && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  If payment doesn&apos;t complete within a few minutes, please check your dashboard or contact support.
                </p>
              </div>
            )}
          </div>

          {booking && (
            <>
              {/* Invoice */}
              <div className="bg-neutral-50 rounded-lg p-6 mb-8 border border-neutral-200" id="invoice">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900 mb-2">Invoice</h2>
                    <p className="text-sm text-neutral-600">
                      Booking ID: {booking.id.slice(0, 8)}...
                    </p>
                    <p className="text-sm text-neutral-600">
                      Date: {formatDate(booking.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="flex items-center space-x-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    <Printer size={18} />
                    <span>Print</span>
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-sm text-neutral-600">Tour</div>
                    <div className="font-semibold text-neutral-900">{booking.tourName}</div>
                  </div>
                  {booking.travelDate && (
                    <div>
                      <div className="text-sm text-neutral-600">Travel Date</div>
                      <div className="font-semibold text-neutral-900">
                        {formatDate(booking.travelDate)}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-neutral-600">Travellers</div>
                    <div className="font-semibold text-neutral-900">
                      {booking.travellers?.length || 0} traveller(s)
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-300 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-neutral-700">Total Amount</span>
                    <span className="text-2xl font-bold text-primary-600">
                      ₹{booking.totalAmount?.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 text-right">Tax included</p>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-blue-900 mb-3">What&rsquo;s Next?</h3>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li>• You&rsquo;ll receive a confirmation email shortly</li>
                  <li>• Our team will confirm your booking and send vouchers</li>
                  <li>• You can track your booking status in your dashboard</li>
                  <li>• Download vouchers once your booking is confirmed</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/dashboard"
                  className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <FileText size={20} />
                  <span>Go to Dashboard</span>
                </Link>
                <Link
                  href="/holidays"
                  className="flex-1 border border-neutral-300 text-neutral-700 px-6 py-3 rounded-lg font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Browse More Holidays</span>
                  <ArrowRight size={20} />
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function BookingThankYouLoadingState() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-neutral-600">Loading booking confirmation...</p>
      </div>
    </div>
  );
}

export default function BookingThankYouPage() {
  return (
    <Suspense fallback={<BookingThankYouLoadingState />}>
      <BookingThankYouContent />
    </Suspense>
  );
}

