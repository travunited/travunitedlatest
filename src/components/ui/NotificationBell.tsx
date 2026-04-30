"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, CheckCheck, X, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Fetch unread count only (lightweight, for badge)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  // Fetch full notifications list (only when dropdown opens)
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10&unreadOnly=false");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch unread count on mount and poll every 60 seconds (lightweight)
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        // Refresh unread count after marking as read
        fetchUnreadCount();
      } else {
        console.error("Failed to mark notification as read");
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date() }))
        );
        setUnreadCount(0);
        // Refresh unread count after marking all as read
        fetchUnreadCount();
      } else {
        console.error("Failed to mark all notifications as read");
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
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
    if (type.includes("VISA")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (type.includes("TOUR")) return "bg-green-100 text-green-700 border-green-200";
    if (type.includes("PAYMENT")) return "bg-purple-100 text-purple-700 border-purple-200";
    if (type.includes("ADMIN")) return "bg-orange-100 text-orange-700 border-orange-200";
    if (type.includes("ACCOUNT")) return "bg-red-100 text-red-700 border-red-200";
    return "bg-neutral-100 text-neutral-700 border-neutral-200";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => {
          const wasOpen = isOpen;
          setIsOpen(!wasOpen);
          if (!wasOpen) {
            // Fetch notifications when opening dropdown
            fetchNotifications();
          }
        }}
        className="relative min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-700 hover:text-primary-600 transition-colors"
        aria-label="Notifications"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 z-40"
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-2xl border border-neutral-200 z-50 max-h-[500px] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-primary-50 to-white">
                <div className="flex items-center space-x-2">
                  <Bell size={18} className="text-primary-600" />
                  <h3 className="font-semibold text-neutral-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllAsRead();
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 hover:bg-primary-50 rounded transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-neutral-100 rounded transition-colors"
                  >
                    <X size={16} className="text-neutral-500" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="p-8 text-center text-neutral-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-2 text-sm">Loading...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500">
                    <Bell size={32} className="mx-auto mb-2 text-neutral-300" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {notifications.slice(0, 10).map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 hover:bg-neutral-50 cursor-pointer transition-colors ${
                          !notification.readAt ? "bg-blue-50/50 border-l-4 border-primary-500" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`text-xl flex-shrink-0 p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p
                                  className={`text-sm font-medium ${
                                    !notification.readAt
                                      ? "text-neutral-900 font-semibold"
                                      : "text-neutral-700"
                                  }`}
                                >
                                  {notification.title}
                                </p>
                                <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-neutral-400 mt-2">
                                  {formatDistanceToNow(new Date(notification.createdAt), {
                                    addSuffix: true,
                                  })}
                                </p>
                              </div>
                              {!notification.readAt && (
                                <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-neutral-200 bg-neutral-50">
                <Link
                  href="/notifications"
                  className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2 hover:bg-primary-50 rounded transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
