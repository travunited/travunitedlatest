"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, Plane, Clock, CheckCircle, X, AlertCircle, ArrowRight, Settings, Users, CreditCard, Calendar, Download, MessageSquare } from "lucide-react";
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
  updatedAt: string;
  documents?: Array<{ status: string }>;
}

interface Booking {
  id: string;
  tourName: string;
  status: string;
  totalAmount: number;
  travelDate: string | null;
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  link?: string;
}

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextSteps, setNextSteps] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const buildNextSteps = useCallback((apps: Application[], books: Booking[]) => {
    const steps: any[] = [];
    
    // Payment pending applications
    apps.filter(a => a.status === "PAYMENT_PENDING").forEach(app => {
      steps.push({
        type: "payment",
        title: "Payment Pending",
        description: `${app.country} ${app.visaType} - ₹${app.totalAmount.toLocaleString()}`,
        link: `/dashboard/applications/${app.id}`,
        priority: 1,
      });
    });

    // Rejected documents
    apps.forEach(app => {
      const rejectedDocs = app.documents?.filter(d => d.status === "REJECTED");
      if (rejectedDocs && rejectedDocs.length > 0) {
        steps.push({
          type: "document",
          title: "Documents Rejected",
          description: `${app.country} ${app.visaType} - ${rejectedDocs.length} document(s) need re-upload`,
          link: `/dashboard/applications/${app.id}`,
          priority: 2,
        });
      }
    });

    // Upcoming tours
    const upcomingTours = books.filter(b => 
      b.status === "CONFIRMED" && 
      b.travelDate && 
      new Date(b.travelDate) > new Date()
    ).sort((a, b) => 
      new Date(a.travelDate!).getTime() - new Date(b.travelDate!).getTime()
    );
    
    if (upcomingTours.length > 0) {
      const nextTour = upcomingTours[0];
      steps.push({
        type: "tour",
        title: "Upcoming Tour",
        description: `${nextTour.tourName} - ${formatDate(nextTour.travelDate)}`,
        link: `/dashboard/bookings/${nextTour.id}`,
        priority: 3,
      });
    }

    // Payment pending bookings
    books.filter(b => b.status === "PAYMENT_PENDING").forEach(booking => {
      steps.push({
        type: "payment",
        title: "Payment Pending",
        description: `${booking.tourName} - ₹${booking.totalAmount.toLocaleString()}`,
        link: `/dashboard/bookings/${booking.id}`,
        priority: 1,
      });
    });

    setNextSteps(steps.sort((a, b) => a.priority - b.priority).slice(0, 3));
  }, []);

  const buildActivities = useCallback((apps: Application[], books: Booking[]) => {
    const acts: Activity[] = [];
    
    // Recent applications
    apps.slice(0, 5).forEach(app => {
      acts.push({
        id: app.id,
        type: "application",
        title: `${app.country} ${app.visaType}`,
        description: `Status: ${app.status}`,
        date: app.updatedAt,
        link: `/dashboard/applications/${app.id}`,
      });
    });

    // Recent bookings
    books.slice(0, 5).forEach(booking => {
      acts.push({
        id: booking.id,
        type: "booking",
        title: booking.tourName,
        description: `Status: ${booking.status}`,
        date: booking.createdAt,
        link: `/dashboard/bookings/${booking.id}`,
      });
    });

    setActivities(
      acts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
    );
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [appsRes, bookingsRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/bookings"),
      ]);

      const apps = appsRes.ok ? await appsRes.json() : [];
      const books = bookingsRes.ok ? await bookingsRes.json() : [];

      setApplications(apps);
      setBookings(books);
      buildNextSteps(apps, books);
      buildActivities(apps, books);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [buildNextSteps, buildActivities]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchData();
    }
  }, [sessionStatus, fetchData]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-neutral-200 text-neutral-700",
      PAYMENT_PENDING: "bg-yellow-100 text-yellow-700",
      SUBMITTED: "bg-blue-100 text-blue-700",
      IN_PROCESS: "bg-primary-100 text-primary-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
      BOOKED: "bg-green-100 text-green-700",
      CONFIRMED: "bg-green-100 text-green-700",
      COMPLETED: "bg-neutral-100 text-neutral-700",
    };
    return colors[status] || "bg-neutral-200 text-neutral-700";
  };

  const getStatusIcon = (status: string) => {
    if (status === "APPROVED" || status === "CONFIRMED") return CheckCircle;
    if (status === "REJECTED") return X;
    if (status === "PAYMENT_PENDING") return AlertCircle;
    return Clock;
  };

  if (sessionStatus === "loading" || loading) {
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
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Dashboard</h1>
          <p className="text-neutral-600">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}! Here&rsquo;s an overview of your travel applications and bookings.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Next Important Steps */}
        {nextSteps.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-neutral-900 mb-4">Next Important Steps</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {nextSteps.map((step, index) => (
                <Link
                  key={index}
                  href={step.link}
                  className="bg-white rounded-2xl p-6 shadow-medium hover:shadow-large transition-shadow border border-neutral-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    {step.type === "payment" && <CreditCard size={24} className="text-yellow-600" />}
                    {step.type === "document" && <FileText size={24} className="text-red-600" />}
                    {step.type === "tour" && <Calendar size={24} className="text-primary-600" />}
                    <ArrowRight size={20} className="text-neutral-400" />
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-neutral-600">{step.description}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/visas"
            className="bg-white rounded-2xl p-6 shadow-medium hover:shadow-large transition-shadow border border-neutral-200 text-center"
          >
            <Plane size={32} className="text-primary-600 mx-auto mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-1">Apply for New Visa</h3>
            <p className="text-sm text-neutral-600">Start a new visa application</p>
          </Link>
          <Link
            href="/holidays"
            className="bg-white rounded-2xl p-6 shadow-medium hover:shadow-large transition-shadow border border-neutral-200 text-center"
          >
            <Calendar size={32} className="text-primary-600 mx-auto mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-1">Book a Holiday</h3>
            <p className="text-sm text-neutral-600">Explore holiday packages</p>
          </Link>
          <Link
            href="/dashboard/travellers"
            className="bg-white rounded-2xl p-6 shadow-medium hover:shadow-large transition-shadow border border-neutral-200 text-center"
          >
            <Users size={32} className="text-primary-600 mx-auto mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-1">Traveller Profiles</h3>
            <p className="text-sm text-neutral-600">Manage traveller information</p>
          </Link>
          <Link
            href="/help"
            className="bg-white rounded-2xl p-6 shadow-medium hover:shadow-large transition-shadow border border-neutral-200 text-center"
          >
            <AlertCircle size={32} className="text-primary-600 mx-auto mb-3" />
            <h3 className="font-semibold text-neutral-900 mb-1">Help / Support</h3>
            <p className="text-sm text-neutral-600">Get assistance</p>
          </Link>
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-white rounded-2xl shadow-medium p-6 mb-8 border border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">Recent Activity</h2>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 pb-4 border-b border-neutral-100 last:border-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === "application" ? "bg-blue-100" : "bg-green-100"
                  }`}>
                    {activity.type === "application" ? (
                      <FileText size={20} className="text-blue-600" />
                    ) : (
                      <Calendar size={20} className="text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    {activity.link ? (
                      <Link href={activity.link} className="font-medium text-neutral-900 hover:text-primary-600">
                        {activity.title}
                      </Link>
                    ) : (
                      <div className="font-medium text-neutral-900">{activity.title}</div>
                    )}
                    <p className="text-sm text-neutral-600">{activity.description}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {formatDate(activity.date)} at {new Date(activity.date).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-600 text-center py-8">No recent activity</p>
          )}
        </div>

        {/* Visa Applications Section */}
        <div className="bg-white rounded-2xl shadow-medium p-6 mb-8 border border-neutral-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900">Visa Applications</h2>
            <Link href="/dashboard/applications" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
              View All →
            </Link>
          </div>

          {applications.length > 0 ? (
            <div className="space-y-4">
              {applications.slice(0, 5).map((app) => {
                const StatusIcon = getStatusIcon(app.status);
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-neutral-200 rounded-lg p-4 hover:shadow-soft transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-neutral-900 mb-1">
                          {app.country} - {app.visaType}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-neutral-600">
                          <span>Updated: {formatDate(app.updatedAt)}</span>
                          <span>₹{app.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(app.status)}`}>
                          <StatusIcon size={14} />
                          <span>{app.status.replace("_", " ")}</span>
                        </span>
                        <Link
                          href={`/dashboard/applications/${app.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Plane size={48} className="text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-600 mb-4">No visa applications yet</p>
              <Link
                href="/visas"
                className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <span>Apply for a Visa</span>
                <ArrowRight size={20} />
              </Link>
            </div>
          )}
        </div>

        {/* Tour Bookings Section */}
        <div className="bg-white rounded-2xl shadow-medium p-6 mb-8 border border-neutral-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900">Tour Bookings</h2>
            <Link href="/dashboard/bookings" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
              View All →
            </Link>
          </div>

          {bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.slice(0, 5).map((booking) => {
                const StatusIcon = getStatusIcon(booking.status);
                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-neutral-200 rounded-lg p-4 hover:shadow-soft transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-neutral-900 mb-1">{booking.tourName}</h3>
                        <div className="flex items-center space-x-4 text-sm text-neutral-600">
                          {booking.travelDate && (
                            <span>Travel Date: {formatDate(booking.travelDate)}</span>
                          )}
                          <span>₹{booking.totalAmount?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(booking.status)}`}>
                          <StatusIcon size={14} />
                          <span>{booking.status}</span>
                        </span>
                        <Link
                          href={`/dashboard/bookings/${booking.id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar size={48} className="text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-600 mb-4">No tour bookings yet</p>
              <Link
                href="/holidays"
                className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <span>Book a Tour</span>
                <ArrowRight size={20} />
              </Link>
            </div>
          )}
        </div>

        {/* Account Settings Link */}
        <div className="text-center">
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 font-medium"
          >
            <Settings size={20} />
            <span>Account Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
