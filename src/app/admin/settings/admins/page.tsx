"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Edit, Shield, Mail, Calendar, CheckCircle, X, Eye, ArrowRight } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";
import { TextInput, SelectInput, CheckboxInput } from "@/components/admin/MemoizedInputs";

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
  stats?: {
    applicationsHandled: number;
    bookingsHandled: number;
    lastActive: string | null;
  };
}

export default function AdminManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "STAFF_ADMIN" as "STAFF_ADMIN" | "SUPER_ADMIN",
    password: "",
    generatePassword: true,
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    role: "STAFF_ADMIN" as "STAFF_ADMIN" | "SUPER_ADMIN",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
      if (!isSuperAdmin) {
        router.push("/admin");
      } else {
        fetchAdmins();
      }
    }
  }, [session, status, router]);

  const fetchAdmins = async () => {
    try {
      const response = await fetch("/api/admin/settings/admins");
      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/settings/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setCreateForm({
          name: "",
          email: "",
          role: "STAFF_ADMIN",
          password: "",
          generatePassword: true,
        });
        await fetchAdmins();
        alert("Admin created successfully");
      } else {
        alert("Failed to create admin");
      }
    } catch (error) {
      alert("An error occurred");
    }
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      const response = await fetch(`/api/admin/settings/admins/${selectedAdmin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedAdmin(null);
        await fetchAdmins();
        alert("Admin updated successfully");
      } else {
        alert("Failed to update admin");
      }
    } catch (error) {
      alert("An error occurred");
    }
  };

  const handleResetPassword = async (adminId: string) => {
    if (!confirm("Send password reset email to this admin?")) return;

    try {
      const response = await fetch(`/api/admin/settings/admins/${adminId}/reset-password`, {
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

  const handleToggleStatus = async (adminId: string, currentStatus: boolean) => {
    const action = currentStatus ? "deactivate" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} this admin?`)) return;

    try {
      const response = await fetch(`/api/admin/settings/admins/${adminId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await fetchAdmins();
        alert(`Admin ${action}d successfully`);
      } else {
        alert("Failed to update admin status");
      }
    } catch (error) {
      alert("An error occurred");
    }
  };

  const updateCreateForm = useCallback((field: keyof typeof createForm, value: string | boolean) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateEditForm = useCallback((field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const openEditModal = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      name: admin.name || "",
      role: admin.role as "STAFF_ADMIN" | "SUPER_ADMIN",
    });
    setShowEditModal(true);
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

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Team Members</h1>
            <p className="text-neutral-600 mt-1">Manage team members and admin accounts</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            <span>Create Admin</span>
          </button>
        </div>

        {/* Admins Table */}
        {admins.length > 0 ? (
          <div className="bg-white rounded-lg shadow-medium border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Applications Handled</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Bookings Handled</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <Shield size={20} className="text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-neutral-900">{admin.name || "N/A"}</div>
                            <div className="text-sm text-neutral-500">{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          admin.role === "SUPER_ADMIN" 
                            ? "bg-purple-100 text-purple-700" 
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {admin.role === "SUPER_ADMIN" ? "Super Admin" : "Staff Admin"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          admin.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {admin.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {admin.stats?.applicationsHandled || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {admin.stats?.bookingsHandled || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {admin.lastLogin ? formatDate(admin.lastLogin) : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/admin/settings/admins/${admin.id}`}
                            className="text-primary-600 hover:text-primary-900 inline-flex items-center space-x-1"
                          >
                            <Eye size={16} />
                            <span>View</span>
                          </Link>
                          <button
                            onClick={() => openEditModal(admin)}
                            className="text-neutral-600 hover:text-neutral-900 inline-flex items-center space-x-1"
                          >
                            <Edit size={16} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <Shield size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600">No admins found</p>
          </div>
        )}

        {/* Create Admin Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-large p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">Create New Admin</h2>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Name</label>
                  <TextInput
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(value) => updateCreateForm("name", value)}
                    className="w-full px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
                  <TextInput
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(value) => updateCreateForm("email", value)}
                    className="w-full px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Role</label>
                  <SelectInput
                    value={createForm.role}
                    onChange={(value) => updateCreateForm("role", value as "STAFF_ADMIN" | "SUPER_ADMIN")}
                    className="w-full px-4 py-2"
                  >
                    <option value="STAFF_ADMIN">Staff Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </SelectInput>
                </div>
                <div>
                  <label className="flex items-center space-x-2 mb-2">
                    <CheckboxInput
                      checked={createForm.generatePassword}
                      onChange={(checked) => updateCreateForm("generatePassword", checked)}
                      className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-neutral-700">Auto-generate temporary password</span>
                  </label>
                  {!createForm.generatePassword && (
                    <TextInput
                      type="password"
                      required={!createForm.generatePassword}
                      value={createForm.password}
                      onChange={(value) => updateCreateForm("password", value)}
                      className="w-full px-4 py-2 mt-2"
                      placeholder="Enter password"
                    />
                  )}
                </div>
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                  >
                    Create Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Admin Modal */}
        {showEditModal && selectedAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-large p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">Edit Admin</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={selectedAdmin.email}
                    disabled
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Name</label>
                  <TextInput
                    type="text"
                    value={editForm.name}
                    onChange={(value) => updateEditForm("name", value)}
                    className="w-full px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Role</label>
                  <SelectInput
                    value={editForm.role}
                    onChange={(value) => updateEditForm("role", value)}
                    className="w-full px-4 py-2"
                  >
                    <option value="STAFF_ADMIN">Staff Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </SelectInput>
                </div>
                <div className="pt-4 space-y-2">
                  <button
                    onClick={() => handleResetPassword(selectedAdmin.id)}
                    className="w-full px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200"
                  >
                    Reset Password (Send Email)
                  </button>
                  <button
                    onClick={() => handleToggleStatus(selectedAdmin.id, selectedAdmin.isActive)}
                    className={`w-full px-4 py-2 rounded-lg font-medium ${
                      selectedAdmin.isActive
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {selectedAdmin.isActive ? "Deactivate" : "Reactivate"} Admin
                  </button>
                </div>
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedAdmin(null);
                    }}
                    className="px-4 py-2 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditAdmin}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
