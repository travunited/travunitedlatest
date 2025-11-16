"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, CheckCircle, X, Upload, FileText, User, Mail, Phone, Calendar, Download, CreditCard, Send, Clock, MapPin } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

type DocScope = "PER_TRAVELLER" | "PER_APPLICATION";

interface DocumentRequirementMeta {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  scope: DocScope;
}

interface Document {
  id: string;
  documentType: string;
  status: string;
  filePath: string;
  travellerId: string | null;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  requirement?: DocumentRequirementMeta | null;
}

interface Traveller {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string | null;
  passportNumber: string;
  passportIssueDate: string | null;
  passportExpiry: string | null;
  nationality: string | null;
  currentCity: string | null;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  createdBy: string | null;
  createdAt: string;
}

interface Application {
  id: string;
  country: string;
  visaType: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  visaDocumentUrl: string | null;
  notes: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  travellers: Array<{
    traveller: Traveller;
  }>;
  documents: Document[];
  payments?: Payment[];
  processedBy?: {
    name: string;
    email: string;
  } | null;
}

export default function AdminApplicationDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [documentRejection, setDocumentRejection] = useState<{ docId: string; reason: string } | null>(null);
  const [visaFile, setVisaFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  const fetchApplication = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/applications/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setApplication(data);
        setSelectedStatus(data.status);
        setNotes(data.notes || "");
      }
    } catch (error) {
      console.error("Error fetching application:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/applications/${params.id}/activities`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  }, [params.id]);

  useEffect(() => {
    fetchApplication();
    fetchActivities();
  }, [fetchApplication, fetchActivities]);

  const handleStatusChange = async () => {
    if (!application) return;
    
    setUpdating(true);
    try {
      const body: any = { status: selectedStatus };
      if (selectedStatus === "REJECTED" && rejectionReason) {
        body.rejectionReason = rejectionReason;
      }

      const response = await fetch(`/api/admin/applications/${params.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchApplication();
        await fetchActivities();
        alert("Status updated successfully");
      } else {
        alert("Failed to update status");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleDocumentReview = async (docId: string, status: "APPROVED" | "REJECTED") => {
    if (status === "REJECTED" && !documentRejection?.reason) {
      alert("Please provide a rejection reason");
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/applications/${params.id}/documents/${docId}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          rejectionReason: status === "REJECTED" ? documentRejection?.reason : null,
        }),
      });

      if (response.ok) {
        await fetchApplication();
        await fetchActivities();
        setDocumentRejection(null);
        alert("Document status updated");
      } else {
        alert("Failed to update document status");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleVisaUpload = async () => {
    if (!visaFile || !application) return;

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append("file", visaFile);

      const response = await fetch(`/api/admin/applications/${params.id}/visa`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await fetchApplication();
        await fetchActivities();
        setVisaFile(null);
        alert("Visa uploaded successfully");
      } else {
        alert("Failed to upload visa");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/applications/${params.id}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        await fetchActivities();
        alert("Notes saved");
      }
    } catch (error) {
      alert("Failed to save notes");
    } finally {
      setUpdating(false);
    }
  };

  const handleResendEmail = async (emailType: string) => {
    if (!application) return;

    setResendingEmail(emailType);
    try {
      const response = await fetch(`/api/admin/applications/${params.id}/resend-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailType }),
      });

      if (response.ok) {
        alert("Email sent successfully");
      } else {
        alert("Failed to send email");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setResendingEmail(null);
    }
  };

  const getDocumentUrl = (filePath: string) => {
    const key = encodeURIComponent(filePath);
    return `/api/files?key=${key}`;
  };

  // Group documents by traveller and application
  const groupedDocuments = () => {
    if (!application) return { travellers: [], application: [] };

    const travellerDocs: Record<string, Document[]> = {};
    const applicationDocs: Document[] = [];

    application.documents.forEach((doc) => {
      const traveller = application.travellers.find(t => t.traveller.id === doc.travellerId);
      if (traveller) {
        if (!travellerDocs[doc.travellerId]) {
          travellerDocs[doc.travellerId] = [];
        }
        travellerDocs[doc.travellerId].push(doc);
      } else {
        applicationDocs.push(doc);
      }
    });

    return {
      travellers: Object.entries(travellerDocs).map(([travellerId, docs]) => ({
        traveller: application.travellers.find(t => t.traveller.id === travellerId)?.traveller,
        documents: docs,
      })),
      application: applicationDocs,
    };
  };

  if (loading) {
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

  if (!application) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Application Not Found</h1>
            <Link href="/admin/applications" className="text-primary-600 hover:text-primary-700">
              ← Back to Applications
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const documentsGrouped = groupedDocuments();
  const completedPayment = application.payments?.find(p => p.status === "COMPLETED");

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/admin/applications"
            className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-4 text-sm"
          >
            ← Back to Applications
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
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              application.status === "APPROVED" ? "bg-green-100 text-green-700" :
              application.status === "REJECTED" ? "bg-red-100 text-red-700" :
              application.status === "IN_PROCESS" ? "bg-primary-100 text-primary-700" :
              "bg-blue-100 text-blue-700"
            }`}>
              {application.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Contact Information */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Primary Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <User size={20} className="text-neutral-400" />
                  <div>
                    <div className="text-sm text-neutral-600">Full Name</div>
                    <div className="font-medium">{application.user.name || "N/A"}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail size={20} className="text-neutral-400" />
                  <div>
                    <div className="text-sm text-neutral-600">Email</div>
                    <div className="font-medium">{application.user.email}</div>
                  </div>
                </div>
                {application.user.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone size={20} className="text-neutral-400" />
                    <div>
                      <div className="text-sm text-neutral-600">Phone</div>
                      <div className="font-medium">{application.user.phone}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Travellers List */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Travellers</h2>
              <div className="space-y-4">
                {application.travellers.map((t, index) => (
                  <div key={t.traveller.id} className="border border-neutral-200 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Traveller {index + 1}</h3>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-neutral-600">Name:</span>{" "}
                        <span className="font-medium">{t.traveller.firstName} {t.traveller.lastName}</span>
                      </div>
                      <div>
                        <span className="text-neutral-600">Date of Birth:</span>{" "}
                        <span className="font-medium">{formatDate(t.traveller.dateOfBirth)}</span>
                      </div>
                      <div>
                        <span className="text-neutral-600">Gender:</span>{" "}
                        <span className="font-medium">{t.traveller.gender || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-neutral-600">Nationality:</span>{" "}
                        <span className="font-medium">{t.traveller.nationality || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-neutral-600">Passport Number:</span>{" "}
                        <span className="font-medium">{t.traveller.passportNumber}</span>
                      </div>
                      {t.traveller.passportExpiry && (
                        <div>
                          <span className="text-neutral-600">Passport Expiry:</span>{" "}
                          <span className="font-medium">{formatDate(t.traveller.passportExpiry)}</span>
                        </div>
                      )}
                      {t.traveller.currentCity && (
                        <div>
                          <span className="text-neutral-600">Current City:</span>{" "}
                          <span className="font-medium">{t.traveller.currentCity}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents - Grouped by Traveller and Application */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Documents</h2>

              {/* Per-Traveller Documents */}
              {documentsGrouped.travellers.map((group) => (
                <div key={group.traveller?.id} className="mb-6 last:mb-0">
                  <h3 className="font-semibold text-neutral-900 mb-3">
                    Documents for {group.traveller?.firstName} {group.traveller?.lastName}
                  </h3>
                  <div className="space-y-3">
                    {group.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={`border rounded-lg p-4 ${
                          doc.status === "REJECTED" ? "border-red-200 bg-red-50" :
                          doc.status === "APPROVED" ? "border-green-200 bg-green-50" :
                          "border-neutral-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium">
                              {doc.requirement?.name || doc.documentType}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {doc.requirement?.category || "Supporting document"}
                              {doc.requirement
                                ? doc.requirement.scope === "PER_TRAVELLER"
                                  ? " • Per traveller"
                                  : " • Application"
                                : ""}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            doc.status === "APPROVED" ? "bg-green-100 text-green-700" :
                            doc.status === "REJECTED" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                        {doc.requirement?.description && (
                          <div className="text-xs text-neutral-500 mb-2">
                            {doc.requirement.description}
                          </div>
                        )}
                        {doc.rejectionReason && (
                          <div className="text-sm text-red-700 mb-2">
                            <strong>Rejection Reason:</strong> {doc.rejectionReason}
                          </div>
                        )}
                        <div className="flex items-center space-x-3">
                          <a
                            href={getDocumentUrl(doc.filePath)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm"
                          >
                            <Eye size={16} />
                            <span>Preview</span>
                          </a>
                          {doc.status !== "APPROVED" && (
                            <>
                              <button
                                onClick={() => handleDocumentReview(doc.id, "APPROVED")}
                                disabled={updating}
                                className="inline-flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm disabled:opacity-50"
                              >
                                <CheckCircle size={16} />
                                <span>Verify</span>
                              </button>
                              <button
                                onClick={() => setDocumentRejection({ docId: doc.id, reason: "" })}
                                className="inline-flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm"
                              >
                                <X size={16} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                        {documentRejection?.docId === doc.id && (
                          <div className="mt-3 pt-3 border-t border-neutral-200">
                            <textarea
                              value={documentRejection.reason}
                              onChange={(e) => setDocumentRejection({ ...documentRejection, reason: e.target.value })}
                              placeholder="Enter rejection reason (will be shown to user)..."
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm mb-2"
                              rows={2}
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleDocumentReview(doc.id, "REJECTED")}
                                disabled={updating || !documentRejection.reason}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                              >
                                Confirm Reject
                              </button>
                              <button
                                onClick={() => setDocumentRejection(null)}
                                className="px-3 py-1 border border-neutral-300 rounded text-sm hover:bg-neutral-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Per-Application Documents */}
              {documentsGrouped.application.length > 0 && (
                <div className="mt-6 pt-6 border-t border-neutral-200">
                  <h3 className="font-semibold text-neutral-900 mb-3">Application-Level Documents</h3>
                  <div className="space-y-3">
                    {documentsGrouped.application.map((doc) => (
                      <div
                        key={doc.id}
                        className={`border rounded-lg p-4 ${
                          doc.status === "REJECTED" ? "border-red-200 bg-red-50" :
                          doc.status === "APPROVED" ? "border-green-200 bg-green-50" :
                          "border-neutral-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium">
                              {doc.requirement?.name || doc.documentType}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {doc.requirement?.category || "Supporting document"}
                              {doc.requirement
                                ? doc.requirement.scope === "PER_TRAVELLER"
                                  ? " • Per traveller"
                                  : " • Application"
                                : ""}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            doc.status === "APPROVED" ? "bg-green-100 text-green-700" :
                            doc.status === "REJECTED" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                        {doc.requirement?.description && (
                          <div className="text-xs text-neutral-500 mb-2">
                            {doc.requirement.description}
                          </div>
                        )}
                        {doc.rejectionReason && (
                          <div className="text-sm text-red-700 mb-2">
                            <strong>Rejection Reason:</strong> {doc.rejectionReason}
                          </div>
                        )}
                        <div className="flex items-center space-x-3">
                          <a
                            href={getDocumentUrl(doc.filePath)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm"
                          >
                            <Eye size={16} />
                            <span>Preview</span>
                          </a>
                          {doc.status !== "APPROVED" && (
                            <>
                              <button
                                onClick={() => handleDocumentReview(doc.id, "APPROVED")}
                                disabled={updating}
                                className="inline-flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm disabled:opacity-50"
                              >
                                <CheckCircle size={16} />
                                <span>Verify</span>
                              </button>
                              <button
                                onClick={() => setDocumentRejection({ docId: doc.id, reason: "" })}
                                className="inline-flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm"
                              >
                                <X size={16} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                        {documentRejection?.docId === doc.id && (
                          <div className="mt-3 pt-3 border-t border-neutral-200">
                            <textarea
                              value={documentRejection.reason}
                              onChange={(e) => setDocumentRejection({ ...documentRejection, reason: e.target.value })}
                              placeholder="Enter rejection reason (will be shown to user)..."
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm mb-2"
                              rows={2}
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleDocumentReview(doc.id, "REJECTED")}
                                disabled={updating || !documentRejection.reason}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                              >
                                Confirm Reject
                              </button>
                              <button
                                onClick={() => setDocumentRejection(null)}
                                className="px-3 py-1 border border-neutral-300 rounded text-sm hover:bg-neutral-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Visa Upload (when In Process) */}
            {(application.status === "IN_PROCESS" || application.status === "APPROVED") && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Final Visa Upload</h2>
                {application.visaDocumentUrl ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-900">Visa Document Uploaded</span>
                      <a
                        href={`/api/files?key=${encodeURIComponent(application.visaDocumentUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-green-700 hover:text-green-800 text-sm"
                      >
                        <Download size={16} />
                        <span>Download</span>
                      </a>
                    </div>
                    <p className="text-xs text-green-700">Uploaded on {formatDate(application.updatedAt)}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-neutral-600">
                      Upload the final approved visa document. This will be sent to the customer via email and made available in their dashboard.
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setVisaFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                    />
                    {visaFile && (
                      <button
                        onClick={handleVisaUpload}
                        disabled={updating}
                        className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
                      >
                        {updating ? "Uploading..." : "Upload Visa Document"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Activity Log */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Activity Log</h2>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div key={activity.id || index} className="flex items-start space-x-3 pb-4 border-b border-neutral-200 last:border-b-0 last:pb-0">
                      <div className="flex-shrink-0 mt-1">
                        <Clock size={16} className="text-neutral-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-neutral-900">{activity.description}</div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {new Date(activity.createdAt).toLocaleString()}
                          {activity.createdBy && ` • by ${activity.createdBy}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">No activity logged yet</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Application Status Control */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Application Status</h3>
              <div className="space-y-4">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
                >
                  <option value="SUBMITTED">Submitted</option>
                  <option value="IN_PROCESS">In Process</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                {selectedStatus === "REJECTED" && (
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter rejection reason (shown to user)..."
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
                    rows={3}
                  />
                )}
                <button
                  onClick={handleStatusChange}
                  disabled={updating || selectedStatus === application.status}
                  className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Status
                </button>
              </div>
            </div>

            {/* Payment Info */}
            {completedPayment && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h3 className="font-semibold text-neutral-900 mb-4">Payment Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Amount Paid:</span>
                    <span className="font-medium text-neutral-900">₹{completedPayment.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Payment Date:</span>
                    <span className="font-medium text-neutral-900">{formatDate(completedPayment.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Payment Mode:</span>
                    <span className="font-medium text-neutral-900">Razorpay</span>
                  </div>
                  {completedPayment.razorpayPaymentId && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Transaction ID:</span>
                      <span className="font-medium text-neutral-900 text-xs">{completedPayment.razorpayPaymentId.slice(0, 20)}...</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-neutral-200">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Payment Type:</span>
                      <span className="font-medium text-green-600">Full Payment</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email Actions */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Email Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleResendEmail("application_submitted")}
                  disabled={resendingEmail === "application_submitted" || updating}
                  className="w-full text-left px-4 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                >
                  <Send size={16} />
                  <span>Re-send &ldquo;Application Submitted&rdquo;</span>
                </button>
                {application.documents.some(doc => doc.status === "REJECTED") && (
                  <button
                    onClick={() => handleResendEmail("docs_rejected")}
                    disabled={resendingEmail === "docs_rejected" || updating}
                    className="w-full text-left px-4 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                  >
                    <Send size={16} />
                    <span>Re-send &ldquo;Docs Rejected&rdquo;</span>
                  </button>
                )}
                {application.status === "APPROVED" && (
                  <button
                    onClick={() => handleResendEmail("visa_approved")}
                    disabled={resendingEmail === "visa_approved" || updating}
                    className="w-full text-left px-4 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                  >
                    <Send size={16} />
                    <span>Re-send &ldquo;Visa Approved&rdquo;</span>
                  </button>
                )}
                <button
                  onClick={() => handleResendEmail("status_update")}
                  disabled={resendingEmail === "status_update" || updating}
                  className="w-full text-left px-4 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 text-sm flex items-center space-x-2"
                >
                  <Send size={16} />
                  <span>Re-send Status Update</span>
                </button>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Internal Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private notes visible only to admins..."
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm mb-3"
                rows={6}
              />
              <button
                onClick={handleSaveNotes}
                disabled={updating}
                className="w-full bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg font-medium hover:bg-neutral-200 disabled:opacity-50 text-sm"
              >
                Save Notes
              </button>
            </div>

            {/* Application Info */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Application Info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-600">Country:</span>
                  <div className="font-medium">{application.country || "N/A"}</div>
                </div>
                <div>
                  <span className="text-neutral-600">Visa Type:</span>
                  <div className="font-medium">{application.visaType || "N/A"}</div>
                </div>
                <div>
                  <span className="text-neutral-600">Total Amount:</span>
                  <div className="font-medium">₹{application.totalAmount.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-neutral-600">Applied Date:</span>
                  <div className="font-medium">{formatDate(application.createdAt)}</div>
                </div>
                {application.processedBy && (
                  <div>
                    <span className="text-neutral-600">Assigned to:</span>
                    <div className="font-medium">{application.processedBy.name || application.processedBy.email}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
