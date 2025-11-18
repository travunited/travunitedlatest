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
  DollarSign,
  Clock,
  TrendingUp,
} from "lucide-react";

const BASE_MENU_ITEMS = [
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

const CONTENT_MENU_ITEMS = [
  { label: "Countries", href: "/admin/content/countries", icon: Globe },
  { label: "Visas", href: "/admin/content/visas", icon: FileText },
  { label: "Tours", href: "/admin/content/tours", icon: BookOpen },
  { label: "Blog", href: "/admin/content/blog", icon: FolderOpen },
];

const REPORTS_MENU_ITEMS = [
  { label: "Overview", href: "/admin/reports", icon: BarChart3 },
  { label: "Revenue Summary", href: "/admin/reports/finance/revenue", icon: DollarSign },
  { label: "Payments & Refunds", href: "/admin/reports/finance/payments", icon: FileText },
  { label: "Visa Applications", href: "/admin/reports/visas/summary", icon: FileText },
  { label: "Country-wise Visas", href: "/admin/reports/visas/by-country", icon: Globe },
  { label: "Visa Type Performance", href: "/admin/reports/visas/performance", icon: TrendingUp },
  { label: "Tour Bookings", href: "/admin/reports/tours/summary", icon: Calendar },
  { label: "Tour Performance", href: "/admin/reports/tours/performance", icon: BarChart3 },
  { label: "Customers", href: "/admin/reports/customers", icon: Users },
  { label: "Corporate Leads", href: "/admin/reports/corporate", icon: Users },
  { label: "Admin Performance", href: "/admin/reports/admin/performance", icon: Shield },
  { label: "SLA & Turnaround", href: "/admin/reports/admin/sla", icon: Clock },
  { label: "Audit Log", href: "/admin/reports/system/audit", icon: FileSearch },
];

const SETTINGS_MENU_ITEMS = [
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
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function SidebarNavigation({
  session,
  pathname,
  isSuperAdmin,
  expandedMenus,
  toggleMenu,
  onNavigate,
}: {
  session: ReturnType<typeof useSession>["data"];
  pathname: string;
  isSuperAdmin: boolean;
  expandedMenus: { content: boolean; settings: boolean; reports: boolean };
  toggleMenu: (menu: "content" | "settings" | "reports") => void;
  onNavigate?: () => void;
}) {
  const visibleMenuItems = BASE_MENU_ITEMS.filter((item) =>
    item.roles?.some(
      (role) =>
        role === session?.user?.role ||
        (session?.user?.role === "SUPER_ADMIN" && role === "STAFF_ADMIN")
    )
  );

  const visibleSettingsItems = isSuperAdmin
    ? SETTINGS_MENU_ITEMS
    : SETTINGS_MENU_ITEMS.filter((item) => item.roles?.includes("STAFF_ADMIN"));

  const visibleReportsItems = isSuperAdmin ? REPORTS_MENU_ITEMS : [];

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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

        {isSuperAdmin && (
          <>
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
              <AnimatePresence initial={false}>
                {expandedMenus.content && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-11 pt-1 space-y-1">
                      {CONTENT_MENU_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
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

            <div className="mt-4">
              <button
                onClick={() => toggleMenu("reports")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-colors ${
                  expandedMenus.reports || pathname.startsWith("/admin/reports")
                    ? "bg-primary-50 text-primary-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <BarChart3 size={20} />
                  <span>Reports</span>
                </div>
                {expandedMenus.reports ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
              <AnimatePresence initial={false}>
                {expandedMenus.reports && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-11 pt-1 space-y-1 max-h-96 overflow-y-auto">
                      {visibleReportsItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
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
          </>
        )}

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
          <AnimatePresence initial={false}>
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
                        onClick={onNavigate}
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

      <div className="p-4 border-t border-neutral-200">
        <div className="text-xs text-neutral-500 mb-2">Logged in as</div>
        <div className="text-sm font-medium text-neutral-900">
          {session?.user?.name || session?.user?.email}
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          {isSuperAdmin ? "Super Admin" : "Staff Admin"}
        </div>
      </div>
    </>
  );
}

export function AdminSidebar({ isOpen, onClose }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [expandedMenus, setExpandedMenus] = useState({
    content: pathname.startsWith("/admin/content"),
    settings: pathname.startsWith("/admin/settings"),
    reports: pathname.startsWith("/admin/reports"),
  });

  const toggleMenu = (menu: "content" | "settings" | "reports") => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  return (
    <>
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

      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : "-100%",
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 h-full w-64 bg-white border-r border-neutral-200 z-50 lg:hidden flex flex-col"
      >
        <div className="flex items-center justify-end p-4 border-b border-neutral-200">
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
          >
            <X size={20} />
          </button>
        </div>

        <SidebarNavigation
          session={session}
          pathname={pathname}
          isSuperAdmin={isSuperAdmin}
          expandedMenus={expandedMenus}
          toggleMenu={toggleMenu}
          onNavigate={onClose}
        />
      </motion.aside>
    </>
  );
}

export function AdminSidebarStatic() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [expandedMenus, setExpandedMenus] = useState({
    content: pathname.startsWith("/admin/content"),
    settings: pathname.startsWith("/admin/settings"),
    reports: pathname.startsWith("/admin/reports"),
  });

  const toggleMenu = (menu: "content" | "settings" | "reports") => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  return (
    <aside className="h-full w-64 bg-white border-r border-neutral-200 flex flex-col">
      <SidebarNavigation
        session={session}
        pathname={pathname}
        isSuperAdmin={isSuperAdmin}
        expandedMenus={expandedMenus}
        toggleMenu={toggleMenu}
      />
    </aside>
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

