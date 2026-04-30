"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut, Shield, Home, FileText, Plane, BookOpen, Building2, HelpCircle, LayoutDashboard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { Logo } from "@/components/ui/Logo";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const scrollYRef = useRef(0);

  const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";

  const close = useCallback(() => setIsOpen(false), []);

  // Auto-close on route change (back button, router.push, Link clicks)
  useEffect(() => {
    close();
  }, [pathname, close]);

  // iOS-safe scroll lock: position:fixed preserves scroll position on iOS Safari
  useEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [isOpen]);

  // Close on outside tap (pointerdown fires on touch + mouse)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [isOpen, close]);

  // Close desktop user menu on outside click
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handler = (e: PointerEvent) => {
      const el = document.getElementById("user-menu-desktop");
      if (el && !el.contains(e.target as Node)) setIsUserMenuOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [isUserMenuOpen]);

  const navLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/visas", label: "Visas", icon: FileText },
    { href: "/holidays", label: "Holidays", icon: Plane },
    { href: "/blog", label: "Blog", icon: BookOpen },
    { href: "/corporate", label: "Corporate", icon: Building2 },
    { href: "/help", label: "Support", icon: HelpCircle },
  ];

  return (
    <>
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-soft"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 shrink-0" onClick={close}>
              <Logo priority />
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center space-x-1.5 text-neutral-700 hover:text-primary-600 font-medium transition-colors duration-200"
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center space-x-4">
              {session ? (
                <>
                  <NotificationBell />
                  <div id="user-menu-desktop" className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen((v) => !v)}
                      className="flex items-center space-x-2 text-neutral-700 hover:text-primary-600 font-medium transition-colors"
                    >
                      <User size={20} />
                      <span className="max-w-[120px] truncate">{session.user?.name || session.user?.email}</span>
                      {isAdmin && <Shield size={16} className="text-primary-600 shrink-0" />}
                    </button>
                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-large border border-neutral-200 py-2 z-50"
                        >
                          <Link
                            href="/dashboard"
                            className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Dashboard
                          </Link>
                          {isAdmin && (
                            <Link
                              href="/admin"
                              className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              Admin Panel
                            </Link>
                          )}
                          <button
                            onClick={() => { signOut({ callbackUrl: "/" }); setIsUserMenuOpen(false); }}
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
                  <Link href="/login" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-soft"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile right side: bell (if logged in) + hamburger */}
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

        {/* Mobile drawer — opacity animation avoids iOS height-animation touch-target bug.
            No overflow-y-auto wrapper: that caused the iOS "first tap activates scroll
            container, second tap fires click" double-tap issue. */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="md:hidden bg-white border-t border-neutral-200 shadow-lg"
            >
              <div className="px-4 py-3 divide-y divide-neutral-100">

                {/* Nav links */}
                <div className="pb-3 space-y-1">
                  {navLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 text-neutral-700 font-medium py-3 px-3 rounded-xl active:bg-neutral-100 transition-colors cursor-pointer"
                      onClick={close}
                    >
                      <span className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 pointer-events-none">
                        <Icon size={18} className="text-neutral-600" />
                      </span>
                      {label}
                    </Link>
                  ))}
                </div>

                {/* Auth section */}
                <div className="pt-3 pb-2">
                  {session ? (
                    <div className="space-y-1">
                      {/* User identity row */}
                      <div className="flex items-center gap-3 px-3 py-2 mb-1">
                        <span className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0 pointer-events-none">
                          <User size={18} className="text-primary-600" />
                        </span>
                        <div className="min-w-0 pointer-events-none">
                          <p className="text-sm font-semibold text-neutral-900 truncate">
                            {session.user?.name || "My Account"}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">{session.user?.email}</p>
                        </div>
                        {isAdmin && (
                          <span className="ml-auto shrink-0 text-xs font-medium bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full flex items-center gap-1 pointer-events-none">
                            <Shield size={11} /> Admin
                          </span>
                        )}
                      </div>

                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 text-neutral-700 font-medium py-3 px-3 rounded-xl active:bg-neutral-100 transition-colors cursor-pointer"
                        onClick={close}
                      >
                        <span className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 pointer-events-none">
                          <LayoutDashboard size={18} className="text-neutral-600" />
                        </span>
                        Dashboard
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 text-neutral-700 font-medium py-3 px-3 rounded-xl active:bg-neutral-100 transition-colors cursor-pointer"
                          onClick={close}
                        >
                          <span className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 pointer-events-none">
                            <Shield size={18} className="text-primary-600" />
                          </span>
                          Admin Panel
                        </Link>
                      )}

                      <button
                        onClick={() => { signOut({ callbackUrl: "/" }); close(); }}
                        className="w-full flex items-center gap-3 text-red-600 font-medium py-3 px-3 rounded-xl active:bg-red-100 transition-colors cursor-pointer"
                      >
                        <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 pointer-events-none">
                          <LogOut size={18} className="text-red-500" />
                        </span>
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 pt-1">
                      <Link
                        href="/login"
                        className="flex items-center justify-center py-3 px-6 rounded-xl border border-neutral-200 text-neutral-700 font-medium active:bg-neutral-100 transition-colors cursor-pointer"
                        onClick={close}
                      >
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        className="flex items-center justify-center py-3 px-6 rounded-xl bg-primary-600 text-white font-medium active:bg-primary-800 transition-colors cursor-pointer"
                        onClick={close}
                      >
                        Sign Up — It&apos;s Free
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Full-screen backdrop behind open menu (closes on tap) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            aria-hidden="true"
            onPointerDown={close}
          />
        )}
      </AnimatePresence>
    </>
  );
}

