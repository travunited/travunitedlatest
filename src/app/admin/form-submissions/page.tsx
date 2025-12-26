"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Filter, Search, Download, Mail, Phone, Calendar, MessageSquare, FileText, Clock, TrendingUp } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";
import { motion } from "framer-motion";

interface FormSubmission {
  id: string;
  email: string;
  subject: string;
  message: string;
  formType: string;
  createdAt: string;
}

function AdminFormSubmissionsPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [formTypeFilter, setFormTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (formTypeFilter !== "ALL") params.append("formType", formTypeFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/admin/form-submissions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array and filter out invalid entries
        if (Array.isArray(data)) {
          setSubmissions(data.filter((s) => s && s.id && s.email));
        } else {
          setSubmissions([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch form submissions:", errorData);
        setSubmissions([]);
      }
    } catch (error) {
      console.error("Error fetching form submissions:", error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [formTypeFilter, searchQuery]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        router.push("/dashboard");
      } else {
        fetchSubmissions();
      }
    }
  }, [session, status, router, fetchSubmissions]);

  const getFormTypeColor = (formType: string) => {
    const colors: Record<string, string> = {
      CONTACT: "bg-blue-100 text-blue-700 border-blue-200",
      HELP: "bg-green-100 text-green-700 border-green-200",
      SUPPORT: "bg-purple-100 text-purple-700 border-purple-200",
    };
    return colors[formType] || "bg-neutral-100 text-neutral-700 border-neutral-200";
  };

  const getFormTypeIcon = (formType: string) => {
    switch (formType) {
      case "CONTACT":
        return Mail;
      case "HELP":
        return MessageSquare;
      case "SUPPORT":
        return FileText;
      default:
        return MessageSquare;
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const total = submissions.length;
    const contact = submissions.filter((s) => s.formType === "CONTACT").length;
    const help = submissions.filter((s) => s.formType === "HELP").length;
    const support = submissions.filter((s) => s.formType === "SUPPORT").length;
    const today = submissions.filter((s) => {
      const submissionDate = new Date(s.createdAt);
      const today = new Date();
      return submissionDate.toDateString() === today.toDateString();
    }).length;

    return { total, contact, help, support, today };
  }, [submissions]);

  if (initialLoad) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">User Form Submissions</h1>
            <p className="text-neutral-600 mt-1">Track and manage all contact forms, help requests, and inquiries</p>
          </div>
          <button
            onClick={async () => {
              try {
                const params = new URLSearchParams();
                if (formTypeFilter !== "ALL") params.append("formType", formTypeFilter);
                if (searchQuery) params.append("search", searchQuery);

                const response = await fetch(`/api/admin/form-submissions/export?${params.toString()}`);
                if (response.ok) {
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `form-submissions-${new Date().toISOString().split("T")[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } else {
                  alert("Failed to export submissions");
                }
              } catch (error) {
                alert("An error occurred while exporting");
              }
            }}
            className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-medium"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-medium p-6 border border-neutral-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Total Submissions</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                <FileText className="text-primary-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-medium p-6 border border-neutral-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Today</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.today}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="text-green-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-medium p-6 border border-neutral-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Contact Forms</p>
                <p className="text-2xl font-bold text-blue-600">{stats.contact}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="text-blue-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-medium p-6 border border-neutral-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Help Requests</p>
                <p className="text-2xl font-bold text-green-600">{stats.help}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <MessageSquare className="text-green-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-medium p-6 border border-neutral-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Support</p>
                <p className="text-2xl font-bold text-purple-600">{stats.support}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="text-purple-600" size={24} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-medium p-6 border border-neutral-200">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Form Type</label>
              <select
                value={formTypeFilter}
                onChange={(e) => setFormTypeFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="ALL">All Types</option>
                <option value="CONTACT">Contact Form</option>
                <option value="HELP">Help/Support</option>
                <option value="SUPPORT">Support Request</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email, subject, or message..."
                  className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        {submissions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-medium border border-neutral-200 p-12 text-center">
            <MessageSquare className="mx-auto text-neutral-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">No form submissions found</h3>
            <p className="text-neutral-600">
              {searchQuery || formTypeFilter !== "ALL"
                ? "Try adjusting your filters to see more results."
                : "Form submissions will appear here when users submit contact forms or help requests."}
            </p>
          </div>
        ) : (
          <div className="space-y-4 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-sm rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            )}
            {submissions
              .filter((submission) => submission && submission.email) // Filter out invalid submissions
              .map((submission, index) => {
                const FormIcon = getFormTypeIcon(submission.formType);
                return (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl shadow-medium border border-neutral-200 p-6 hover:shadow-large transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start space-x-4">
                          <div className={`h-12 w-12 rounded-lg ${getFormTypeColor(submission.formType)} flex items-center justify-center flex-shrink-0`}>
                            <FormIcon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-neutral-900 truncate">{submission.subject || "No Subject"}</h3>
                              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getFormTypeColor(submission.formType)} whitespace-nowrap`}>
                                {submission.formType}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-neutral-600 mb-3">
                              {submission.email && (
                                <div className="flex items-center space-x-1.5">
                                  <Mail size={14} />
                                  <a href={`mailto:${submission.email}`} className="hover:text-primary-600 transition-colors">
                                    {submission.email}
                                  </a>
                                </div>
                              )}
                              <div className="flex items-center space-x-1.5">
                                <Clock size={14} />
                                <span>{formatDate(submission.createdAt)}</span>
                              </div>
                            </div>
                            <p className="text-sm text-neutral-700 line-clamp-2 mb-4">
                              {submission.message || ""}
                            </p>
                            <Link
                              href={`/admin/form-submissions/${submission.id}`}
                              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors"
                            >
                              <Eye size={16} />
                              <span>View Full Details</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminFormSubmissionsPage() {
  return <AdminFormSubmissionsPageContent />;
}

