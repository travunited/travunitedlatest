"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Filter, Calendar, User, FileText, Plane, Shield, Settings, Search } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface AuditLog {
  id: string;
  timestamp: string;
  adminUser: {
    id: string;
    name: string | null;
    email: string;
  };
  entityType: string;
  entityId: string;
  action: string;
  description: string;
}

export default function AuditLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Array<{ id: string; name: string | null; email: string }>>([]);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<string>("ALL");
  const [actionType, setActionType] = useState<string>("ALL");
  const [entityType, setEntityType] = useState<string>("ALL");

  const fetchAdmins = async () => {
    try {
      const response = await fetch("/api/admin/settings/admins");
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.map((a: any) => ({ id: a.id, name: a.name, email: a.email })));
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    }
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (selectedAdmin !== "ALL") params.append("adminId", selectedAdmin);
      if (actionType !== "ALL") params.append("action", actionType);
      if (entityType !== "ALL") params.append("entityType", entityType);

      const response = await fetch(`/api/admin/settings/audit?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedAdmin, actionType, entityType]);

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

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "SUPER_ADMIN") {
      fetchLogs();
    }
  }, [status, session?.user?.role, fetchLogs]);

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "APPLICATION":
        return <FileText size={16} className="text-blue-600" />;
      case "BOOKING":
        return <Plane size={16} className="text-green-600" />;
      case "USER":
        return <User size={16} className="text-purple-600" />;
      case "ADMIN":
        return <Shield size={16} className="text-orange-600" />;
      case "SETTINGS":
        return <Settings size={16} className="text-neutral-600" />;
      default:
        return <FileText size={16} className="text-neutral-400" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("APPROVE")) return "bg-green-100 text-green-700";
    if (action.includes("DELETE") || action.includes("REJECT")) return "bg-red-100 text-red-700";
    if (action.includes("UPDATE") || action.includes("CHANGE")) return "bg-blue-100 text-blue-700";
    return "bg-neutral-100 text-neutral-700";
  };

  // Only show full-page loader on initial load (no logs and loading)
  const isInitialLoad = loading && logs.length === 0;

  if (isInitialLoad) {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Audit Log</h1>
          <p className="text-neutral-600 mt-1">Track all system actions and changes</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter size={20} className="text-neutral-600" />
            <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Admin</label>
              <select
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Admins</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name || admin.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Action Type</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="STATUS_CHANGE">Status Change</option>
                <option value="DOC_VERIFY">Document Verify</option>
                <option value="DOC_REJECT">Document Reject</option>
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
                <option value="HIDE">Hide</option>
                <option value="RESET_PASSWORD">Reset Password</option>
                <option value="DEACTIVATE">Deactivate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Entities</option>
                <option value="APPLICATION">Visa Application</option>
                <option value="BOOKING">Tour Booking</option>
                <option value="USER">Customer</option>
                <option value="ADMIN">Admin</option>
                <option value="SETTINGS">Settings</option>
                <option value="REVIEW">Review</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className={loading && logs.length > 0 ? "opacity-50 pointer-events-none transition-opacity" : ""}>
          {logs.length > 0 ? (
            <div className="bg-white rounded-lg shadow-medium border border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Admin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Entity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                          <div className="flex items-center space-x-1">
                            <Calendar size={14} className="text-neutral-400" />
                            <span suppressHydrationWarning>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <User size={16} className="text-neutral-400" />
                            <div>
                              <div className="text-sm font-medium text-neutral-900">{log.adminUser.name || "N/A"}</div>
                              <div className="text-xs text-neutral-500">{log.adminUser.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getEntityIcon(log.entityType)}
                            <span className="text-sm text-neutral-900">{log.entityType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-700">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
              <Search size={48} className="text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-600">No audit log entries found</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
