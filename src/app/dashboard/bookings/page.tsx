"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, CheckCircle, Download, CreditCard, Eye, MessageSquare, FileText } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface Booking {
  id: string;
  tourName: string;
  status: string;
  totalAmount: number;
  travelDate: string | null;
  createdAt: string;
  voucherUrl: string | null;
  invoiceUrl: string | null;
}

const statusGroups = {
  "Action Required": ["DRAFT", "PAYMENT_PENDING"],
  "Confirmed": ["BOOKED", "CONFIRMED"],
  "Completed": ["COMPLETED"],
  "Expired": ["EXPIRED"],
};

export default function BookingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchBookings();
    }
  }, [sessionStatus]);

  const fetchBookings = async () => {
    try {
      const response = await fetch("/api/bookings");
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-neutral-200 text-neutral-700",
      PAYMENT_PENDING: "bg-yellow-100 text-yellow-700",
      BOOKED: "bg-blue-100 text-blue-700",
      CONFIRMED: "bg-green-100 text-green-700",
      COMPLETED: "bg-neutral-100 text-neutral-700",
      EXPIRED: "bg-neutral-100 text-neutral-500",
    };
    return colors[status] || "bg-neutral-200 text-neutral-700";
  };

  const getActions = (booking: Booking) => {
    const actions: Array<{ label: string; href: string; icon: any; variant?: string; download?: boolean }> = [];

    if (booking.status === "PAYMENT_PENDING") {
      actions.push({
        label: "Pay Now",
        href: `/dashboard/bookings/${booking.id}`,
        icon: CreditCard,
        variant: "primary",
      });
    }

    if (booking.status === "BOOKED") {
      // Check if there's pending balance (would need to fetch payment details)
      actions.push({
        label: "Pay Remaining Amount",
        href: `/dashboard/bookings/${booking.id}`,
        icon: CreditCard,
        variant: "primary",
      });
    }

    if (booking.status === "CONFIRMED" || booking.status === "BOOKED" || booking.status === "COMPLETED") {
      actions.push({
        label: "Download Invoice",
        href: `/api/invoices/download/booking/${booking.id}`,
        icon: FileText,
        download: true,
      });

      if (booking.voucherUrl && booking.status !== "COMPLETED") {
        actions.push({
          label: "Download Vouchers",
          href: `/api/files?key=${encodeURIComponent(booking.voucherUrl)}`,
          icon: Download,
          variant: "primary",
        });
      }
      actions.push({
        label: "View Details",
        href: `/dashboard/bookings/${booking.id}`,
        icon: Eye,
      });
    }

    if (booking.status === "COMPLETED") {
      actions.push({
        label: "Leave Review",
        href: `/dashboard/reviews/new?type=tour&id=${booking.id}`,
        icon: MessageSquare,
      });
    }

    return actions;
  };

  const filteredBookings = selectedStatus
    ? bookings.filter(booking => {
      const group = Object.entries(statusGroups).find(([_, statuses]) =>
        statuses.includes(booking.status)
      );
      return group?.[0] === selectedStatus;
    })
    : bookings;

  const groupedBookings = Object.keys(statusGroups).reduce((acc, group) => {
    const groupBookings = filteredBookings.filter(booking => {
      const statuses = statusGroups[group as keyof typeof statusGroups];
      return statuses.includes(booking.status);
    });
    if (groupBookings.length > 0) {
      acc[group] = groupBookings;
    }
    return acc;
  }, {} as Record<string, Booking[]>);

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
          <h1 className="text-3xl font-bold text-neutral-900">Tour Bookings</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStatus(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedStatus === null
              ? "bg-primary-600 text-white"
              : "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
              }`}
          >
            All
          </button>
          {Object.keys(statusGroups).map((group) => {
            const count = bookings.filter(booking => {
              const statuses = statusGroups[group as keyof typeof statusGroups];
              return statuses.includes(booking.status);
            }).length;
            return (
              <button
                key={group}
                onClick={() => setSelectedStatus(group)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedStatus === group
                  ? "bg-primary-600 text-white"
                  : "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
                  }`}
              >
                {group} ({count})
              </button>
            );
          })}
        </div>

        {/* Bookings List */}
        {Object.keys(groupedBookings).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedBookings).map(([group, groupBookings]) => (
              <div key={group}>
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">{group}</h2>
                <div className="space-y-4">
                  {groupBookings.map((booking) => {
                    const actions = getActions(booking);
                    return (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-medium transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                              {booking.tourName}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-neutral-600">
                              {booking.travelDate && (
                                <span>Travel Date: {formatDate(booking.travelDate)}</span>
                              )}
                              <span>Booked: {formatDate(booking.createdAt)}</span>
                              <span>₹{booking.totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                        {actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-200">
                            {actions.map((action, index) => {
                              const Icon = action.icon;
                              const isExternal = action.href.startsWith("http");
                              const isInvoice = (action as any).download;

                              if (isInvoice) {
                                return (
                                  <button
                                    key={index}
                                    onClick={async () => {
                                      try {
                                        console.log("Attempting to download invoice from:", action.href);
                                        if (action.href.includes("undefined")) {
                                          throw new Error("Invalid invoice URL (missing ID)");
                                        }

                                        const response = await fetch(action.href, {
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
                                    className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${action.variant === "primary"
                                      ? "bg-primary-600 text-white hover:bg-primary-700"
                                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                      }`}
                                  >
                                    <Icon size={16} />
                                    <span>{action.label}</span>
                                  </button>
                                );
                              }

                              const Component = isExternal ? "a" : Link;
                              const props = isExternal
                                ? { href: action.href, target: "_blank", rel: "noopener noreferrer" }
                                : { href: action.href };

                              return (
                                <Component
                                  key={index}
                                  {...props}
                                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${action.variant === "primary"
                                    ? "bg-primary-600 text-white hover:bg-primary-700"
                                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                    }`}
                                >
                                  <Icon size={16} />
                                  <span>{action.label}</span>
                                </Component>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <Calendar size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 mb-4">No bookings found</p>
            <Link
              href="/holidays"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <span>Book a Tour</span>
              <ArrowLeft size={20} className="rotate-180" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

