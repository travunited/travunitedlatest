"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, FileText, Upload, Download, CheckCircle, X, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/dateFormat";
import { loadRazorpayScript } from "@/lib/razorpay-client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface Document {
  id: string;
  documentType: string;
  status: string;
  filePath: string;
  rejectionReason: string | null;
  createdAt: string;
  traveller: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Application {
  id: string;
  country: string;
  visaType: string;
  status: string;
  totalAmount: number;
  discountAmount?: number;
  visaDocumentUrl: string | null;
  createdAt: string;
  documents: Document[];
  travellers: Array<{
    traveller: {
      firstName: string;
      lastName: string;
    };
  }>;
  visaSubType?: {
    id: string;
    label: string;
    code: string | null;
  } | null;
  promoCode?: {
    id: string;
    code: string;
  } | null;
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

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

  // Auto-scroll to payment section if hash is present
  useEffect(() => {
    if (application?.status === "PAYMENT_PENDING" && window.location.hash === "#payment") {
      setTimeout(() => {
        const paymentSection = document.getElementById("payment");
        if (paymentSection) {
          paymentSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [application]);

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
        // Show success message
        const doc = application?.documents.find((d) => d.id === documentId);
        if (doc) {
          // The UI will automatically update to show "Pending review" status
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to upload document. Please try again.");
      }
    } catch (error) {
      console.error("Error re-uploading document:", error);
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

  // Scroll to documents section
  const scrollToDocuments = () => {
    const documentsSection = document.getElementById("documents-section");
    if (documentsSection) {
      documentsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
                {application.visaSubType && (
                  <span className="text-lg font-normal text-neutral-600 ml-2">
                    ({application.visaSubType.label})
                  </span>
                )}
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
        {/* Rejection Banner */}
        {rejectedDocuments.length > 0 && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="text-red-600 mr-3 mt-0.5" size={24} />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  ⚠️ Some of your documents were rejected
                </h3>
                <div className="space-y-2 mb-4">
                  {rejectedDocuments.map((doc) => {
                    const travellerName = doc.traveller
                      ? `${doc.traveller.firstName} ${doc.traveller.lastName}`
                      : "Primary Traveller";
                    return (
                      <div key={doc.id} className="text-sm text-red-800">
                        <span className="font-medium">
                          {doc.documentType} {application.travellers.length > 1 ? `– ${travellerName}` : ""}
                        </span>
                        {doc.rejectionReason && (
                          <span className="ml-2">– &ldquo;{doc.rejectionReason}&rdquo;</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={scrollToDocuments}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
                >
                  Fix & Re-upload Documents
                </button>
              </div>
            </div>
          </div>
        )}
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
                  <div className="font-medium text-neutral-900">
                    {application.visaType}
                    {application.visaSubType && (
                      <span className="text-sm text-neutral-600 ml-2">
                        ({application.visaSubType.label})
                      </span>
                    )}
                  </div>
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
                  {application.discountAmount && application.discountAmount > 0 && application.promoCode && (
                    <div className="text-xs text-green-600 mt-1">
                      Promo code {application.promoCode.code} applied - Saved ₹{(application.discountAmount / 100).toLocaleString()}
                    </div>
                  )}
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
            <div id="documents-section" className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Documents</h2>
              {application.documents.length > 0 ? (
                <div className="space-y-4">
                  {application.documents.map((doc) => {
                    const StatusIcon = getDocumentStatusIcon(doc.status);
                    const travellerName = doc.traveller
                      ? `${doc.traveller.firstName} ${doc.traveller.lastName}`
                      : null;
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
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <FileText size={20} className="text-primary-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-neutral-900 mb-1">
                                {doc.documentType}
                                {travellerName && application.travellers.length > 1 && (
                                  <span className="text-neutral-600 font-normal ml-2">
                                    – {travellerName}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-neutral-600 mb-2">
                                Uploaded: {formatDate(doc.createdAt)}
                              </div>
                              {doc.status === "REJECTED" && doc.rejectionReason && (
                                <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-800">
                                  <span className="font-medium">Rejected:</span> &ldquo;{doc.rejectionReason}&rdquo;
                                </div>
                              )}
                              {doc.status === "PENDING" && (
                                <div className="mt-2 text-sm text-yellow-700">
                                  ⏳ Pending review
                                </div>
                              )}
                              {doc.status === "APPROVED" && (
                                <div className="mt-2 text-sm text-green-700">
                                  ✅ Approved
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 ml-4">
                            <span
                              className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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
                                  id={`file-input-${doc.id}`}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    // Validate file size (20MB max - matching API limit)
                                    if (file.size > 20 * 1024 * 1024) {
                                      alert("File size must be less than 20MB");
                                      return;
                                    }
                                    
                                    // Validate file type
                                    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
                                    if (!allowedTypes.includes(file.type)) {
                                      alert("Only JPG, PNG, and PDF files are allowed");
                                      return;
                                    }
                                    
                                    handleDocumentReupload(doc.id, file);
                                    // Reset input so same file can be selected again if needed
                                    e.target.value = "";
                                  }}
                                  disabled={uploading === doc.id}
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                  Accepted: PDF, JPG, PNG up to 20MB
                                </p>
                                <button
                                  type="button"
                                  disabled={uploading === doc.id}
                                  onClick={() => {
                                    const input = document.getElementById(`file-input-${doc.id}`) as HTMLInputElement;
                                    if (input && !uploading) {
                                      input.click();
                                    }
                                  }}
                                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1 px-3 py-1.5 border border-primary-300 rounded-lg hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Upload size={14} />
                                  <span>{uploading === doc.id ? "Uploading..." : "Re-upload"}</span>
                                </button>
                              </label>
                            )}
                          </div>
                        </div>
                        {doc.status === "REJECTED" && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-xs text-neutral-600">
                              <strong>Allowed formats:</strong> PDF, JPG, PNG. <strong>Max size:</strong> 20 MB
                            </p>
                          </div>
                        )}
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
              <div id="payment" className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-yellow-900 mb-4 flex items-center space-x-2">
                  <AlertCircle size={24} />
                  <span>Payment Pending</span>
                </h2>
                <p className="text-yellow-700 mb-4">
                  Your application is ready but payment is pending. Complete payment to proceed.
                </p>
                <button
                  onClick={async () => {
                    try {
                      setPaymentLoading(true);
                      const response = await fetch("/api/payments/create-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          amount: application.totalAmount,
                          applicationId: application.id,
                        }),
                      });

                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || "Failed to create payment order");
                      }

                      const { orderId, keyId, amount, currency } = await response.json();
                      const scriptLoaded = await loadRazorpayScript();
                      if (!scriptLoaded || !window.Razorpay) {
                        throw new Error("Failed to load Razorpay SDK.");
                      }

                      const options = {
                        key: keyId,
                        amount,
                        currency,
                        name: "Travunited",
                        description: `${application.country} - ${application.visaType} - Visa Application`,
                        order_id: orderId,
                        prefill: {
                          name: session?.user?.name || "",
                          email: session?.user?.email || "",
                        },
                        notes: {
                          applicationId: application.id,
                        },
                        handler: async (response: any) => {
                          try {
                            const verifyResponse = await fetch("/api/payments/verify", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                applicationId: application.id,
                              }),
                            });

                            if (verifyResponse.ok) {
                              router.push(`/applications/thank-you?applicationId=${application.id}`);
                            } else {
                              const errorData = await verifyResponse.json();
                              throw new Error(errorData.error || "Payment verification failed");
                            }
                          } catch (error: any) {
                            console.error("Payment verification error:", error);
                            alert(`Payment verification failed: ${error.message || "Please contact support"}`);
                            setPaymentLoading(false);
                          }
                        },
                        modal: {
                          ondismiss: () => {
                            setPaymentLoading(false);
                          },
                        },
                      };

                      const razorpay = new window.Razorpay(options);
                      
                      razorpay.on("payment.failed", (response: any) => {
                        console.error("Payment failed:", response);
                        setPaymentLoading(false);
                        const errorMessage = response.error?.description || response.error?.reason || "Payment failed. Please try again.";
                        alert(errorMessage);
                      });

                      razorpay.open();
                    } catch (error: any) {
                      console.error("Payment error:", error);
                      alert(`Unable to process payment: ${error.message || "Please try again."}`);
                      setPaymentLoading(false);
                    }
                  }}
                  disabled={paymentLoading}
                  className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentLoading ? "Processing..." : "Pay Now"}
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
                {(application.status === "SUBMITTED" || application.status === "IN_PROCESS" || application.status === "APPROVED") && (
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
                    className="w-full border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FileText size={18} />
                    <span>Download Invoice</span>
                  </button>
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

