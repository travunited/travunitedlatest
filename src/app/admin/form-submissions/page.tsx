"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Filter, Search, Download, Mail, Phone, Calendar, MessageSquare } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

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
        setSubmissions(data);
      }
    } catch (error) {
      console.error("Error fetching form submissions:", error);
    } finally {
      setLoading(false);
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
      CONTACT: "bg-blue-100 text-blue-700",
      HELP: "bg-green-100 text-green-700",
      SUPPORT: "bg-purple-100 text-purple-700",
    };
    return colors[formType] || "bg-neutral-100 text-neutral-700";
  };

  if (loading) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">User Form Submissions</h1>
            <p className="text-neutral-600 mt-1">All contact forms, help requests, and inquiries from users</p>
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
            className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Form Type</label>
              <select
                value={formTypeFilter}
                onChange={(e) => setFormTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
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
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Form Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Message Preview
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Submitted On
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-neutral-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                      No form submissions found
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Mail size={16} className="text-neutral-400" />
                          <div className="text-sm font-medium text-neutral-900">{submission.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-neutral-900 font-medium">{submission.subject}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFormTypeColor(submission.formType)}`}>
                          {submission.formType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-neutral-600 max-w-md truncate">
                          {submission.message}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {formatDate(submission.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/form-submissions/${submission.id}`}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center space-x-1"
                        >
                          <Eye size={16} />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminFormSubmissionsPage() {
  return <AdminFormSubmissionsPageContent />;
}

