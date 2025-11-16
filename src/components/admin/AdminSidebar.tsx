"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  MessageSquare,
  Users,
  Settings,
  FolderOpen,
  Globe,
  BookOpen,
  Shield,
  FileSearch,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [expandedMenus, setExpandedMenus] = useState<{
    content: boolean;
    settings: boolean;
  }>({
    content: pathname.startsWith("/admin/content"),
    settings: pathname.startsWith("/admin/settings"),
  });

  const toggleMenu = (menu: "content" | "settings") => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/");
  };

  const menuItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      roles: ["STAFF_ADMIN", "SUPER_ADMIN"],
    },
    {
      label: "Visa Applications",
      href: "/admin/applications",
      icon: FileText,
      roles: ["STAFF_ADMIN", "SUPER_ADMIN"],
    },
    {
      label: "Tour Bookings",
      href: "/admin/bookings",
      icon: Calendar,
      roles: ["STAFF_ADMIN", "SUPER_ADMIN"],
    },
    {
      label: "Reviews",
      href: "/admin/reviews",
      icon: MessageSquare,
      roles: ["STAFF_ADMIN", "SUPER_ADMIN"],
    },
    {
      label: "Customers",
      href: "/admin/customers",
      icon: Users,
      roles: ["STAFF_ADMIN", "SUPER_ADMIN"],
    },
  ];

  const contentMenuItems = [
    {
      label: "Countries",
      href: "/admin/content/countries",
      icon: Globe,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Visas",
      href: "/admin/content/visas",
      icon: FileText,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Tours",
      href: "/admin/content/tours",
      icon: BookOpen,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Blog",
      href: "/admin/content/blog",
      icon: FolderOpen,
      roles: ["SUPER_ADMIN"],
    },
  ];

  const settingsMenuItems = [
    {
      label: "General Settings",
      href: "/admin/settings/general",
      icon: Settings,
      roles: ["STAFF_ADMIN", "SUPER_ADMIN"],
    },
    {
      label: "Admin Management",
      href: "/admin/settings/admins",
      icon: Shield,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Audit Log",
      href: "/admin/settings/audit",
      icon: FileSearch,
      roles: ["SUPER_ADMIN"],
    },
    {
      label: "Reports",
      href: "/admin/settings/reports",
      icon: BarChart3,
      roles: ["SUPER_ADMIN"],
    },
  ];

  const visibleMenuItems = menuItems.filter((item) =>
    item.roles.some(
      (role) =>
        role === session?.user?.role ||
        (session?.user?.role === "SUPER_ADMIN" && role === "STAFF_ADMIN")
    )
  );

  // For Staff Admin, only show General Settings (read-only)
  // For Super Admin, show all settings
  const visibleSettingsItems = isSuperAdmin
    ? settingsMenuItems
    : settingsMenuItems.filter((item) => item.roles.includes("STAFF_ADMIN"));

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-900/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : "-100%",
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 h-full w-64 bg-white border-r border-neutral-200 z-50 lg:relative lg:translate-x-0 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <Link href="/admin" className="flex items-center space-x-2">
            <div className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              Travunited
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  active
                    ? "bg-primary-50 text-primary-700 border-l-4 border-primary-600"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Content Menu (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="mt-4">
              <button
                onClick={() => toggleMenu("content")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-colors ${
                  expandedMenus.content || pathname.startsWith("/admin/content")
                    ? "bg-primary-50 text-primary-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FolderOpen size={20} />
                  <span>Content</span>
                </div>
                {expandedMenus.content ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
              <AnimatePresence>
                {expandedMenus.content && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-11 pt-1 space-y-1">
                      {contentMenuItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              active
                                ? "bg-primary-50 text-primary-700"
                                : "text-neutral-600 hover:bg-neutral-50"
                            }`}
                          >
                            <Icon size={16} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Settings Menu */}
          <div className="mt-4">
            <button
              onClick={() => toggleMenu("settings")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-colors ${
                expandedMenus.settings || pathname.startsWith("/admin/settings")
                  ? "bg-primary-50 text-primary-700"
                  : "text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Settings size={20} />
                <span>Settings</span>
              </div>
              {expandedMenus.settings ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
            <AnimatePresence>
              {expandedMenus.settings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pl-11 pt-1 space-y-1">
                    {visibleSettingsItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            active
                              ? "bg-primary-50 text-primary-700"
                              : "text-neutral-600 hover:bg-neutral-50"
                          }`}
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200">
          <div className="text-xs text-neutral-500 mb-2">
            Logged in as
          </div>
          <div className="text-sm font-medium text-neutral-900">
            {session?.user?.name || session?.user?.email}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {isSuperAdmin ? "Super Admin" : "Staff Admin"}
          </div>
        </div>
      </motion.aside>
    </>
  );
}

export function AdminSidebarToggle({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
    >
      <Menu size={24} />
    </button>
  );
}

