"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Mail, Calendar, FileText, Plane, Edit, Save, X } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";
import { TextInput, SelectInput } from "@/components/admin/MemoizedInputs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface Admin {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  stats: {
    applicationsHandled: number;
    bookingsHandled: number;
    lastActive: string | null;
  };
}

export default function AdminDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "STAFF_ADMIN" as "STAFF_ADMIN" | "SUPER_ADMIN",
  });

  const updateEditForm = useCallback((field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const fetchAdmin = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/settings/admins/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setAdmin(data);
        setEditForm({
          name: data.name || "",
          role: data.role as "STAFF_ADMIN" | "SUPER_ADMIN",
        });
      }
    } catch (error) {
      console.error("Error fetching admin:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
      if (!isSuperAdmin) {
        router.push("/admin");
      } else {
        fetchAdmin();
      }
    }
  }, [session, status, router, fetchAdmin]);

  const handleSave = async () => {
    if (!admin) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/settings/admins/${admin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        await fetchAdmin();
        setEditing(false);
        alert("Admin updated successfully");
      } else {
        alert("Failed to update admin");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!admin) return;

    if (!confirm("Send password reset email to this admin?")) return;

    try {
      const response = await fetch(`/api/admin/settings/admins/${admin.id}/reset-password`, {
        method: "POST",
      });

      if (response.ok) {
        alert("Password reset email sent successfully");
      } else {
        alert("Failed to send reset email");
      }
    } catch (error) {
      alert("An error occurred");
    }
  };

  const handleToggleStatus = async () => {
    if (!admin) return;

    const action = admin.isActive ? "deactivate" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} this admin?`)) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/settings/admins/${admin.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !admin.isActive }),
      });

      if (response.ok) {
        await fetchAdmin();
        alert(`Admin ${action}d successfully`);
      } else {
        alert("Failed to update admin status");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setUpdating(false);
    }
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

  if (!admin) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Admin Not Found</h1>
            <Link href="/admin/settings/admins" className="text-primary-600 hover:text-primary-700">
              ← Back to Admin Management
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/admin/settings/admins"
            className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-4 text-sm"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Admin Management
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">{admin.name || "Admin"}</h1>
              <p className="text-neutral-600 mt-1">{admin.email}</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                admin.role === "SUPER_ADMIN" 
                  ? "bg-purple-100 text-purple-700" 
                  : "bg-blue-100 text-blue-700"
              }`}>
                {admin.role === "SUPER_ADMIN" ? "Super Admin" : "Staff Admin"}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                admin.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}>
                {admin.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Admin Information */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-neutral-900">Admin Information</h2>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 text-sm"
                  >
                    <Edit size={14} />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSave}
                      disabled={updating}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      <Save size={14} />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditForm({
                          name: admin.name || "",
                          role: admin.role as "STAFF_ADMIN" | "SUPER_ADMIN",
                        });
                      }}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 text-sm"
                    >
                      <X size={14} />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                  <div className="text-neutral-900 font-medium">{admin.email}</div>
                  <p className="text-xs text-neutral-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                  {editing ? (
                    <TextInput
                      type="text"
                      value={editForm.name}
                      onChange={(value) => updateEditForm("name", value)}
                      className="w-full px-4 py-2"
                    />
                  ) : (
                    <div className="text-neutral-900 font-medium">{admin.name || "N/A"}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Role</label>
                  {editing ? (
                    <SelectInput
                      value={editForm.role}
                      onChange={(value) => updateEditForm("role", value)}
                      className="w-full px-4 py-2"
                    >
                      <option value="STAFF_ADMIN">Staff Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </SelectInput>
                  ) : (
                    <div className="text-neutral-900 font-medium">
                      {admin.role === "SUPER_ADMIN" ? "Super Admin" : "Staff Admin"}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Account Created</label>
                  <div className="text-neutral-900 font-medium">
                    {formatDate(admin.createdAt)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Last Login</label>
                  <div className="text-neutral-900 font-medium">
                    {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : "Never"}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900 mb-4">Performance Statistics</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <FileText size={24} className="text-blue-600" />
                    <div>
                      <div className="text-sm text-neutral-600">Applications Handled</div>
                      <div className="text-2xl font-bold text-blue-700">{admin.stats?.applicationsHandled || 0}</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <Plane size={24} className="text-green-600" />
                    <div>
                      <div className="text-sm text-neutral-600">Bookings Handled</div>
                      <div className="text-2xl font-bold text-green-700">{admin.stats?.bookingsHandled || 0}</div>
                    </div>
                  </div>
                </div>
                {admin.stats?.lastActive && (
                  <div className="md:col-span-2 p-4 bg-neutral-50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <Calendar size={24} className="text-neutral-600" />
                      <div>
                        <div className="text-sm text-neutral-600">Last Active</div>
                        <div className="text-lg font-bold text-neutral-900">
                          {new Date(admin.stats.lastActive).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleResetPassword}
                  disabled={updating}
                  className="w-full px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 disabled:opacity-50 text-sm"
                >
                  Reset Password (Send Email)
                </button>
                <button
                  onClick={handleToggleStatus}
                  disabled={updating}
                  className={`w-full px-4 py-2 rounded-lg font-medium disabled:opacity-50 text-sm ${
                    admin.isActive
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {admin.isActive ? "Deactivate" : "Reactivate"} Admin
                </button>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-4">Account Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-600">Account ID:</span>
                  <div className="font-medium font-mono text-xs">{admin.id}</div>
                </div>
                <div>
                  <span className="text-neutral-600">Status:</span>
                  <div className="font-medium">
                    <span className={`px-2 py-1 rounded text-xs ${
                      admin.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {admin.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-neutral-600">Role:</span>
                  <div className="font-medium">
                    <span className={`px-2 py-1 rounded text-xs ${
                      admin.role === "SUPER_ADMIN" 
                        ? "bg-purple-100 text-purple-700" 
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {admin.role === "SUPER_ADMIN" ? "Super Admin" : "Staff Admin"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

