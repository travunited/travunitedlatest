"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { Bell, Check, CheckCheck, Filter, Search, Trash2, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  data: any;
  readAt: Date | null;
  createdAt: Date;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        filter,
        unreadOnly: unreadOnly.toString(),
        page: page.toString(),
        limit: "20",
      });
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, unreadOnly, page, searchQuery]);

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }
    fetchNotifications();
  }, [session, router, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, readAt: new Date() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read-all" }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-selected",
          notificationIds: Array.from(selectedIds),
        }),
      });
      setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
      fetchNotifications();
    } catch (error) {
      console.error("Error deleting notifications:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (isSelectMode) {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(notification.id)) {
          newSet.delete(notification.id);
        } else {
          newSet.add(notification.id);
        }
        return newSet;
      });
      return;
    }

    if (!notification.readAt) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes("VISA")) return "🛂";
    if (type.includes("TOUR")) return "✈️";
    if (type.includes("PAYMENT")) return "💳";
    if (type.includes("ADMIN")) return "⚙️";
    if (type.includes("ACCOUNT")) return "🔒";
    return "🔔";
  };

  const getNotificationColor = (type: string) => {
    if (type.includes("VISA")) return "bg-blue-100 text-blue-700";
    if (type.includes("TOUR")) return "bg-green-100 text-green-700";
    if (type.includes("PAYMENT")) return "bg-purple-100 text-purple-700";
    if (type.includes("ADMIN")) return "bg-orange-100 text-orange-700";
    if (type.includes("ACCOUNT")) return "bg-red-100 text-red-700";
    return "bg-neutral-100 text-neutral-700";
  };

  const getFilterLabel = (filter: string) => {
    const labels: Record<string, string> = {
      all: "All",
      visa: "Visas",
      tour: "Tours",
      payment: "Payments",
      system: "System",
    };
    return labels[filter] || filter;
  };

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const groups: Record<string, Notification[]> = {};
    notifications.forEach((notification) => {
      const date = new Date(notification.createdAt);
      let key: string;
      if (isToday(date)) {
        key = "Today";
      } else if (isYesterday(date)) {
        key = "Yesterday";
      } else if (isThisWeek(date)) {
        key = "This Week";
      } else if (isThisMonth(date)) {
        key = "This Month";
      } else {
        key = format(date, "MMMM yyyy");
      }
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(notification);
    });
    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-soft border border-neutral-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-sm text-neutral-600 mt-1">
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {isSelectMode && selectedIds.size > 0 && (
                <button
                  onClick={deleteSelected}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Delete ({selectedIds.size})</span>
                </button>
              )}
              {!isSelectMode && unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <CheckCheck size={16} />
                  <span>Mark all as read</span>
                </button>
              )}
              <button
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedIds(new Set());
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isSelectMode
                    ? "bg-primary-600 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {isSelectMode ? "Cancel" : "Select"}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-neutral-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-neutral-600"
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center space-x-4 overflow-x-auto" style={{ touchAction: "pan-x" }}>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Filter size={16} className="text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700">Filter:</span>
            </div>
            {["all", "visa", "tour", "payment", "system"].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`px-4 py-2 min-h-[44px] text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === f
                    ? "bg-primary-600 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {getFilterLabel(f)}
              </button>
            ))}
            <button
              onClick={() => {
                setUnreadOnly(!unreadOnly);
                setPage(1);
              }}
              className={`ml-auto px-4 py-2 min-h-[44px] text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                unreadOnly
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              Unread only
            </button>
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-neutral-100">
            {isLoading ? (
              <div className="p-12 text-center text-neutral-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell size={48} className="mx-auto mb-4 text-neutral-300" />
                <p className="text-neutral-600">
                  {searchQuery
                    ? "No notifications found"
                    : unreadOnly
                    ? "No unread notifications"
                    : "No notifications yet"}
                </p>
              </div>
            ) : (
              Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
                <div key={dateGroup} className="py-4">
                  <div className="px-6 py-2">
                    <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      {dateGroup}
                    </h3>
                  </div>
                  {groupNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer  ${
                        !notification.readAt ? "bg-blue-50/30" : ""
                      } ${selectedIds.has(notification.id) ? "bg-primary-50" : ""}`}
                      onClick={() => handleNotificationClick(notification)}
                      style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                      <div className="flex items-start space-x-4">
                        {isSelectMode && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(notification.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelect(notification.id);
                            }}
                            className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                          />
                        )}
                        <span className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3
                                  className={`text-base font-semibold ${
                                    !notification.readAt
                                      ? "text-neutral-900"
                                      : "text-neutral-700"
                                  }`}
                                >
                                  {notification.title}
                                </h3>
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${getNotificationColor(
                                    notification.type
                                  )}`}
                                >
                                  {notification.type.split("_")[0]}
                                </span>
                              </div>
                              <p className="text-sm text-neutral-600 mt-1">
                                {notification.message}
                              </p>
                              {notification.data && (
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
                                  {notification.data.applicationId && (
                                    <span className="px-2 py-1 bg-neutral-100 rounded">
                                      App: {notification.data.applicationId.slice(0, 8)}
                                    </span>
                                  )}
                                  {notification.data.bookingId && (
                                    <span className="px-2 py-1 bg-neutral-100 rounded">
                                      Booking: {notification.data.bookingId.slice(0, 8)}
                                    </span>
                                  )}
                                  {notification.data.amount && (
                                    <span className="px-2 py-1 bg-neutral-100 rounded">
                                      ₹{Number(notification.data.amount).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              {!isSelectMode && !notification.readAt && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-neutral-200 rounded-lg transition-colors"
                                  aria-label="Mark as read"
                                >
                                  <Check size={18} className="text-neutral-600" />
                                </button>
                              )}
                              {!isSelectMode && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors"
                                  aria-label="Delete"
                                >
                                  <Trash2 size={16} className="text-neutral-400 hover:text-red-600" />
                                </button>
                              )}
                              {notification.link && !isSelectMode && (
                                <ChevronRight size={18} className="text-neutral-400" />
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-neutral-400 mt-3">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-neutral-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
