"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, CheckCircle, X, Upload, FileText, User, Mail, Phone, Calendar, Download, CreditCard, Send, Clock, MapPin, ArrowLeft, Globe, ChevronDown, ChevronRight, UserPlus, FileDown, MessageSquare, CheckCircle2, XCircle, AlertCircle, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";
import { getCountryFlagUrl } from "@/lib/flags";

const getVisaEntryDisplay = (visa?: {
  visaSubTypeLabel?: string | null;
  entryType?: string | null;
  entryTypeLegacy?: string | null;
}) => {
  if (!visa) return null;
  if (visa.visaSubTypeLabel) return visa.visaSubTypeLabel;
  if (visa.entryTypeLegacy) return visa.entryTypeLegacy;
  return visa.entryType || null;
};

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
  fileSize?: number | null;
  traveller?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
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
  email?: string | null;
  phone?: string | null;
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

interface TimelineEvent {
  id: string;
  time: string;
  event: string;
  adminName: string;
}

interface Application {
  id: string;
  referenceNumber?: string;
  country: string;
  visaType: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  visaDocumentUrl: string | null;
  invoiceUrl: string | null;
  invoiceUploadedAt: string | null;
  invoiceUploadedByAdminId: string | null;
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
    id?: string;
    name: string;
    email: string;
  } | null;
  visa?: {
    id: string;
    name: string;
    processingTime?: string;
    entryType?: string;
    country: {
      id: string;
      name: string;
      code: string;
      flagUrl: string | null;
    };
  } | null;
  timeline?: TimelineEvent[];
  visaSubType?: {
    id: string;
    label: string;
    code: string | null;
  } | null;
}

