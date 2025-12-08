"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, DollarSign, FileText, Calendar, Users, Shield, FileSearch, TrendingUp, Globe, ArrowRight } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

const REPORT_CATEGORIES = [
  {
    title: "Finance",
    icon: DollarSign,
    reports: [
      { name: "Revenue Summary", href: "/admin/reports/finance/revenue", description: "High-level revenue overview for accounting" },
      { name: "Payments & Refunds", href: "/admin/reports/finance/payments", description: "Detailed transaction-level report" },
    ],
  },
  {
    title: "Visas",
    icon: FileText,
    reports: [
      { name: "Visa Applications Summary", href: "/admin/reports/visas/summary", description: "Ops+management overview" },
      { name: "Country-wise Visa Report", href: "/admin/reports/visas/by-country", description: "See which countries are performing best" },
      { name: "Visa Type Performance", href: "/admin/reports/visas/performance", description: "Know which visa packages work" },
    ],
  },
  {
    title: "Tours",
    icon: Calendar,
    reports: [
      { name: "Tour Bookings Summary", href: "/admin/reports/tours/summary", description: "Overview of tour bookings and revenue" },
      { name: "Tour Performance", href: "/admin/reports/tours/performance", description: "Per tour package performance metrics" },
    ],
  },
  {
    title: "Customers & Corporate",
    icon: Users,
    reports: [
      { name: "Customer Report", href: "/admin/reports/customers", description: "Per customer lifetime value and activity" },
      { name: "Corporate Leads", href: "/admin/reports/corporate", description: "Corporate leads and clients tracking" },
    ],
  },
  {
    title: "Admin & Ops",
    icon: Shield,
    reports: [
      { name: "Admin Performance", href: "/admin/reports/admin/performance", description: "Per admin workload and KPIs" },
      { name: "SLA & Turnaround Time", href: "/admin/reports/admin/sla", description: "Service quality and SLA compliance" },
    ],
  },
  {
    title: "System & Audit",
    icon: FileSearch,
    reports: [
      { name: "Audit Log Export", href: "/admin/reports/system/audit", description: "All important actions for legal/compliance" },
    ],
  },
];

export default function ReportsOverviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated") {
      const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
      if (!isSuperAdmin) {
        router.replace("/admin");
      }
    }
  }, [session, status, router]);

  if (status === "loading") {
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

  // Prevent flicker: if not authenticated or not super-admin, bail after redirect
  if (status !== "authenticated" || session?.user?.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Reports & Analytics</h1>
          <p className="text-neutral-600 mt-1">
            Comprehensive business insights and analytics for finance, operations, and performance tracking
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REPORT_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.title} className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-primary-50 rounded-lg">
                    <Icon size={24} className="text-primary-600" />
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900">{category.title}</h2>
                </div>
                <div className="space-y-3">
                  {category.reports.map((report) => (
                    <Link
                      key={report.href}
                      href={report.href}
                      className="block p-4 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-neutral-900 group-hover:text-primary-700 mb-1">
                            {report.name}
                          </h3>
                          <p className="text-sm text-neutral-600">{report.description}</p>
                        </div>
                        <ArrowRight size={20} className="text-neutral-400 group-hover:text-primary-600 mt-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}








