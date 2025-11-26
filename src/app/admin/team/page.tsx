"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Star,
  CheckSquare,
  Square,
  ChevronDown,
  Image as ImageIcon,
  Mail,
  Phone,
  MoreVertical,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getMediaProxyUrl } from "@/lib/media";
import Image from "next/image";

interface TeamMember {
  id: string;
  name: string;
  title?: string | null;
  slug?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  photoKey?: string | null;
  photoUrl?: string | null;
  resumeKey?: string | null;
  resumeUrl?: string | null;
  socialLinks?: any;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<string | null>(null);
  const [isFeaturedFilter, setIsFeaturedFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.append("search", search);
      if (isActiveFilter !== null) params.append("isActive", isActiveFilter);
      if (isFeaturedFilter !== null) params.append("isFeatured", isFeaturedFilter);

      const response = await fetch(`/api/admin/team?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.items || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, isActiveFilter, isFeaturedFilter]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTeamMembers();
    }
  }, [status, fetchTeamMembers]);

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;

    try {
      const response = await fetch("/api/admin/team/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: bulkAction,
          ids: Array.from(selectedIds),
        }),
      });

      if (response.ok) {
        setSelectedIds(new Set());
        setBulkAction("");
        fetchTeamMembers();
      }
    } catch (error) {
      console.error("Error performing bulk action:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team member?")) return;

    try {
      const response = await fetch(`/api/admin/team/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTeamMembers();
      }
    } catch (error) {
      console.error("Error deleting team member:", error);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === teamMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(teamMembers.map((tm) => tm.id)));
    }
  };

  if (status === "loading" || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Team Members</h1>
            <p className="text-neutral-600 mt-1">Manage your team members</p>
          </div>
          <Link
            href="/admin/team/new"
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            <span>Add Team Member</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, title, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <Filter size={20} />
              <span>Filters</span>
              <ChevronDown
                size={16}
                className={`transform transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-neutral-200 flex items-center space-x-4">
              <select
                value={isActiveFilter || ""}
                onChange={(e) => setIsActiveFilter(e.target.value || null)}
                className="px-4 py-2 border border-neutral-300 rounded-lg"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <select
                value={isFeaturedFilter || ""}
                onChange={(e) => setIsFeaturedFilter(e.target.value || null)}
                className="px-4 py-2 border border-neutral-300 rounded-lg"
              >
                <option value="">All Featured</option>
                <option value="true">Featured</option>
                <option value="false">Not Featured</option>
              </select>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-200 flex items-center space-x-4">
              <span className="text-sm text-neutral-600">
                {selectedIds.size} selected
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-4 py-2 border border-neutral-300 rounded-lg"
              >
                <option value="">Bulk Actions</option>
                <option value="delete">Delete</option>
                <option value="feature">Feature</option>
                <option value="unfeature">Unfeature</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button onClick={toggleSelectAll} className="flex items-center">
                      {selectedIds.size === teamMembers.length ? (
                        <CheckSquare size={20} className="text-primary-600" />
                      ) : (
                        <Square size={20} className="text-neutral-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Photo</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Title</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Featured</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Sort Order</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelect(member.id)}>
                        {selectedIds.has(member.id) ? (
                          <CheckSquare size={20} className="text-primary-600" />
                        ) : (
                          <Square size={20} className="text-neutral-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {member.photoUrl || member.photoKey ? (
                        <div className="w-12 h-12 relative rounded-full overflow-hidden bg-neutral-100">
                          <Image
                            src={member.photoUrl || getMediaProxyUrl(member.photoKey!)}
                            alt={member.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                          <ImageIcon size={20} className="text-neutral-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-900">{member.name}</div>
                    </td>
                    <td className="px-6 py-4 text-neutral-600">{member.title || "-"}</td>
                    <td className="px-6 py-4">
                      {member.email ? (
                        <a href={`mailto:${member.email}`} className="text-primary-600 hover:text-primary-700 flex items-center space-x-1">
                          <Mail size={14} />
                          <span>{member.email}</span>
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {member.isFeatured ? (
                        <Star size={20} className="text-yellow-500 fill-yellow-500" />
                      ) : (
                        <Star size={20} className="text-neutral-300" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-600">{member.sortOrder}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/admin/team/${member.id}`}
                          className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-neutral-100 rounded transition-colors"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-neutral-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
              >
                Previous
              </button>
              <span className="text-sm text-neutral-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-neutral-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

