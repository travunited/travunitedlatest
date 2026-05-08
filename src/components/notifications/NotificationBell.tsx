"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

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
    const handleClickOutside = (event: PointerEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, readAt: new Date() } : n
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

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.readAt) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    } else {
      router.push("/notifications");
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes("VISA")) return "🛂";
    if (type.includes("TOUR")) return "✈️";
    if (type.includes("PAYMENT")) return "💳";
    if (type.includes("ADMIN")) return "⚙️";
    return "🔔";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          const wasOpen = isOpen;
          setIsOpen(!wasOpen);
          if (!wasOpen) {
            // Fetch notifications when opening dropdown
            fetchNotifications();
          }
        }}
        className="relative p-2 text-neutral-700 hover:text-primary-600 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-large border border-neutral-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">Notifications</h3>
            <Link
              href="/notifications"
              className="text-sm text-primary-600 hover:text-primary-700"
              onClick={() => setIsOpen(false)}
            >
              View all
            </Link>
          </div>

          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-neutral-500">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {notifications.map((notification) => (
                  <div key={notification.id} className="relative group/item">
                    <button
                      className={`w-full text-left p-4 transition-colors active:bg-neutral-100 ${
                        !notification.readAt ? "bg-blue-50/50 active:bg-blue-100" : "hover:bg-neutral-50"
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              !notification.readAt
                                ? "text-neutral-900"
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
                        {/* Spacer for the absolute-positioned check button */}
                        {!notification.readAt && <div className="w-10" />}
                      </div>
                    </button>
                    {!notification.readAt && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/80 hover:bg-neutral-200 rounded-full shadow-soft border border-neutral-100 transition-colors z-10"
                        aria-label="Mark as read"
                      >
                        <Check size={14} className="text-neutral-600" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

