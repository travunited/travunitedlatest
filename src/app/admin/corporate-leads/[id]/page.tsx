"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2, Calendar, User, Save, FileText } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

interface CorporateLead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  gstNumber: string | null;
  message: string | null;
  status: string;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCorporateLeadDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [lead, setLead] = useState<CorporateLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/corporate-leads/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setLead(data);
        setSelectedStatus(data.status);
        setInternalNotes(data.internalNotes || "");
      }
    } catch (error) {
      console.error("Error fetching corporate lead:", error);
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
        fetchLead();
      }
    }
  }, [session, status, router, fetchLead]);

  const handleStatusChange = async () => {
    if (!lead) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/corporate-leads/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (response.ok) {
        await fetchLead();
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
    if (!lead) return;

    setSavingNotes(true);
    try {
      const response = await fetch(`/api/admin/corporate-leads/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes }),
      });

      if (response.ok) {
        await fetchLead();
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
      CONTACTED: "bg-yellow-100 text-yellow-700",
      PROPOSAL_SENT: "bg-purple-100 text-purple-700",
      WON: "bg-green-100 text-green-700",
      LOST: "bg-red-100 text-red-700",
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

  if (!lead) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Corporate Lead Not Found</h1>
          <Link href="/admin/corporate-leads" className="text-primary-600 hover:text-primary-700">
            ← Back to Corporate Requirements
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
              href="/admin/corporate-leads"
              className="text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">{lead.companyName}</h1>
              <p className="text-neutral-600 mt-1">Lead ID: {lead.id.slice(0, 8)}...</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(lead.status)}`}>
            {lead.status.replace("_", " ")}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Company Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                    <Building2 size={16} />
                    <span>Company Name</span>
                  </div>
                  <div className="font-medium text-neutral-900">{lead.companyName}</div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                    <User size={16} />
                    <span>Contact Name</span>
                  </div>
                  <div className="font-medium text-neutral-900">{lead.contactName}</div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                    <Mail size={16} />
                    <span>Email</span>
                  </div>
                  <div className="font-medium text-neutral-900">{lead.email}</div>
                </div>
                {lead.phone && (
                  <div>
                    <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                      <Phone size={16} />
                      <span>Phone</span>
                    </div>
                    <div className="font-medium text-neutral-900">{lead.phone}</div>
                  </div>
                )}
                {lead.gstNumber && (
                  <div>
                    <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                      <FileText size={16} />
                      <span>GST Number</span>
                    </div>
                    <div className="font-medium text-neutral-900">{lead.gstNumber}</div>
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 mb-1">
                    <Calendar size={16} />
                    <span>Submitted On</span>
                  </div>
                  <div className="font-medium text-neutral-900">{formatDate(lead.createdAt)}</div>
                </div>
              </div>
            </div>

            {/* Message */}
            {lead.message && (
              <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Message</h2>
                <p className="text-neutral-700 whitespace-pre-wrap">{lead.message}</p>
              </div>
            )}
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
                  <option value="CONTACTED">Contacted</option>
                  <option value="PROPOSAL_SENT">Proposal Sent</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
                <button
                  onClick={handleStatusChange}
                  disabled={updating || selectedStatus === lead.status}
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
                  placeholder="Add internal notes about this lead..."
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

