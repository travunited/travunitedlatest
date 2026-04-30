"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Bell, Check, CheckCheck } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch unread count only (lightweight, for badge)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread-count");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  // Fetch full notifications list (only when dropdown opens)
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications?limit=10&unreadOnly=false");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count on mount and poll every 60 seconds (lightweight)
  useEffect(() => {
    if (session?.user?.id) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000); // 60 seconds
      return () => clearInterval(interval);
    }
  }, [session?.user?.id, fetchUnreadCount]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
          )
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
          prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
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

  if (!session?.user?.id) {
    return null;
  }

  return (
    <div className="relative">
      <button
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
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40 cursor-pointer"
              onPointerDown={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-large border border-neutral-200 z-50 max-h-[500px] overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-semibold text-lg">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="p-8 text-center text-neutral-500">
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500">
                    No new notifications
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 transition-colors ${
                          !notification.readAt ? "bg-blue-50/50 active:bg-blue-100" : "hover:bg-neutral-50 active:bg-neutral-100"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            {notification.link ? (
                              <Link
                                href={notification.link}
                                onClick={() => {
                                  markAsRead(notification.id);
                                  setIsOpen(false);
                                }}
                                className="block"
                              >
                                <p className="font-medium text-sm text-neutral-900">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-neutral-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-neutral-400 mt-1">
                                  {formatDistanceToNow(
                                    new Date(notification.createdAt),
                                    { addSuffix: true }
                                  )}
                                </p>
                              </Link>
                            ) : (
                              <div>
                                <p className="font-medium text-sm text-neutral-900">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-neutral-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-neutral-400 mt-1">
                                  {formatDistanceToNow(
                                    new Date(notification.createdAt),
                                    { addSuffix: true }
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                          {!notification.readAt && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-primary-600 transition-colors"
                              aria-label="Mark as read"
                            >
                              <Check size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-neutral-200 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
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

