"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Save, Loader2, Plus, Upload, X, Download, FileText, Trash2, Edit2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";


interface CountryFormState {
  name: string;
  code: string;
  region?: string;
  flagUrl?: string;
  isActive: boolean;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description?: string | null;
  fileName: string;
  fileSize?: number | null;
  mimeType?: string | null;
  sortOrder: number;
  isActive: boolean;
  downloadUrl?: string | null;
}

export default function AdminCountryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isNew = params.id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CountryFormState>({
    name: "",
    code: "",
    region: "",
    flagUrl: "",
    isActive: true,
  });
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  const pageTitle = useMemo(
    () => (isNew ? "Add Country" : "Edit Country"),
    [isNew]
  );

  const fetchCountry = useCallback(async () => {
    if (isNew) return;
    try {
      const response = await fetch(`/api/admin/content/countries/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          name: data.name || "",
          code: data.code || "",
          region: data.region || "",
          flagUrl: data.flagUrl || "",
          isActive: data.isActive ?? true,
        });
      } else {
        router.push("/admin/content/countries");
      }
    } catch (error) {
      console.error("Failed to fetch country", error);
      router.push("/admin/content/countries");
    } finally {
      setLoading(false);
    }
  }, [isNew, params.id, router]);

  const fetchTemplates = useCallback(async () => {
    if (isNew) return;
    setLoadingTemplates(true);
    try {
      const response = await fetch(`/api/admin/content/countries/${params.id}/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Failed to fetch templates", error);
    } finally {
      setLoadingTemplates(false);
    }
  }, [isNew, params.id]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      router.push("/admin");
      return;
    }
    if (!isNew) {
      fetchCountry();
      fetchTemplates();
    } else {
      setLoading(false);
    }
  }, [session, status, router, isNew, fetchCountry, fetchTemplates]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(
        isNew
          ? "/api/admin/content/countries"
          : `/api/admin/content/countries/${params.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            region: formData.region || "",
            flagUrl: formData.flagUrl || "",
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to save country");
      } else {
        router.push("/admin/content/countries");
      }
    } catch (error) {
      console.error("Failed to save country", error);
      alert("Unexpected error while saving country");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            <p className="mt-4 text-neutral-600">Loading country...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/admin/content/countries"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
          Back to Countries
        </Link>
        <div className="mt-4 bg-white border border-neutral-200 rounded-2xl p-6 space-y-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{pageTitle}</h1>
            <p className="text-sm text-neutral-500">Country level metadata used across visas and tours.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Country Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="United Arab Emirates"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Country Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                  }
                  required
                  maxLength={10}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg uppercase tracking-wide focus:ring-2 focus:ring-primary-500"
                  placeholder="UAE"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Used in URLs and filters. Keep it short (e.g., UAE, SG, FR).
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Region
                  </label>
                  <input
                    type="text"
                    value={formData.region || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, region: e.target.value }))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Middle East"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Flag Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.flagUrl || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, flagUrl: e.target.value }))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="https://flagcdn.com/w320/ae.png"
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-800">
                  Active (visible in public listings)
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Document Templates Section */}
        {!isNew && (
          <div className="mt-6 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Document Templates</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Upload sample document templates for applicants to download. These appear after the "Documents Required" section.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(null);
                  setShowTemplateModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                <Plus size={16} /> Add Template
              </button>
            </div>

            {loadingTemplates ? (
              <div className="text-center py-8">
                <Loader2 size={24} className="animate-spin text-primary-600 mx-auto" />
                <p className="text-sm text-neutral-500 mt-2">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-neutral-200 rounded-lg">
                <FileText size={48} className="text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">No templates uploaded yet</p>
                <p className="text-xs text-neutral-400 mt-1">Templates will appear here once uploaded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-primary-600" />
                        <h3 className="font-medium text-neutral-900">{template.name}</h3>
                        {!template.isActive && (
                          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-neutral-500 mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-neutral-400">
                        <span>{template.fileName}</span>
                        {template.fileSize && (
                          <span>{(template.fileSize / 1024).toFixed(1)} KB</span>
                        )}
                        {template.mimeType && (
                          <span className="uppercase">
                            {template.mimeType.includes("pdf") ? "PDF" : template.mimeType.includes("word") ? "DOCX" : "DOC"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {template.downloadUrl && (
                        <a
                          href={template.downloadUrl}
                          download={template.fileName}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download size={18} />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowTemplateModal(true);
                        }}
                        className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete template "${template.name}"?`)) return;
                          try {
                            const response = await fetch(
                              `/api/admin/content/countries/${params.id}/templates/${template.id}`,
                              { method: "DELETE" }
                            );
                            if (response.ok) {
                              fetchTemplates();
                            } else {
                              alert("Failed to delete template");
                            }
                          } catch (error) {
                            console.error("Failed to delete template", error);
                            alert("Error deleting template");
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Template Upload/Edit Modal */}
        {showTemplateModal && (
          <TemplateModal
            countryId={params.id}
            template={editingTemplate}
            onClose={() => {
              setShowTemplateModal(false);
              setEditingTemplate(null);
            }}
            onSuccess={() => {
              fetchTemplates();
              setShowTemplateModal(false);
              setEditingTemplate(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// Template Modal Component
function TemplateModal({
  countryId,
  template,
  onClose,
  onSuccess,
}: {
  countryId: string;
  template: DocumentTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [sortOrder, setSortOrder] = useState(template?.sortOrder || 0);
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template && !file) {
      alert("Please select a file to upload");
      return;
    }
    if (!name.trim()) {
      alert("Please enter a template name");
      return;
    }

    setUploading(true);
    try {
      if (template) {
        // Update existing template
        const response = await fetch(
          `/api/admin/content/countries/${countryId}/templates/${template.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, description, sortOrder, isActive }),
          }
        );
        if (!response.ok) {
          const error = await response.json();
          alert(error.error || "Failed to update template");
          return;
        }
      } else {
        // Create new template
        const formData = new FormData();
        formData.append("file", file!);
        formData.append("name", name);
        formData.append("description", description);
        formData.append("sortOrder", sortOrder.toString());

        const response = await fetch(
          `/api/admin/content/countries/${countryId}/templates`,
          {
            method: "POST",
            body: formData,
          }
        );
        if (!response.ok) {
          const error = await response.json();
          alert(error.error || "Failed to upload template");
          return;
        }
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving template", error);
      alert("Unexpected error while saving template");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900">
            {template ? "Edit Template" : "Upload Template"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Passport Copy Template"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Optional description for this template"
            />
          </div>

          {!template && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                File <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required={!template}
                  className="hidden"
                  id="template-file"
                />
                <label
                  htmlFor="template-file"
                  className="cursor-pointer inline-flex flex-col items-center"
                >
                  <Upload size={32} className="text-neutral-400 mb-2" />
                  <span className="text-sm font-medium text-neutral-700">
                    {file ? file.name : "Click to upload or drag and drop"}
                  </span>
                  <span className="text-xs text-neutral-500 mt-1">
                    PDF, DOC, or DOCX (max 20MB)
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-800">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 rounded-lg font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> {template ? "Updating..." : "Uploading..."}
                </>
              ) : (
                <>
                  <Save size={16} /> {template ? "Update" : "Upload"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
