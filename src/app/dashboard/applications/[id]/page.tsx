"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, FileText, Upload, Download, CheckCircle, X, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/dateFormat";

interface Document {
  id: string;
  documentType: string;
  status: string;
  filePath: string;
  createdAt: string;
}

interface Application {
  id: string;
  country: string;
  visaType: string;
  status: string;
  totalAmount: number;
  visaDocumentUrl: string | null;
  createdAt: string;
  documents: Document[];
  travellers: Array<{
    traveller: {
      firstName: string;
      lastName: string;
    };
  }>;
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchApplication = useCallback(async () => {
    try {
      const response = await fetch(`/api/applications/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setApplication(data);
      }
    } catch (error) {
      console.error("Error fetching application:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (session) {
      fetchApplication();
    }
  }, [session, fetchApplication]);

  const handleDocumentReupload = async (documentId: string, file: File) => {
    setUploading(documentId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentId", documentId);

      const response = await fetch(`/api/applications/${params.id}/documents/reupload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await fetchApplication();
      } else {
        alert("Failed to upload document. Please try again.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setUploading(null);
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
    };
    return colors[status] || "bg-neutral-200 text-neutral-700";
  };

  const getDocumentStatusIcon = (status: string) => {
    if (status === "APPROVED") return CheckCircle;
    if (status === "REJECTED") return X;
    return Clock;
  };

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

  if (!application) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Application Not Found</h1>
          <Link href="/dashboard" className="text-primary-600 hover:text-primary-700">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const rejectedDocuments = application.documents.filter((doc) => doc.status === "REJECTED");
  const canEdit = application.status === "DRAFT" || application.status === "PAYMENT_PENDING";

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">
                {application.country} - {application.visaType}
              </h1>
              <p className="text-neutral-600 mt-1">
                Application ID: {application.id.slice(0, 8)}...
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
              {application.status.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Application Details */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Application Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-neutral-600">Country</div>
                  <div className="font-medium text-neutral-900">{application.country}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600">Visa Type</div>
                  <div className="font-medium text-neutral-900">{application.visaType}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600">Applied Date</div>
                  <div className="font-medium text-neutral-900">
                    {formatDate(application.createdAt)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600">Total Amount</div>
                  <div className="font-medium text-neutral-900">
                    ₹{application.totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Travellers */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Travellers</h2>
              <div className="space-y-2">
                {application.travellers.map((t, index) => (
                  <div key={index} className="text-neutral-700">
                    {index + 1}. {t.traveller.firstName} {t.traveller.lastName}
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Documents</h2>
              {application.documents.length > 0 ? (
                <div className="space-y-4">
                  {application.documents.map((doc) => {
                    const StatusIcon = getDocumentStatusIcon(doc.status);
                    return (
                      <div
                        key={doc.id}
                        className={`border rounded-lg p-4 ${
                          doc.status === "REJECTED"
                            ? "border-red-200 bg-red-50"
                            : doc.status === "APPROVED"
                            ? "border-green-200 bg-green-50"
                            : "border-neutral-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText size={20} className="text-primary-600" />
                            <div>
                              <div className="font-medium text-neutral-900">
                                {doc.documentType}
                              </div>
                              <div className="text-sm text-neutral-600">
                                Uploaded: {formatDate(doc.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span
                              className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                                doc.status === "APPROVED"
                                  ? "bg-green-100 text-green-700"
                                  : doc.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              <StatusIcon size={14} />
                              <span>{doc.status}</span>
                            </span>
                            {doc.status === "REJECTED" && (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleDocumentReupload(doc.id, file);
                                  }}
                                  disabled={uploading === doc.id}
                                />
                                <span className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1">
                                  <Upload size={14} />
                                  <span>{uploading === doc.id ? "Uploading..." : "Re-upload"}</span>
                                </span>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-neutral-600">No documents uploaded yet.</p>
              )}
            </div>

            {/* Approved Visa */}
            {application.status === "APPROVED" && application.visaDocumentUrl && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-green-900 mb-4 flex items-center space-x-2">
                  <CheckCircle size={24} />
                  <span>Your Visa is Approved!</span>
                </h2>
                <p className="text-green-700 mb-4">
                  Your visa has been approved. You can download it from the link below.
                </p>
                <a
                  href={`/api/files?key=${encodeURIComponent(application.visaDocumentUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <Download size={20} />
                  <span>Download Visa</span>
                </a>
              </div>
            )}

            {/* Payment Pending */}
            {application.status === "PAYMENT_PENDING" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-yellow-900 mb-4 flex items-center space-x-2">
                  <AlertCircle size={24} />
                  <span>Payment Pending</span>
                </h2>
                <p className="text-yellow-700 mb-4">
                  Your application is ready but payment is pending. Complete payment to proceed.
                </p>
                <button className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors">
                  Pay Now
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 sticky top-24">
              <h3 className="font-semibold text-neutral-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {canEdit && (
                  <Link
                    href={`/apply/visa/${application.country}/${application.visaType}?edit=${application.id}`}
                    className="block w-full text-center border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    Edit Application
                  </Link>
                )}
                <Link
                  href="/help"
                  className="block w-full text-center border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Get Help
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