export default function AdminApplicationDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  // Validate and extract application ID
  const applicationId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [documentStatusUpdates, setDocumentStatusUpdates] = useState<Record<string, { status: string; comment: string }>>({});
  const [notes, setNotes] = useState("");
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [admins, setAdmins] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>("");
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [activeTravellerTab, setActiveTravellerTab] = useState<string | null>(null);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [uploadingVisa, setUploadingVisa] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [removingInvoice, setRemovingInvoice] = useState(false);
  const [deletingApplication, setDeletingApplication] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handle authentication and authorization
  useEffect(() => {
    if (status === "unauthenticated") {
      try {
        router.push("/login");
      } catch (error) {
        console.error("Router push failed, using window.location:", error);
        window.location.href = "/login";
      }
      return;
    }
    if (status === "authenticated") {
      const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        try {
          router.push("/dashboard");
        } catch (error) {
          console.error("Router push failed, using window.location:", error);
          window.location.href = "/dashboard";
        }
        return;
      }
    }
  }, [session, status, router]);

  // Validate application ID
  useEffect(() => {
    if (!applicationId || typeof applicationId !== "string") {
      console.error("Invalid application ID:", applicationId);
      try {
        router.push("/admin/applications");
      } catch (error) {
        console.error("Router push failed, using window.location:", error);
        window.location.href = "/admin/applications";
      }
      return;
    }
  }, [applicationId, router]);

  const fetchApplication = useCallback(async () => {
    if (!applicationId || typeof applicationId !== "string") {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}`);
      if (response.ok) {
        const data = await response.json();
        setApplication(data);
        setSelectedStatus(data.status);
        setNotes(data.notes || "");
        if (data.processedBy?.id) {
          setSelectedAdminId(data.processedBy.id);
        }
        // Set first traveller as active tab by default
        // Set default tab: first traveller if available, otherwise application docs
        if (data.travellers && data.travellers.length > 0 && data.travellers[0]?.traveller?.id) {
          setActiveTravellerTab(data.travellers[0].traveller.id);
        } else if (data.documents?.some((doc: Document) => !doc.travellerId)) {
          setActiveTravellerTab("application");
        }
      } else if (response.status === 404) {
        // Application not found, redirect to list
        console.error("Application not found:", applicationId);
        try {
          router.push("/admin/applications");
        } catch (error) {
          window.location.href = "/admin/applications";
        }
      } else if (response.status === 401 || response.status === 403) {
        // Unauthorized or forbidden, redirect to login
        console.error("Unauthorized access to application");
        try {
          router.push("/login");
        } catch (error) {
          window.location.href = "/login";
        }
      }
    } catch (error) {
      console.error("Error fetching application:", error);
    } finally {
      setLoading(false);
    }
  }, [applicationId, router]);

  const fetchAdmins = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/settings/admins");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setAdmins(data
            .filter((admin: any) => admin && admin.id && admin.email)
            .map((admin: any) => ({
              id: admin.id,
              name: admin.name || admin.email || "Unknown",
              email: admin.email,
            })));
        } else {
          setAdmins([]);
        }
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
      setAdmins([]);
    }
  }, []);

  useEffect(() => {
    fetchApplication();
    fetchAdmins();
  }, [fetchApplication, fetchAdmins]);

  const handleStatusChange = async () => {
    if (!application) return;

    if (selectedStatus === "APPROVED" || selectedStatus === "REJECTED") {
      if (!confirm(`Are you sure you want to change the status to ${selectedStatus}?`)) {
        return;
      }
    }

    setUpdating(true);
    try {
      const body: { status: string; rejectionReason?: string } = { status: selectedStatus };
      if (selectedStatus === "REJECTED" && rejectionReason) {
        body.rejectionReason = rejectionReason;
      }

      if (!applicationId || typeof applicationId !== "string") {
        alert("Invalid application ID");
        return;
      }
      const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchApplication();
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

  const handleDeleteApplication = async () => {
    if (!application) return;

    if (!confirm("Are you absolutely sure you want to delete this application? This action cannot be undone and will permanently delete all related data (documents, travellers, payments).")) {
      return;
    }

    setDeletingApplication(true);
    setDeleteError(null);
    try {
      if (!applicationId || typeof applicationId !== "string") {
        setDeleteError("Invalid application ID");
        setDeletingApplication(false);
        return;
      }
      const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Redirect to applications list after successful deletion
        try {
          router.push("/admin/applications");
          // Fallback redirect
          setTimeout(() => {
            if (window.location.pathname !== "/admin/applications") {
              window.location.href = "/admin/applications";
            }
          }, 500);
        } catch (redirectError) {
          console.error("Router redirect failed, using window.location:", redirectError);
          window.location.href = "/admin/applications";
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete application");
      }
    } catch (error) {
      console.error("Error deleting application:", error);
      setDeleteError(error instanceof Error ? error.message : "Failed to delete application. Please try again.");
    } finally {
      setDeletingApplication(false);
    }
  };

  const handleAssignAdmin = async (adminId: string) => {
    if (!adminId) {
      alert("Please select an admin");
      return;
    }

    if (!applicationId || typeof applicationId !== "string") {
      alert("Invalid application ID");
      return;
    }
    setAssigningAdmin(true);
    try {
      const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      if (response.ok) {
        await fetchApplication();
        setShowAssignDropdown(false);
        alert("Application assigned successfully");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to assign application");
      }
    } catch (error) {
      console.error("Error assigning admin:", error);
      alert("An error occurred");
    } finally {
      setAssigningAdmin(false);
    }
  };

  const handleDocumentStatusChange = async (docId: string, status: string, comment: string) => {
    setUpdating(true);
    try {
      // Map VERIFIED to APPROVED for backend
      const backendStatus = status === "VERIFIED" ? "APPROVED" : status;

      if (!applicationId || typeof applicationId !== "string") {
        alert("Invalid application ID");
        return;
      }
      const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(docId)}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: backendStatus,
          rejectionReason: status === "REJECTED" ? comment : null,
        }),
      });

      if (response.ok) {
        await fetchApplication();
        // Clear the update state for this document
        setDocumentStatusUpdates((prev) => {
          const updated = { ...prev };
          delete updated[docId];
          return updated;
        });
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update document status");
      }
    } catch (error) {
      console.error("Error updating document:", error);
      alert("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      alert("Please enter a note");
      return;
    }

    setAddingNote(true);
    try {
      // Append to existing notes
      const updatedNotes = notes ? `${notes}\n\n[${new Date().toLocaleString()}] ${newNote}` : `[${new Date().toLocaleString()}] ${newNote}`;

      if (!applicationId || typeof applicationId !== "string") {
        alert("Invalid application ID");
        return;
      }
      const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updatedNotes }),
      });

      if (response.ok) {
        await fetchApplication();
        setNewNote("");
        alert("Note added successfully");
      } else {
        alert("Failed to add note");
      }
    } catch (error) {
      console.error("Error adding note:", error);
      alert("An error occurred");
    } finally {
      setAddingNote(false);
    }
  };

  const getDocumentUrl = (filePath: string) => {
    const key = encodeURIComponent(filePath);
    return `/api/files?key=${key}`;
  };

  // Group documents by traveller
  const groupedDocuments = () => {
    if (!application) return { travellers: [], application: [] };

    const travellerDocs: Record<string, { traveller: Traveller; documents: Document[] }> = {};
    const applicationDocs: Document[] = [];

    (application.documents || []).forEach((doc) => {
      const travellerId = doc.travellerId;
      // Find traveller with proper null checks
      let traveller: Traveller | null = null;
      if (travellerId && application.travellers && Array.isArray(application.travellers)) {
        const travellerEntry = application.travellers.find((t) => {
          return t && t.traveller && t.traveller.id && t.traveller.id === travellerId;
        });
        traveller = travellerEntry?.traveller || null;
      }

      if (traveller && traveller.id && typeof travellerId === "string") {
        if (!travellerDocs[travellerId]) {
          travellerDocs[travellerId] = { traveller, documents: [] };
        }
        travellerDocs[travellerId].documents.push(doc);
      } else {
        applicationDocs.push(doc);
      }
    });

    return {
      travellers: Object.values(travellerDocs).filter(group =>
        group &&
        group.traveller &&
        group.traveller.id &&
        Array.isArray(group.documents)
      ),
      application: applicationDocs,
    };
  };

  // Parse notes into list (if formatted with timestamps)
  const parseNotes = (notesText: string | null): Array<{ timestamp: string; message: string }> => {
    if (!notesText) return [];

    // Try to parse notes that are formatted as [timestamp] message
    const lines = notesText.split('\n\n');
    return lines.map(line => {
      const match = line.match(/^\[(.+?)\]\s*(.+)$/);
      if (match) {
        return { timestamp: match[1], message: match[2] };
      }
      return { timestamp: '', message: line };
    }).filter(n => n.message.trim());
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

  const visaEntryDisplay = getVisaEntryDisplay(application.visa ?? undefined);
  const documentsGrouped = groupedDocuments();
  const completedPayment = application.payments?.find(p => p.status === "COMPLETED");
  const notesList = parseNotes(application.notes);
  const primaryApplicant = application.travellers[0]?.traveller;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Bar */}
        <div className="mb-8">
          <Link
            href="/admin/applications"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-sm mb-6"
          >
            <ArrowLeft size={16} />
            Back to Applications
          </Link>

          {deleteError && (
            <div className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-lg mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{deleteError}</span>
              </div>
              <button onClick={() => setDeleteError(null)} className="text-current hover:opacity-75">
                <X size={18} />
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Left: Reference & Country Info */}
              <div className="flex items-start gap-4">
                {(() => {
                  if (!application.visa?.country) return null;
                  const flagUrl = getCountryFlagUrl(application.visa.country.flagUrl, application.visa.country.code, 160);
                  return flagUrl ? (
                    <Image
                      src={flagUrl}
                      alt={application.visa.country.name}
                      width={48}
                      height={32}
                      className="rounded object-cover border border-neutral-200"
                    />
                  ) : null;
                })()}
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">
                    {application.visa?.country?.name || application.country} - {application.visaType}
                    {application.visaSubType && (
                      <span className="text-lg font-normal text-neutral-600 ml-2">
                        ({application.visaSubType.label})
                      </span>
                    )}
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    Reference: <span className="font-mono font-semibold">{application.referenceNumber || `TRV-${new Date(application.createdAt).getFullYear()}-${application.id.slice(-5).toUpperCase()}`}</span>
                  </p>
                </div>
              </div>

              {/* Right: Status Badge & Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${application.status === "APPROVED" ? "bg-green-100 text-green-700" :
                  application.status === "REJECTED" ? "bg-red-100 text-red-700" :
                    application.status === "IN_PROCESS" ? "bg-primary-100 text-primary-700" :
                      application.status === "SUBMITTED" ? "bg-blue-100 text-blue-700" :
                        "bg-neutral-100 text-neutral-700"
                  }`}>
                  {application.status.replace(/_/g, " ")}
                </span>

                {/* Assign Admin Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <UserPlus size={16} />
                    {application.processedBy ? application.processedBy?.name || application.processedBy?.email : "Assign Admin"}
                    <ChevronDown size={16} />
                  </button>
                  {showAssignDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                      {admins.length > 0 ? (
                        <div className="p-2">
                          {admins.map((admin) => (
                            <button
                              key={admin.id}
                              onClick={() => handleAssignAdmin(admin.id)}
                              disabled={assigningAdmin}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 rounded ${application.processedBy?.id === admin.id ? "bg-primary-50 text-primary-700" : ""
                                }`}
                            >
                              <div className="font-medium">{admin.name}</div>
                              <div className="text-xs text-neutral-500">{admin.email}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-sm text-neutral-500">No admins available</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={handleDeleteApplication}
                  disabled={deletingApplication}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                  {deletingApplication ? "Deleting..." : "Delete"}
                </button>

                {completedPayment && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/invoices/download/application/${application.id}`, {
                          method: "GET",
                          headers: {
                            "Accept": "application/pdf",
                          },
                        });

                        if (!response.ok) {
                          let errorMessage = "Failed to download invoice";
                          try {
                            const errorData = await response.json();
                            errorMessage = errorData.error || errorData.message || errorMessage;
                          } catch {
                            errorMessage = `Server error: ${response.status} ${response.statusText}`;
                          }
                          throw new Error(errorMessage);
                        }

                        const blob = await response.blob();
                        if (!blob || blob.size === 0) {
                          throw new Error("Received empty file");
                        }

                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `invoice-application-${application.id}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (error) {
                        console.error("Error downloading invoice:", error);
                        const errorMessage = error instanceof Error
                          ? error.message
                          : "Network error. Please check your connection and try again.";
                        alert(`Failed to download invoice: ${errorMessage}`);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <FileDown size={16} />
                    Download Invoice
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Application & Traveller Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Application Overview */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Application Overview</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Country</div>
                  <div className="font-medium text-neutral-900">{application.visa?.country?.name || application.country || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Visa Type</div>
                  <div className="font-medium text-neutral-900">
                    {application.visaType || "N/A"}
                    {application.visaSubType && (
                      <span className="text-sm text-neutral-600 ml-2">
                        ({application.visaSubType.label})
                      </span>
                    )}
                  </div>
                </div>
                {application.visa?.processingTime && (
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Processing Time</div>
                    <div className="font-medium text-neutral-900">{application.visa.processingTime}</div>
                  </div>
                )}
                {visaEntryDisplay && (
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Entry Type</div>
                    <div className="font-medium text-neutral-900">{visaEntryDisplay}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Total Amount</div>
                  <div className="font-medium text-neutral-900">₹{application.totalAmount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Created Date</div>
                  <div className="font-medium text-neutral-900">{formatDate(application.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Last Updated</div>
                  <div className="font-medium text-neutral-900">{formatDate(application.updatedAt)}</div>
                </div>
              </div>
            </div>

            {/* Primary Applicant */}
            {primaryApplicant && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Primary Applicant</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Full Name</div>
                    <div className="font-medium text-neutral-900">{primaryApplicant.firstName} {primaryApplicant.lastName}</div>
                  </div>
                  {primaryApplicant.email && (
                    <div>
                      <div className="text-sm text-neutral-600 mb-1">Email</div>
                      <div className="font-medium text-neutral-900">{primaryApplicant.email}</div>
                    </div>
                  )}
                  {primaryApplicant.phone && (
                    <div>
                      <div className="text-sm text-neutral-600 mb-1">Phone</div>
                      <div className="font-medium text-neutral-900">{primaryApplicant.phone}</div>
                    </div>
                  )}
                  {primaryApplicant.dateOfBirth && (
                    <div>
                      <div className="text-sm text-neutral-600 mb-1">Date of Birth</div>
                      <div className="font-medium text-neutral-900">{formatDate(primaryApplicant.dateOfBirth)}</div>
                    </div>
                  )}
                  {primaryApplicant.passportNumber && (
                    <div>
                      <div className="text-sm text-neutral-600 mb-1">Passport Number</div>
                      <div className="font-medium text-neutral-900">{primaryApplicant.passportNumber}</div>
                    </div>
                  )}
                  {primaryApplicant.nationality && (
                    <div>
                      <div className="text-sm text-neutral-600 mb-1">Nationality</div>
                      <div className="font-medium text-neutral-900">{primaryApplicant.nationality}</div>
                    </div>
                  )}
                  {primaryApplicant.gender && (
                    <div>
                      <div className="text-sm text-neutral-600 mb-1">Gender</div>
                      <div className="font-medium text-neutral-900">{primaryApplicant.gender}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Relationship</div>
                    <div className="font-medium text-neutral-900">Self</div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Travellers */}
            {application.travellers && application.travellers.length > 1 && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Other Travellers</h2>
                <div className="space-y-4">
                  {application.travellers.slice(1).filter(t => t && t.traveller && t.traveller.id).map((t) => (
                    <div key={t.traveller?.id} className="border border-neutral-200 rounded-lg p-4">
                      <h3 className="font-semibold mb-3">{t.traveller?.firstName} {t.traveller?.lastName}</h3>
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        {t.traveller?.dateOfBirth && (
                          <div>
                            <span className="text-neutral-600">Date of Birth:</span>{" "}
                            <span className="font-medium">{formatDate(t.traveller.dateOfBirth)}</span>
                          </div>
                        )}
                        {t.traveller?.passportNumber && (
                          <div>
                            <span className="text-neutral-600">Passport Number:</span>{" "}
                            <span className="font-medium">{t.traveller.passportNumber}</span>
                          </div>
                        )}
                        {t.traveller?.nationality && (
                          <div>
                            <span className="text-neutral-600">Nationality:</span>{" "}
                            <span className="font-medium">{t.traveller.nationality}</span>
                          </div>
                        )}
                        {t.traveller?.gender && (
                          <div>
                            <span className="text-neutral-600">Gender:</span>{" "}
                            <span className="font-medium">{t.traveller.gender}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Summary */}
            {completedPayment && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Payment Summary</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Payment Status:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${completedPayment.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                      completedPayment.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                        completedPayment.status === "FAILED" ? "bg-red-100 text-red-700" :
                          "bg-neutral-100 text-neutral-700"
                      }`}>
                      {completedPayment.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Amount:</span>
                    <span className="font-medium text-neutral-900">₹{completedPayment.amount.toLocaleString()} {completedPayment.currency}</span>
                  </div>
                  {completedPayment.razorpayOrderId && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Razorpay Order ID:</span>
                      <span className="font-medium text-neutral-900 text-xs">{completedPayment.razorpayOrderId}</span>
                    </div>
                  )}
                  {completedPayment.razorpayPaymentId && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Razorpay Payment ID:</span>
                      <span className="font-medium text-neutral-900 text-xs">{completedPayment.razorpayPaymentId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Paid At:</span>
                    <span className="font-medium text-neutral-900">{formatDate(completedPayment.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {application.timeline && application.timeline.length > 0 && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Application Timeline</h2>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-200"></div>
                  <div className="space-y-6">
                    {application.timeline.map((event, index) => (
                      <div key={event.id || index} className="relative pl-12">
                        <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-primary-100 border-2 border-primary-600 flex items-center justify-center">
                          <Clock size={14} className="text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900">{event.event}</div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {formatDate(event.time)} {event.adminName && `• by ${event.adminName}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Documents & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Documents - Tabs by Traveller */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Documents</h2>

              {/* Traveller Tabs */}
              {(documentsGrouped.travellers.length > 0 || documentsGrouped.application.length > 0) && (
                <div className="mb-4 border-b border-neutral-200">
                  <div className="flex flex-wrap gap-2">
                    {documentsGrouped.travellers.map((group) => (
                      <button
                        key={group.traveller.id}
                        onClick={() => setActiveTravellerTab(group.traveller.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTravellerTab === group.traveller.id
                          ? "border-primary-600 text-primary-600"
                          : "border-transparent text-neutral-600 hover:text-neutral-900"
                          }`}
                      >
                        {group.traveller.firstName} {group.traveller.lastName}
                      </button>
                    ))}
                    {documentsGrouped.application.length > 0 && (
                      <button
                        onClick={() => setActiveTravellerTab("application")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTravellerTab === "application"
                          ? "border-primary-600 text-primary-600"
                          : "border-transparent text-neutral-600 hover:text-neutral-900"
                          }`}
                      >
                        Application
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Documents Content */}
              <div className="space-y-4">
                {/* Per-Traveller Documents */}
                {documentsGrouped.travellers.map((group) => {
                  if (!group || !group.traveller || !group.traveller.id) return null;
                  if (activeTravellerTab === group.traveller.id) {
                    return (
                      <div key={group.traveller.id} className="space-y-3">
                        {group.documents.map((doc) => (
                          <DocumentCard
                            key={doc.id}
                            doc={doc}
                            applicationId={applicationId as string}
                            documentStatusUpdates={documentStatusUpdates}
                            setDocumentStatusUpdates={setDocumentStatusUpdates}
                            handleDocumentStatusChange={handleDocumentStatusChange}
                            updating={updating}
                            getDocumentUrl={getDocumentUrl}
                          />
                        ))}
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Application-Level Documents */}
                {activeTravellerTab === "application" && documentsGrouped.application.length > 0 && (
                  <div className="space-y-3">
                    {documentsGrouped.application.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        applicationId={applicationId as string}
                        documentStatusUpdates={documentStatusUpdates}
                        setDocumentStatusUpdates={setDocumentStatusUpdates}
                        handleDocumentStatusChange={handleDocumentStatusChange}
                        updating={updating}
                        getDocumentUrl={getDocumentUrl}
                      />
                    ))}
                  </div>
                )}

                {/* Default: Show first traveller's documents */}
                {!activeTravellerTab && documentsGrouped.travellers.length > 0 && (
                  <div className="space-y-3">
                    {documentsGrouped.travellers[0].documents.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        applicationId={applicationId as string}
                        documentStatusUpdates={documentStatusUpdates}
                        setDocumentStatusUpdates={setDocumentStatusUpdates}
                        handleDocumentStatusChange={handleDocumentStatusChange}
                        updating={updating}
                        getDocumentUrl={getDocumentUrl}
                      />
                    ))}
                  </div>
                )}

                {/* Default: show application documents when no traveller docs */}
                {!activeTravellerTab && documentsGrouped.travellers.length === 0 && documentsGrouped.application.length > 0 && (
                  <div className="space-y-3">
                    {documentsGrouped.application.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        applicationId={applicationId as string}
                        documentStatusUpdates={documentStatusUpdates}
                        setDocumentStatusUpdates={setDocumentStatusUpdates}
                        handleDocumentStatusChange={handleDocumentStatusChange}
                        updating={updating}
                        getDocumentUrl={getDocumentUrl}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Application Status Control */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Change Status</h3>
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
                  {updating ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>

            {/* Visa Document Upload - show when in process or approved/rejected */}
            {(application.status === "IN_PROCESS" || application.status === "APPROVED" || application.status === "REJECTED") && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h3 className="font-semibold text-neutral-900 mb-4">Visa Document</h3>

                {application.visaDocumentUrl ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2 text-green-700 font-medium">
                          <CheckCircle size={18} />
                          <span>Visa document uploaded</span>
                        </div>
                      </div>
                      <a
                        href={getDocumentUrl(application.visaDocumentUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                      >
                        View
                      </a>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setUploadingVisa(true);
                            try {
                              const formData = new FormData();
                              formData.append("file", file);

                              if (!applicationId || typeof applicationId !== "string") {
                                alert("Invalid application ID");
                                setUploadingVisa(false);
                                return;
                              }
                              const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/visa`, {
                                method: "POST",
                                body: formData,
                              });

                              if (response.ok) {
                                await fetchApplication();
                              } else {
                                const error = await response.json().catch(() => ({}));
                                alert(error.error || "Failed to upload visa document");
                              }
                            } catch (error) {
                              console.error("Error uploading visa document:", error);
                              alert("An error occurred while uploading visa document");
                            } finally {
                              setUploadingVisa(false);
                              if (e.target) e.target.value = "";
                            }
                          }}
                          disabled={uploadingVisa}
                        />
                        <div className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed">
                          {uploadingVisa ? "Uploading..." : "Replace Visa Document"}
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-center">
                      <FileText size={24} className="text-neutral-400 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600 mb-4">No visa document uploaded</p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setUploadingVisa(true);
                            try {
                              const formData = new FormData();
                              formData.append("file", file);

                              if (!applicationId || typeof applicationId !== "string") {
                                alert("Invalid application ID");
                                setUploadingVisa(false);
                                return;
                              }
                              const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/visa`, {
                                method: "POST",
                                body: formData,
                              });

                              if (response.ok) {
                                await fetchApplication();
                              } else {
                                const error = await response.json().catch(() => ({}));
                                alert(error.error || "Failed to upload visa document");
                              }
                            } catch (error) {
                              console.error("Error uploading visa document:", error);
                              alert("An error occurred while uploading visa document");
                            } finally {
                              setUploadingVisa(false);
                              if (e.target) e.target.value = "";
                            }
                          }}
                          disabled={uploadingVisa}
                        />
                        <div className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-center text-sm">
                          {uploadingVisa ? "Uploading..." : "Upload Visa (PDF or image)"}
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Invoice Management - Only show when status is APPROVED or REJECTED */}
            {(application.status === "APPROVED" || application.status === "REJECTED") && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h3 className="font-semibold text-neutral-900 mb-4">Invoice</h3>
                {application.invoiceUrl ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText size={20} className="text-green-600" />
                        <div>
                          <div className="text-sm font-medium text-green-900">Invoice Available</div>
                          {application.invoiceUploadedAt && (
                            <div className="text-xs text-green-700">
                              Uploaded {formatDate(application.invoiceUploadedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                      <a
                        href={`/api/invoices/download/application/${encodeURIComponent(applicationId || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Download
                      </a>
                    </div>
                    <div className="flex space-x-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setUploadingInvoice(true);
                            try {
                              const formData = new FormData();
                              formData.append("file", file);

                              if (!applicationId || typeof applicationId !== "string") {
                                alert("Invalid application ID");
                                setUploadingInvoice(false);
                                return;
                              }
                              const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/invoice`, {
                                method: "POST",
                                body: formData,
                              });

                              if (response.ok) {
                                await fetchApplication();
                              } else {
                                const error = await response.json().catch(() => ({}));
                                alert(error.error || "Failed to upload invoice (PDF only, max 10MB)");
                              }
                            } catch (error) {
                              console.error("Error uploading invoice:", error);
                              alert("An error occurred while uploading invoice (check network or try a smaller PDF under 10MB)");
                            } finally {
                              setUploadingInvoice(false);
                              if (e.target) e.target.value = "";
                            }
                          }}
                          disabled={uploadingInvoice}
                        />
                        <div className="w-full bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-center text-sm">
                          {uploadingInvoice ? "Uploading..." : "Replace Invoice"}
                        </div>
                      </label>
                      <button
                        onClick={async () => {
                          if (!confirm("Are you sure you want to remove this invoice?")) return;

                          setRemovingInvoice(true);
                          try {
                            if (!applicationId || typeof applicationId !== "string") {
                              alert("Invalid application ID");
                              setRemovingInvoice(false);
                              return;
                            }
                            const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/invoice`, {
                              method: "DELETE",
                            });

                            if (response.ok) {
                              await fetchApplication();
                            } else {
                              alert("Failed to remove invoice");
                            }
                          } catch (error) {
                            alert("An error occurred");
                          } finally {
                            setRemovingInvoice(false);
                          }
                        }}
                        disabled={removingInvoice}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {removingInvoice ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-center">
                      <FileText size={24} className="text-neutral-400 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600 mb-4">No invoice uploaded</p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setUploadingInvoice(true);
                            try {
                              const formData = new FormData();
                              formData.append("file", file);

                              if (!applicationId || typeof applicationId !== "string") {
                                alert("Invalid application ID");
                                setUploadingInvoice(false);
                                return;
                              }
                              const response = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/invoice`, {
                                method: "POST",
                                body: formData,
                              });

                              if (response.ok) {
                                await fetchApplication();
                              } else {
                                const error = await response.json().catch(() => ({}));
                                alert(error.error || "Failed to upload invoice (PDF only, max 10MB)");
                              }
                            } catch (error) {
                              console.error("Error uploading invoice:", error);
                              alert("An error occurred while uploading invoice (check network or try a smaller PDF under 10MB)");
                            } finally {
                              setUploadingInvoice(false);
                              if (e.target) e.target.value = "";
                            }
                          }}
                          disabled={uploadingInvoice}
                        />
                        <div className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-center text-sm">
                          {uploadingInvoice ? "Uploading..." : "Upload Invoice (PDF)"}
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Internal Notes */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Internal Notes</h3>
              <div className="space-y-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
                  rows={3}
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="w-full bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingNote ? "Adding..." : "Add Note"}
                </button>

                {notesList.length > 0 && (
                  <div className="pt-4 border-t border-neutral-200">
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {notesList.map((note, index) => (
                        <div key={index} className="text-sm">
                          {note.timestamp && (
                            <div className="text-xs text-neutral-500 mb-1">{note.timestamp}</div>
                          )}
                          <div className="text-neutral-900">{note.message}</div>
                        </div>
                      ))}
                    </div>
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

// Document Card Component
function DocumentCard({
  doc,
  applicationId,
  documentStatusUpdates,
  setDocumentStatusUpdates,
  handleDocumentStatusChange,
  updating,
  getDocumentUrl,
}: {
  doc: Document;
  applicationId: string;
  documentStatusUpdates: Record<string, { status: string; comment: string }>;
  setDocumentStatusUpdates: (updates: Record<string, { status: string; comment: string }> | ((prev: Record<string, { status: string; comment: string }>) => Record<string, { status: string; comment: string }>)) => void;
  handleDocumentStatusChange: (docId: string, status: string, comment: string) => Promise<void>;
  updating: boolean;
  getDocumentUrl: (filePath: string) => string;
}) {
  const currentStatus = documentStatusUpdates[doc.id]?.status || doc.status;
  const currentComment = documentStatusUpdates[doc.id]?.comment || doc.rejectionReason || "";
  const hasChanges = currentStatus !== doc.status || currentComment !== (doc.rejectionReason || "");

  const formatFileSize = (size?: number | null) => {
    if (!size && size !== 0) return null;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const sizeLabel = formatFileSize(doc.fileSize ?? null);

  return (
    <div
      className={`border rounded-lg p-4 ${doc.status === "REJECTED" ? "border-red-200 bg-red-50" :
        doc.status === "APPROVED" ? "border-green-200 bg-green-50" :
          "border-neutral-200 bg-white"
        }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-medium text-neutral-900">
            {doc.requirement?.name || doc.documentType}
          </div>
          {doc.requirement?.description && (
            <div className="text-xs text-neutral-500 mt-1">{doc.requirement.description}</div>
          )}
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${doc.status === "APPROVED" ? "bg-green-100 text-green-700" :
          doc.status === "REJECTED" ? "bg-red-100 text-red-700" :
            "bg-yellow-100 text-yellow-700"
          }`}>
          {doc.status === "APPROVED" ? "VERIFIED" : doc.status}
        </span>
      </div>

      {doc.rejectionReason && (
        <div className="text-sm text-red-700 mb-2 p-2 bg-red-50 rounded">
          <strong>Rejection Reason:</strong> {doc.rejectionReason}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap mb-3">
        <a
          href={getDocumentUrl(doc.filePath)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          <Eye size={16} />
          View
        </a>
        <a
          href={getDocumentUrl(doc.filePath)}
          download
          className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 text-sm font-medium"
        >
          <Download size={16} />
          Download
        </a>
        {sizeLabel && (
          <span className="text-xs text-neutral-500">
            {sizeLabel}
          </span>
        )}
      </div>

      {/* Document Status & Comment Controls */}
      <div className="pt-3 border-t border-neutral-200">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Status
            </label>
            <select
              value={currentStatus === "APPROVED" ? "VERIFIED" : currentStatus}
              onChange={(e) => {
                setDocumentStatusUpdates((prev) => ({
                  ...prev,
                  [doc.id]: {
                    status: e.target.value === "VERIFIED" ? "APPROVED" : e.target.value,
                    comment: prev[doc.id]?.comment || doc.rejectionReason || "",
                  },
                }));
              }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            >
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Admin Comment {currentStatus === "REJECTED" && <span className="text-red-600">*</span>}
            </label>
            <textarea
              value={currentComment}
              onChange={(e) => {
                setDocumentStatusUpdates((prev) => ({
                  ...prev,
                  [doc.id]: {
                    status: prev[doc.id]?.status || doc.status,
                    comment: e.target.value,
                  },
                }));
              }}
              placeholder={
                currentStatus === "REJECTED"
                  ? "Enter rejection reason (required, will be shown to user)..."
                  : "Add a comment or note about this document..."
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              rows={2}
            />
          </div>

          {hasChanges && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const update = documentStatusUpdates[doc.id];
                  if (update) {
                    handleDocumentStatusChange(
                      doc.id,
                      update.status,
                      update.comment
                    );
                  }
                }}
                disabled={updating || (currentStatus === "REJECTED" && !currentComment.trim())}
                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => {
                  setDocumentStatusUpdates((prev) => {
                    const updated = { ...prev };
                    delete updated[doc.id];
                    return updated;
                  });
                }}
                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
