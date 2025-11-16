"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Clock, CheckCircle, X, AlertCircle, Download, CreditCard, Eye } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";

interface Application {
  id: string;
  country: string;
  visaType: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  visaDocumentUrl: string | null;
  documents?: Array<{ status: string }>;
}

const statusGroups = {
  "Action Required": ["DRAFT", "PAYMENT_PENDING"],
  "In Progress": ["SUBMITTED", "IN_PROCESS"],
  "Completed": ["APPROVED", "REJECTED"],
  "Expired": ["EXPIRED"],
};

export default function ApplicationsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchApplications();
    }
  }, [sessionStatus]);

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/applications");
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
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
      EXPIRED: "bg-neutral-100 text-neutral-500",
    };
    return colors[status] || "bg-neutral-200 text-neutral-700";
  };

  const getStatusIcon = (status: string) => {
    if (status === "APPROVED") return CheckCircle;
    if (status === "REJECTED") return X;
    if (status === "PAYMENT_PENDING") return AlertCircle;
    return Clock;
  };

  const getActions = (app: Application) => {
    const actions: Array<{ label: string; href: string; icon: any; variant?: string }> = [];

    if (app.status === "DRAFT") {
      actions.push({
        label: "Continue Application",
        href: `/apply/visa/${app.country}/${app.visaType}?edit=${app.id}`,
        icon: ArrowLeft,
      });
    }

    if (app.status === "PAYMENT_PENDING") {
      actions.push({
        label: "Pay Now",
        href: `/dashboard/applications/${app.id}`,
        icon: CreditCard,
        variant: "primary",
      });
    }

    if (app.status === "SUBMITTED" || app.status === "IN_PROCESS") {
      actions.push({
        label: "View Details",
        href: `/dashboard/applications/${app.id}`,
        icon: Eye,
      });
      
      const rejectedDocs = app.documents?.filter(d => d.status === "REJECTED");
      if (rejectedDocs && rejectedDocs.length > 0) {
        actions.push({
          label: `Re-upload ${rejectedDocs.length} Document(s)`,
          href: `/dashboard/applications/${app.id}`,
          icon: FileText,
          variant: "warning",
        });
      }
    }

    if (app.status === "APPROVED") {
      if (app.visaDocumentUrl) {
        actions.push({
          label: "Download Visa",
          href: `/api/files?key=${encodeURIComponent(app.visaDocumentUrl)}`,
          icon: Download,
          variant: "primary",
        });
      }
      actions.push({
        label: "Leave Review",
        href: `/dashboard/reviews/new?type=visa&id=${app.id}`,
        icon: FileText,
      });
    }

    if (app.status === "REJECTED") {
      actions.push({
        label: "View Details",
        href: `/dashboard/applications/${app.id}`,
        icon: Eye,
      });
      actions.push({
        label: "Contact Support",
        href: "/help",
        icon: AlertCircle,
      });
    }

    return actions;
  };

  const filteredApplications = selectedStatus
    ? applications.filter(app => {
        const group = Object.entries(statusGroups).find(([_, statuses]) =>
          statuses.includes(app.status)
        );
        return group?.[0] === selectedStatus;
      })
    : applications;

  const groupedApplications = Object.keys(statusGroups).reduce((acc, group) => {
    const groupApps = filteredApplications.filter(app => {
      const statuses = statusGroups[group as keyof typeof statusGroups];
      return statuses.includes(app.status);
    });
    if (groupApps.length > 0) {
      acc[group] = groupApps;
    }
    return acc;
  }, {} as Record<string, Application[]>);

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
          <h1 className="text-3xl font-bold text-neutral-900">Visa Applications</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStatus(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === null
                ? "bg-primary-600 text-white"
                : "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            All
          </button>
          {Object.keys(statusGroups).map((group) => {
            const count = applications.filter(app => {
              const statuses = statusGroups[group as keyof typeof statusGroups];
              return statuses.includes(app.status);
            }).length;
            return (
              <button
                key={group}
                onClick={() => setSelectedStatus(group)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStatus === group
                    ? "bg-primary-600 text-white"
                    : "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {group} ({count})
              </button>
            );
          })}
        </div>

        {/* Applications List */}
        {Object.keys(groupedApplications).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedApplications).map(([group, apps]) => (
              <div key={group}>
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">{group}</h2>
                <div className="space-y-4">
                  {apps.map((app) => {
                    const StatusIcon = getStatusIcon(app.status);
                    const actions = getActions(app);
                    return (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-medium transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                              {app.country} - {app.visaType}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-neutral-600">
                              <span>Applied: {formatDate(app.createdAt)}</span>
                              <span>Updated: {formatDate(app.updatedAt)}</span>
                              <span>₹{app.totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(app.status)}`}>
                            <StatusIcon size={14} />
                            <span>{app.status.replace("_", " ")}</span>
                          </span>
                        </div>
                        {actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-200">
                            {actions.map((action, index) => {
                              const Icon = action.icon;
                              const isExternal = action.href.startsWith("http");
                              const Component = isExternal ? "a" : Link;
                              const props = isExternal
                                ? { href: action.href, target: "_blank", rel: "noopener noreferrer" }
                                : { href: action.href };
                              
                              return (
                                <Component
                                  key={index}
                                  {...props}
                                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                                    action.variant === "primary"
                                      ? "bg-primary-600 text-white hover:bg-primary-700"
                                      : action.variant === "warning"
                                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
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
            <FileText size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 mb-4">No applications found</p>
            <Link
              href="/visas"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <span>Apply for a Visa</span>
              <ArrowLeft size={20} className="rotate-180" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

