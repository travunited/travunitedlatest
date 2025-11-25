"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Mail, Phone, MapPin, Briefcase, Calendar, FileText, CheckCircle, X, Clock, AlertCircle, Save } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

interface CareerApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string | null;
  positionTitle: string;
  experience: number | null;
  currentCompany: string | null;
  expectedCtc: string | null;
  coverNote: string | null;
  resumeUrl: string;
  status: string;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCareerApplicationDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [application, setApplication] = useState<CareerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchApplication = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/careers/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setApplication(data);
        setSelectedStatus(data.status);
        setInternalNotes(data.internalNotes || "");
      }
    } catch (error) {
      console.error("Error fetching career application:", error);
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
        fetchApplication();
      }
    }
  }, [session, status, router, fetchApplication]);

  const handleStatusChange = async () => {
    if (!application) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/careers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
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

  const handleSaveNotes = async () => {
    if (!application) return;

    setSavingNotes(true);
    try {
      const response = await fetch(`/api/admin/careers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes }),
      });

      if (response.ok) {
        await fetchApplication();
        alert("Notes saved successfully");
      } else {
        alert("Failed to save notes");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setSavingNotes(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEW: "bg-blue-100 text-blue-700",
      REVIEWED: "bg-yellow-100 text-yellow-700",
      SHORTLISTED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
      ON_HOLD: "bg-neutral-100 text-neutral-700",
    };
    return colors[status] || "bg-neutral-100 text-neutral-700";
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

  if (!application) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Application Not Found</h1>
          <Link href="/admin/careers" className="text-primary-600 hover:text-primary-700">
            ← Back to Career Applications
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const resumeDownloadUrl = `/api/files?key=${encodeURIComponent(application.resumeUrl)}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/careers"
              className="text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">{application.name}</h1>
              <p className="text-neutral-600 mt-1">Application ID: {application.id.slice(0, 8)}...</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
            {application.status.replace("_", " ")}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Basic Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                    <Mail size={16} />
                    <span>Email</span>
                  </div>
                  <div className="font-medium text-neutral-900">{application.email}</div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                    <Phone size={16} />
                    <span>Phone</span>
                  </div>
                  <div className="font-medium text-neutral-900">{application.phone}</div>
                </div>
                {application.location && (
                  <div>
                    <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                      <MapPin size={16} />
                      <span>Location</span>
                    </div>
                    <div className="font-medium text-neutral-900">{application.location}</div>
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                    <Calendar size={16} />
                    <span>Applied On</span>
                  </div>
                  <div className="font-medium text-neutral-900">{formatDate(application.createdAt)}</div>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Job Details</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                    <Briefcase size={16} />
                    <span>Position</span>
                  </div>
                  <div className="font-medium text-neutral-900">{application.positionTitle}</div>
                </div>
                {application.experience !== null && (
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Experience</div>
                    <div className="font-medium text-neutral-900">{application.experience} years</div>
                  </div>
                )}
                {application.currentCompany && (
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Current Company</div>
                    <div className="font-medium text-neutral-900">{application.currentCompany}</div>
                  </div>
                )}
                {application.expectedCtc && (
                  <div>
                    <div className="text-sm text-neutral-600 mb-1">Expected CTC</div>
                    <div className="font-medium text-neutral-900">{application.expectedCtc}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Cover Note */}
            {application.coverNote && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Cover Note</h2>
                <p className="text-neutral-700 whitespace-pre-wrap">{application.coverNote}</p>
              </div>
            )}

            {/* Resume */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Resume</h2>
              {application.resumeUrl ? (
                <a
                  href={resumeDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  <Download size={20} />
                  <span>Download Resume</span>
                </a>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">Resume not available for this application.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Update */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Update Status</h3>
              <div className="space-y-4">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
                >
                  <option value="NEW">New</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ON_HOLD">On Hold</option>
                </select>
                <button
                  onClick={handleStatusChange}
                  disabled={updating || selectedStatus === application.status}
                  className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Internal Notes</h3>
              <div className="space-y-4">
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm"
                  placeholder="Add internal notes about this application..."
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="w-full bg-neutral-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Save size={16} />
                  <span>{savingNotes ? "Saving..." : "Save Notes"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

