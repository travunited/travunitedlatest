"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Calendar, Clock, CheckCircle, X, AlertCircle, Eye, ArrowRight, BarChart3, FileSearch, Globe, BookOpen } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface DashboardStats {
  visasToday: {
    newSubmitted: number;
    inProcess: number;
    approved: number;
    rejected: number;
  };
  toursToday: {
    newBookings: number;
    confirmed: number;
    completed: number;
  };
  pendingWork: {
    unassignedApplications: number;
    applicationsWithPendingDocs: number;
    applicationsWithRejectedDocs: number;
    unconfirmedBookings: number;
  };
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    visasToday: {
      newSubmitted: 0,
      inProcess: 0,
      approved: 0,
      rejected: 0,
    },
    toursToday: {
      newBookings: 0,
      confirmed: 0,
      completed: 0,
    },
    pendingWork: {
      unassignedApplications: 0,
      applicationsWithPendingDocs: 0,
      applicationsWithRejectedDocs: 0,
      unconfirmedBookings: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        router.push("/dashboard");
      } else {
        fetchStats();
      }
    }
  }, [session, status, router]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
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

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Operations Overview</h1>
          <p className="text-neutral-600 mt-1">
            Welcome back, {session?.user?.name || session?.user?.email}
          </p>
        </div>

        {/* Today&rsquo;s Visas Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Today&rsquo;s Visas Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <FileText size={20} className="text-blue-600" />
                {stats.visasToday.newSubmitted > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold rounded-full px-2 py-1">
                    {stats.visasToday.newSubmitted}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{stats.visasToday.newSubmitted}</div>
              <div className="text-sm text-neutral-600">New Submitted</div>
            </div>
            <div className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <Clock size={20} className="text-primary-600" />
                {stats.visasToday.inProcess > 0 && (
                  <span className="bg-primary-100 text-primary-700 text-xs font-bold rounded-full px-2 py-1">
                    {stats.visasToday.inProcess}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{stats.visasToday.inProcess}</div>
              <div className="text-sm text-neutral-600">In Process</div>
            </div>
            <div className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle size={20} className="text-green-600" />
                {stats.visasToday.approved > 0 && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold rounded-full px-2 py-1">
                    {stats.visasToday.approved}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{stats.visasToday.approved}</div>
              <div className="text-sm text-neutral-600">Approved</div>
            </div>
            <div className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <X size={20} className="text-red-600" />
                {stats.visasToday.rejected > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold rounded-full px-2 py-1">
                    {stats.visasToday.rejected}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{stats.visasToday.rejected}</div>
              <div className="text-sm text-neutral-600">Rejected</div>
            </div>
          </div>
        </div>

        {/* Today&rsquo;s Tours Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Today&rsquo;s Tours Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <Calendar size={20} className="text-blue-600" />
                {stats.toursToday.newBookings > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold rounded-full px-2 py-1">
                    {stats.toursToday.newBookings}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{stats.toursToday.newBookings}</div>
              <div className="text-sm text-neutral-600">New Bookings</div>
            </div>
            <div className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle size={20} className="text-green-600" />
                {stats.toursToday.confirmed > 0 && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold rounded-full px-2 py-1">
                    {stats.toursToday.confirmed}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{stats.toursToday.confirmed}</div>
              <div className="text-sm text-neutral-600">Confirmed</div>
            </div>
            <div className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle size={20} className="text-neutral-600" />
                {stats.toursToday.completed > 0 && (
                  <span className="bg-neutral-100 text-neutral-700 text-xs font-bold rounded-full px-2 py-1">
                    {stats.toursToday.completed}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{stats.toursToday.completed}</div>
              <div className="text-sm text-neutral-600">Completed</div>
            </div>
          </div>
        </div>

        {/* Pending Work */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Pending Work</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/applications?status=SUBMITTED&unassigned=true"
              className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200 hover:shadow-large transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <FileText size={20} className="text-blue-600" />
                {stats.pendingWork.unassignedApplications > 0 && (
                  <AlertCircle size={16} className="text-orange-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{stats.pendingWork.unassignedApplications}</div>
              <div className="text-sm text-neutral-600">Unassigned Applications</div>
              <div className="text-xs text-neutral-500 mt-1">Apps in Submitted state</div>
            </Link>
            <div className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <FileText size={20} className="text-yellow-600" />
                {stats.pendingWork.applicationsWithPendingDocs > 0 && (
                  <AlertCircle size={16} className="text-orange-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{stats.pendingWork.applicationsWithPendingDocs}</div>
              <div className="text-sm text-neutral-600">Documents Pending Review</div>
              <div className="text-xs text-neutral-500 mt-1">Documents awaiting review</div>
            </div>
            <Link
              href="/admin/applications?rejected=true"
              className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200 hover:shadow-large transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <X size={20} className="text-red-600" />
                {stats.pendingWork.applicationsWithRejectedDocs > 0 && (
                  <AlertCircle size={16} className="text-orange-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{stats.pendingWork.applicationsWithRejectedDocs}</div>
              <div className="text-sm text-neutral-600">Rejected Documents</div>
              <div className="text-xs text-neutral-500 mt-1">Need user re-upload</div>
            </Link>
            <Link
              href="/admin/bookings?status=BOOKED&unconfirmed=true"
              className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200 hover:shadow-large transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <Calendar size={20} className="text-orange-600" />
                {stats.pendingWork.unconfirmedBookings > 0 && (
                  <AlertCircle size={16} className="text-orange-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-neutral-900">{stats.pendingWork.unconfirmedBookings}</div>
              <div className="text-sm text-neutral-600">Unconfirmed Bookings</div>
              <div className="text-xs text-neutral-500 mt-1">Booked but not Confirmed</div>
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/applications?status=SUBMITTED&unassigned=true"
              className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200 hover:shadow-large transition-shadow flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <FileText size={20} className="text-primary-600" />
                <span className="font-medium text-neutral-900">View Unassigned Visa Applications</span>
              </div>
              <ArrowRight size={16} className="text-neutral-400 group-hover:text-primary-600 transition-colors" />
            </Link>
            <Link
              href="/admin/bookings?status=BOOKED&unconfirmed=true"
              className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200 hover:shadow-large transition-shadow flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <Calendar size={20} className="text-primary-600" />
                <span className="font-medium text-neutral-900">View Unconfirmed Tour Bookings</span>
              </div>
              <ArrowRight size={16} className="text-neutral-400 group-hover:text-primary-600 transition-colors" />
            </Link>
            <Link
              href="/admin/settings/reports"
              className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200 hover:shadow-large transition-shadow flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <BarChart3 size={20} className="text-primary-600" />
                <span className="font-medium text-neutral-900">Go to Reports</span>
              </div>
              <ArrowRight size={16} className="text-neutral-400 group-hover:text-primary-600 transition-colors" />
            </Link>
            <Link
              href="/admin/settings/audit"
              className="bg-white rounded-lg shadow-medium p-4 border border-neutral-200 hover:shadow-large transition-shadow flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <FileSearch size={20} className="text-primary-600" />
                <span className="font-medium text-neutral-900">View Audit Log</span>
              </div>
              <ArrowRight size={16} className="text-neutral-400 group-hover:text-primary-600 transition-colors" />
            </Link>
          </div>
        </div>

        {/* CMS Hub */}
        {isSuperAdmin && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Super Admin CMS Hub</h2>
            <p className="text-sm text-neutral-500 mb-4">
              Create, publish, and curate Travunited content directly from the dashboard.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
                      <FileText className="text-primary-600" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">Visa CMS</h3>
                      <p className="text-xs text-neutral-500">Manage countries, requirements, FAQs</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Link
                    href="/admin/content/visas"
                    className="inline-flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-primary-200 hover:text-primary-600 transition-colors"
                  >
                    Manage Visas
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/admin/content/visas/new"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
                  >
                    + Create Visa
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                      <Globe className="text-indigo-600" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">Tours CMS</h3>
                      <p className="text-xs text-neutral-500">Itineraries, pricing & media</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Link
                    href="/admin/content/tours"
                    className="inline-flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-primary-200 hover:text-primary-600 transition-colors"
                  >
                    Manage Tours
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/admin/content/tours/new"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
                  >
                    + Create Tour
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                      <BookOpen className="text-amber-600" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">Blog CMS</h3>
                      <p className="text-xs text-neutral-500">Stories, guides & updates</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Link
                    href="/admin/content/blog"
                    className="inline-flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-primary-200 hover:text-primary-600 transition-colors"
                  >
                    Manage Blog
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/admin/content/blog/new"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
                  >
                    + Publish Post
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
