"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare, Calendar, User } from "lucide-react";
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

export default function AdminFormSubmissionDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubmission = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/form-submissions/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubmission(data);
      }
    } catch (error) {
      console.error("Error fetching form submission:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        router.push("/dashboard");
      } else {
        fetchSubmission();
      }
    }
  }, [session, status, router, fetchSubmission]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!submission) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Form Submission Not Found</h1>
          <Link href="/admin/form-submissions" className="text-primary-600 hover:text-primary-700">
            ← Back to Form Submissions
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/form-submissions"
              className="text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Form Submission Details</h1>
              <p className="text-neutral-600 mt-1">Submission ID: {submission.id.slice(0, 8)}...</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Submission Details */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Submission Information</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                    <Mail size={16} />
                    <span>Email</span>
                  </div>
                  <div className="font-medium text-neutral-900">
                    <a href={`mailto:${submission.email}`} className="text-primary-600 hover:text-primary-700">
                      {submission.email}
                    </a>
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                    <MessageSquare size={16} />
                    <span>Subject</span>
                  </div>
                  <div className="font-medium text-neutral-900">{submission.subject}</div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                    <Calendar size={16} />
                    <span>Submitted On</span>
                  </div>
                  <div className="font-medium text-neutral-900">{formatDate(submission.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600 mb-2">Form Type</div>
                  <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">
                    {submission.formType}
                  </span>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Message</h2>
              <div className="prose max-w-none">
                <p className="text-neutral-700 whitespace-pre-wrap">{submission.message}</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <a
                  href={`mailto:${submission.email}?subject=Re: ${submission.subject}`}
                  className="block w-full text-center bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Reply via Email
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(submission.email);
                    alert("Email copied to clipboard");
                  }}
                  className="w-full border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
                >
                  Copy Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

