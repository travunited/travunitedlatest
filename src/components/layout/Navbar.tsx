"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Menu, X, User, LogOut, Shield,
  Home, FileText, Plane, BookOpen, Building2, HelpCircle, LayoutDashboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { Logo } from "@/components/ui/Logo";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = ["STAFF_ADMIN", "SUPER_ADMIN"].includes(session?.user?.role || "");

  // Close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Handle outside clicks and Escape key
  useEffect(() => {
    const handleEvents = (e: MouseEvent | KeyboardEvent) => {
      // Handle Escape key
      if (e instanceof KeyboardEvent && e.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsOpen(false);
        return;
      }

      // Handle outside click for user menu
      if (e instanceof MouseEvent && isUserMenuOpen) {
        if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
          setIsUserMenuOpen(false);
        }
      }
    };

    document.addEventListener("click", handleEvents);
    document.addEventListener("keydown", handleEvents);
    return () => {
      document.removeEventListener("click", handleEvents);
      document.removeEventListener("keydown", handleEvents);
    };
  }, [isUserMenuOpen]);

  const navLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/visas", label: "Visas", icon: FileText },
    { href: "/holidays", label: "Holidays", icon: Plane },
    { href: "/blog", label: "Blog", icon: BookOpen },
    { href: "/corporate", label: "Corporate", icon: Building2 },
    { href: "/support", label: "Support", icon: HelpCircle },
  ];

  return (
    <>
      {/* ── Nav bar: 64 px top strip only ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            <Link href="/" className="flex items-center space-x-2 shrink-0">
              <Logo priority />
            </Link>

            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center space-x-1.5 font-medium transition-colors duration-200 min-h-[44px] px-3 rounded-lg focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${isActive ? "text-primary-600" : "text-neutral-700 hover:text-primary-600"
                      }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center space-x-4">
              {session ? (
                <>
                  <NotificationBell />
                  <div ref={userMenuRef} className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen((v) => !v)}
                      className="flex items-center space-x-2 text-neutral-700 hover:text-primary-600 font-medium transition-colors min-h-[44px] px-3 rounded-lg focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      aria-haspopup="menu"
                      aria-expanded={isUserMenuOpen}
                      aria-controls="user-menu-desktop-dropdown"
                    >
                      <User size={20} aria-hidden="true" />
                      <span className="max-w-[120px] truncate">
                        {session.user?.name || session.user?.email}
                      </span>
                      {isAdmin && <Shield size={16} className="text-primary-600 shrink-0" aria-hidden="true" />}
                    </button>
                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <motion.div
                          id="user-menu-desktop-dropdown"
                          role="menu"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-large border border-neutral-200 py-2 z-50"
                        >
                          <Link
                            href="/dashboard"
                            role="menuitem"
                            className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Dashboard
                          </Link>
                          {isAdmin && (
                            <Link
                              href="/admin"
                              role="menuitem"
                              className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              Admin Panel
                            </Link>
                          )}
                          <button
                            role="menuitem"
                            onClick={() => {
                              signOut({ callbackUrl: "/" });
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center space-x-2"
                          >
                            <LogOut size={16} />
                            <span>Sign Out</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-neutral-700 hover:text-primary-600 font-medium transition-colors min-h-[44px] flex items-center px-3 rounded-lg focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-primary-600 text-white px-6 py-2 min-h-[44px] rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-soft flex items-center focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: bell + hamburger */}
            <div className="flex md:hidden items-center gap-1">
              {session && <NotificationBell />}
              <button
                onClick={() => setIsOpen((v) => !v)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200"
                aria-label={isOpen ? "Close menu" : "Open menu"}
                aria-expanded={isOpen}
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/*
        ── Mobile drawer ──
        Rendered as a SIBLING of <nav>, NOT inside it.

        iOS Safari drops click events on elements that are children of a
        position:fixed ancestor when any CSS transition is running on that
        ancestor or a sibling within the same stacking context. Moving the
        drawer outside <nav> gives it a completely independent stacking
        context, and using conditional rendering (no CSS transitions) means
        there is no active transition at all when the user taps a link.

        Links have zero event handlers. Next.js navigates on click, the
        pathname changes, and the useEffect above closes the drawer.
      */}
      {isOpen && (
        <>
          {/* Backdrop — rendered BEFORE drawer so drawer is on top */}
          <div
            className="md:hidden fixed inset-0 z-[48] bg-black/30"
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className="md:hidden fixed top-16 left-0 right-0 z-[49] bg-white border-t border-neutral-200 shadow-lg"
            aria-label="Mobile navigation"
          >
            <div className="px-4 py-3 divide-y divide-neutral-100">

              {/* Nav links */}
              <div className="pb-3 space-y-1">
                {navLinks.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 font-medium py-3 px-3 min-h-[48px] rounded-xl active:bg-neutral-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${isActive ? "text-primary-600 bg-primary-50" : "text-neutral-700"
                        }`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setIsOpen(false)}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 pointer-events-none ${isActive ? "bg-primary-100" : "bg-neutral-100"
                        }`}>
                        <Icon size={18} className={isActive ? "text-primary-600" : "text-neutral-600"} aria-hidden="true" />
                      </span>
                      {label}
                    </Link>
                  );
                })}
              </div>

              {/* Auth section */}
              <div className="pt-3 pb-2">
                {session ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 px-3 py-2 mb-1">
                      <span className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                        <User size={18} className="text-primary-600" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                          {session.user?.name || "My Account"}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
                          {session.user?.email}
                        </p>
                      </div>
                      {isAdmin && (
                        <span className="ml-auto shrink-0 text-xs font-medium bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Shield size={11} /> Admin
                        </span>
                      )}
                    </div>

                    <Link
                      href="/dashboard"
                      className={`flex items-center gap-3 font-medium py-3 px-3 min-h-[48px] rounded-xl active:bg-neutral-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${pathname === "/dashboard" ? "text-primary-600 bg-primary-50" : "text-neutral-700"
                        }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${pathname === "/dashboard" ? "bg-primary-100" : "bg-neutral-100"
                        }`}>
                        <LayoutDashboard size={18} className={pathname === "/dashboard" ? "text-primary-600" : "text-neutral-600"} aria-hidden="true" />
                      </span>
                      Dashboard
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        className={`flex items-center gap-3 font-medium py-3 px-3 min-h-[48px] rounded-xl active:bg-neutral-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${pathname.startsWith("/admin") ? "text-primary-600 bg-primary-50" : "text-neutral-700"
                          }`}
                        onClick={() => setIsOpen(false)}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${pathname.startsWith("/admin") ? "bg-primary-100" : "bg-primary-50"
                          }`}>
                          <Shield size={18} className="text-primary-600" aria-hidden="true" />
                        </span>
                        Admin Panel
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setIsOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="w-full flex items-center gap-3 text-red-600 font-medium py-3 px-3 rounded-xl active:bg-red-100 transition-colors"
                    >
                      <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <LogOut size={18} className="text-red-500" />
                      </span>
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pt-1">
                    <Link
                      href="/login"
                      className="flex items-center justify-center py-3 px-6 min-h-[48px] rounded-xl border border-neutral-200 text-neutral-700 font-medium active:bg-neutral-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      className="flex items-center justify-center py-3 px-6 min-h-[48px] rounded-xl bg-primary-600 text-white font-medium active:bg-primary-800 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Sign Up — It&apos;s Free
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
