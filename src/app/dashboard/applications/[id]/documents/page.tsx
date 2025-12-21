"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, Eye, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface VisaRequirement {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  scope: "PER_TRAVELLER" | "PER_APPLICATION";
  isRequired: boolean;
  sortOrder: number;
}

interface Application {
  id: string;
  status: string;
  country: string | null;
  visaType: string | null;
  visa: {
    id: string;
    requirements: VisaRequirement[];
  } | null;
  travellers: Array<{
    traveller: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  documents: Array<{
    id: string;
    requirementId: string | null;
    travellerId: string | null;
    status: string;
    filePath: string;
  }>;
}

export default function DocumentUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id as string;
  
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewModal, setPreviewModal] = useState<{ url: string; fileName: string } | null>(null);
  const [documents, setDocuments] = useState<Record<string, { file: File; preview: string; requirementId: string; travellerId?: string }>>({});

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    const fetchApplication = async () => {
      try {
        const res = await fetch(`/api/applications/${applicationId}`);
        if (res.ok) {
          const data = await res.json();
          setApplication(data);
          
          // Check if application is in correct status
          if (data.status !== "DOCUMENTS_PENDING") {
            router.push(`/dashboard/applications/${applicationId}`);
          }
        } else {
          router.push("/dashboard/applications");
        }
      } catch (error) {
        console.error("Error fetching application:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId, session, router]);

  const handleDocumentUpload = (
    requirement: VisaRequirement,
    travellerId: string | undefined,
    file: File
  ) => {
    if (file.size > 20 * 1024 * 1024) {
      alert("File size must be less than 20MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG, and PDF files are allowed");
      return;
    }

    const reader = new FileReader();
    const key = travellerId ? `${requirement.id}-${travellerId}` : requirement.id;
    reader.onloadend = () => {
      setDocuments((prev) => ({
        ...prev,
        [key]: {
          file,
          preview: reader.result as string,
          requirementId: requirement.id,
          travellerId,
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (key: string) => {
    setDocuments((prev) => {
      const newDocs = { ...prev };
      delete newDocs[key];
      return newDocs;
    });
  };

  const handleSubmit = async () => {
    if (!application) return;

    // Validate required documents
    const missingDocs: string[] = [];
    const perTravellerReqs = application.visa?.requirements.filter(r => r.scope === "PER_TRAVELLER") || [];
    const perApplicationReqs = application.visa?.requirements.filter(r => r.scope === "PER_APPLICATION") || [];

    perTravellerReqs.forEach((req) => {
      application.travellers.forEach((at, index) => {
        const key = `${req.id}-${at.traveller.id}`;
        if (req.isRequired && !documents[key]?.file) {
          missingDocs.push(`${req.name} for traveller ${index + 1}`);
        }
      });
    });

    perApplicationReqs.forEach((req) => {
      const key = req.id;
      if (req.isRequired && !documents[key]?.file) {
        missingDocs.push(req.name);
      }
    });

    if (missingDocs.length > 0) {
      alert(
        `Please upload the following required documents:\n- ${missingDocs.join(
          "\n- "
        )}`
      );
      return;
    }

    setUploading(true);
    try {
      // Upload all documents
      for (const [key, doc] of Object.entries(documents)) {
        if (!doc.file || !doc.requirementId) continue;

        const uploadFormData = new FormData();
        uploadFormData.append("file", doc.file);
        uploadFormData.append("requirementId", doc.requirementId);
        uploadFormData.append("documentType", doc.requirementId);

        if (doc.travellerId) {
          uploadFormData.append("travellerId", doc.travellerId);
        }

        try {
          await fetch(`/api/applications/${applicationId}/documents`, {
            method: "POST",
            body: uploadFormData,
          });
        } catch (error) {
          console.error("Error uploading document:", error);
        }
      }

      // Submit application
      const submitResponse = await fetch(`/api/applications/${applicationId}/submit`, {
        method: "POST",
      });

      if (submitResponse.ok) {
        router.push(`/applications/thank-you?applicationId=${applicationId}`);
      } else {
        const errorData = await submitResponse.json();
        alert(errorData.error || "Failed to submit application. Please try again.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-neutral-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!application || !application.visa) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600">Application not found</p>
          <Link href="/dashboard/applications" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            Go to Applications
          </Link>
        </div>
      </div>
    );
  }

  const perTravellerRequirements = application.visa.requirements.filter(r => r.scope === "PER_TRAVELLER");
  const perApplicationRequirements = application.visa.requirements.filter(r => r.scope === "PER_APPLICATION");

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/dashboard/applications/${applicationId}`}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            ← Back to Application
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-medium p-8 mb-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Upload Documents</h1>
            <p className="text-neutral-600">
              Payment successful! Please upload all required documents to complete your application.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <CheckCircle className="text-green-600 mt-0.5" size={20} />
              <div>
                <p className="text-green-800 font-medium">Payment Received</p>
                <p className="text-green-700 text-sm mt-1">
                  Your payment has been successfully processed. Please upload the required documents below to complete your application.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Per-Traveller Documents */}
            {perTravellerRequirements.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Per-Traveller Documents</h2>
                {application.travellers.map((at, travellerIndex) => (
                  <div key={at.traveller.id} className="border border-neutral-200 rounded-lg p-6 mb-4">
                    <h3 className="font-semibold mb-4">
                      Traveller {travellerIndex + 1}: {at.traveller.firstName} {at.traveller.lastName}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {perTravellerRequirements.map((requirement) => {
                        const key = `${requirement.id}-${at.traveller.id}`;
                        const doc = documents[key];
                        return (
                          <div key={requirement.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-neutral-700">
                                {requirement.name}
                              </label>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  requirement.isRequired
                                    ? "bg-red-100 text-red-700"
                                    : "bg-neutral-100 text-neutral-600"
                                }`}
                              >
                                {requirement.isRequired ? "Required" : "Optional"}
                              </span>
                            </div>
                            {requirement.description && (
                              <p className="text-xs text-neutral-500">{requirement.description}</p>
                            )}
                            {doc?.file ? (
                              <div className="border border-neutral-300 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <FileText size={20} className="text-primary-600" />
                                  <span className="text-sm text-neutral-700">{doc.file.name}</span>
                                </div>
                                <div className="flex space-x-2">
                                  {doc.preview && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewModal({ url: doc.preview, fileName: doc.file.name })}
                                      className="p-1 text-primary-600 hover:text-primary-700"
                                    >
                                      <Eye size={16} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeDocument(key)}
                                    className="p-1 text-red-600 hover:text-red-700"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-primary-600 transition-colors">
                                <Upload size={24} className="text-neutral-400 mb-2" />
                                <span className="text-sm text-neutral-600">Click to upload</span>
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleDocumentUpload(requirement, at.traveller.id, file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Per-Application Documents */}
            {perApplicationRequirements.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Per-Application Documents</h2>
                <div className="space-y-4">
                  {perApplicationRequirements.map((requirement) => {
                    const key = requirement.id;
                    const doc = documents[key];
                    return (
                      <div key={requirement.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-neutral-700">
                            {requirement.name}
                          </label>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              requirement.isRequired
                                ? "bg-red-100 text-red-700"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {requirement.isRequired ? "Required" : "Optional"}
                          </span>
                        </div>
                        {requirement.description && (
                          <p className="text-xs text-neutral-500">{requirement.description}</p>
                        )}
                        {doc?.file ? (
                          <div className="border border-neutral-300 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText size={20} className="text-primary-600" />
                              <span className="text-sm text-neutral-700">{doc.file.name}</span>
                            </div>
                            <div className="flex space-x-2">
                              {doc.preview && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewModal({ url: doc.preview, fileName: doc.file.name })}
                                  className="p-1 text-primary-600 hover:text-primary-700"
                                >
                                  <Eye size={16} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeDocument(key)}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-primary-600 transition-colors">
                            <Upload size={24} className="text-neutral-400 mb-2" />
                            <span className="text-sm text-neutral-600">Click to upload</span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocumentUpload(requirement, undefined, file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {perTravellerRequirements.length === 0 && perApplicationRequirements.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">No documents required for this visa application.</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>{uploading ? "Submitting..." : "Submit Application"}</span>
              {!uploading && <ArrowRight size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
            onClick={() => setPreviewModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900 truncate flex-1 mr-4">
                  {previewModal.fileName}
                </h3>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-neutral-50">
                {previewModal.url.startsWith("data:image") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewModal.url}
                    alt="Document preview"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                  />
                ) : previewModal.url.startsWith("data:application/pdf") || previewModal.url.includes("pdf") ? (
                  <object
                    data={previewModal.url}
                    type="application/pdf"
                    className="w-full h-[70vh] rounded-lg shadow-md border border-neutral-200"
                  >
                    <div className="text-center p-8 h-full flex flex-col items-center justify-center">
                      <FileText size={48} className="text-neutral-400 mx-auto mb-4" />
                      <p className="text-neutral-600 mb-4">PDF preview not available</p>
                      <a
                        href={previewModal.url}
                        download={previewModal.fileName}
                        className="text-primary-600 hover:text-primary-700 underline"
                      >
                        Download PDF
                      </a>
                    </div>
                  </object>
                ) : (
                  <div className="text-center p-8">
                    <FileText size={48} className="text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-600 mb-4">Preview not available</p>
                    <a
                      href={previewModal.url}
                      download={previewModal.fileName}
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      Download file
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

