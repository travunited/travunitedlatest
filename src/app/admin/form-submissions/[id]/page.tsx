"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare, Calendar, User, Copy, Send, FileText, Clock } from "lucide-react";
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

export default function AdminFormSubmissionDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const handleCopyEmail = () => {
    if (submission) {
      navigator.clipboard.writeText(submission.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

  const FormIcon = getFormTypeIcon(submission.formType);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/form-submissions"
            className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-neutral-900">Form Submission Details</h1>
            <p className="text-neutral-600 mt-1">Submission ID: {submission.id.slice(0, 8)}...</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Submission Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-medium p-6 border border-neutral-200"
            >
              <div className="flex items-start space-x-4">
                <div className={`h-16 w-16 rounded-xl ${getFormTypeColor(submission.formType)} flex items-center justify-center flex-shrink-0`}>
                  <FormIcon size={28} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-2xl font-bold text-neutral-900">{submission.subject}</h2>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getFormTypeColor(submission.formType)}`}>
                      {submission.formType}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
                    <div className="flex items-center space-x-1.5">
                      <Mail size={16} />
                      <a href={`mailto:${submission.email}`} className="hover:text-primary-600 transition-colors font-medium">
                        {submission.email}
                      </a>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Clock size={16} />
                      <span>{formatDate(submission.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Message Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-medium p-6 border border-neutral-200"
            >
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="text-primary-600" size={20} />
                <h3 className="text-lg font-semibold text-neutral-900">Message</h3>
              </div>
              <div className="prose max-w-none">
                <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                  <p className="text-neutral-700 whitespace-pre-wrap leading-relaxed">{submission.message}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-medium p-6 border border-neutral-200"
            >
              <h3 className="font-semibold text-neutral-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <a
                  href={`mailto:${submission.email}?subject=Re: ${submission.subject}`}
                  className="flex items-center justify-center space-x-2 w-full bg-primary-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-medium"
                >
                  <Send size={18} />
                  <span>Reply via Email</span>
                </a>
                <button
                  onClick={handleCopyEmail}
                  className="flex items-center justify-center space-x-2 w-full border border-neutral-300 text-neutral-700 px-4 py-3 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
                >
                  <Copy size={18} />
                  <span>{copied ? "Copied!" : "Copy Email"}</span>
                </button>
              </div>
            </motion.div>

            {/* Submission Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-medium p-6 border border-neutral-200"
            >
              <h3 className="font-semibold text-neutral-900 mb-4">Submission Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-neutral-600 mb-1">Submission ID</div>
                  <div className="font-mono text-xs text-neutral-900 bg-neutral-50 px-2 py-1 rounded border border-neutral-200">
                    {submission.id}
                  </div>
                </div>
                <div>
                  <div className="text-neutral-600 mb-1">Form Type</div>
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getFormTypeColor(submission.formType)}`}>
                    {submission.formType}
                  </span>
                </div>
                <div>
                  <div className="text-neutral-600 mb-1">Submitted</div>
                  <div className="font-medium text-neutral-900">{formatDate(submission.createdAt)}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

