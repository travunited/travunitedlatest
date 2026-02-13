"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Link from "next/link";

interface Career {
    id: string;
    title: string;
    location: string;
    type: string;
    department: string;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

interface FormData {
    title: string;
    location: string;
    type: string;
    department: string;
    description: string;
    isActive: boolean;
    sortOrder: number;
}

function ManageCareersPageContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [positions, setPositions] = useState<Career[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>({
        title: "",
        location: "",
        type: "Full-time",
        department: "",
        description: "",
        isActive: true,
        sortOrder: 0,
    });

    const fetchPositions = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/admin/careers/positions");
            if (response.ok) {
                const data = await response.json();
                setPositions(data);
            }
        } catch (error) {
            console.error("Error fetching positions:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated") {
            const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
            if (!isSuperAdmin) {
                router.push("/admin");
            } else {
                fetchPositions();
            }
        }
    }, [session, status, router, fetchPositions]);

    const handleOpenModal = (position?: Career) => {
        if (position) {
            setEditingId(position.id);
            setFormData({
                title: position.title,
                location: position.location,
                type: position.type,
                department: position.department,
                description: position.description || "",
                isActive: position.isActive,
                sortOrder: position.sortOrder,
            });
        } else {
            setEditingId(null);
            setFormData({
                title: "",
                location: "",
                type: "Full-time",
                department: "",
                description: "",
                isActive: true,
                sortOrder: positions.length,
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({
            title: "",
            location: "",
            type: "Full-time",
            department: "",
            description: "",
            isActive: true,
            sortOrder: 0,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const url = editingId
                ? `/api/admin/careers/positions/${editingId}`
                : "/api/admin/careers/positions";
            const method = editingId ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                await fetchPositions();
                handleCloseModal();
            } else {
                const error = await response.json();
                alert(error.error || "Failed to save position");
            }
        } catch (error) {
            console.error("Error saving position:", error);
            alert("An error occurred while saving");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/careers/positions/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                await fetchPositions();
                setDeleteConfirm(null);
            } else {
                const error = await response.json();
                alert(error.error || "Failed to delete position");
            }
        } catch (error) {
            console.error("Error deleting position:", error);
            alert("An error occurred while deleting");
        }
    };

    const handleToggleActive = async (position: Career) => {
        try {
            const response = await fetch(`/api/admin/careers/positions/${position.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !position.isActive }),
            });

            if (response.ok) {
                await fetchPositions();
            }
        } catch (error) {
            console.error("Error toggling active status:", error);
        }
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

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Link
                            href="/admin/careers"
                            className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-2 text-sm"
                        >
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Applications
                        </Link>
                        <h1 className="text-3xl font-bold text-neutral-900">Manage Career Positions</h1>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                    >
                        <Plus size={18} />
                        <span>Add Position</span>
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-medium border border-neutral-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b border-neutral-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                                        Position
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                                        Location
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                                        Department
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                                        Sort Order
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-neutral-700 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-neutral-200">
                                {positions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                                            No positions found. Click &quot;Add Position&quot; to create one.
                                        </td>
                                    </tr>
                                ) : (
                                    positions.map((position) => (
                                        <tr key={position.id} className="hover:bg-neutral-50">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-neutral-900">{position.title}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-neutral-900">{position.location}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-neutral-900">{position.type}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-neutral-900">{position.department}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggleActive(position)}
                                                    className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${position.isActive
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-neutral-100 text-neutral-700"
                                                        }`}
                                                >
                                                    {position.isActive ? (
                                                        <>
                                                            <Eye size={12} />
                                                            <span>Active</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <EyeOff size={12} />
                                                            <span>Inactive</span>
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-neutral-900">{position.sortOrder}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => handleOpenModal(position)}
                                                        className="text-primary-600 hover:text-primary-900 p-1"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    {deleteConfirm === position.id ? (
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => handleDelete(position.id)}
                                                                className="text-red-600 hover:text-red-900 text-xs font-medium"
                                                            >
                                                                Confirm
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirm(null)}
                                                                className="text-neutral-600 hover:text-neutral-900 text-xs font-medium"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setDeleteConfirm(position.id)}
                                                            className="text-red-600 hover:text-red-900 p-1"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-black/50"
                            onClick={() => !submitting && handleCloseModal()}
                        ></div>
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full">
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-neutral-900 mb-6">
                                    {editingId ? "Edit Position" : "Add New Position"}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                                Position Title <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                                Location <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.location}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                                Type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={formData.type}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                                                required
                                            >
                                                <option value="Full-time">Full-time</option>
                                                <option value="Part-time">Part-time</option>
                                                <option value="Contract">Contract</option>
                                                <option value="Part-time / Contract">Part-time / Contract</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                                Department <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.department}
                                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                                className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                                Sort Order
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.sortOrder}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
                                                }
                                                className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                                            />
                                        </div>
                                        <div className="flex items-center">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isActive}
                                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                    className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                                                />
                                                <span className="text-sm font-medium text-neutral-700">Active</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                                            placeholder="Additional details about the position..."
                                        />
                                    </div>
                                    <div className="flex space-x-3 pt-4">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                                        >
                                            {submitting ? "Saving..." : editingId ? "Update Position" : "Create Position"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            disabled={submitting}
                                            className="px-6 py-3 border border-neutral-300 rounded-lg font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default function ManageCareersPage() {
    return <ManageCareersPageContent />;
}
