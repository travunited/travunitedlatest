"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";

  // Close mobile drawer on every route change — direct, no delay
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close desktop user menu on outside tap
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
      {/* Nav bar — only the 64px strip. Mobile drawer is a separate sibling below. */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 border-b border-neutral-200 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            <Link href="/" className="flex items-center space-x-2 shrink-0">
              <Logo priority />
            </Link>

            {/* Desktop nav */}
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
        Mobile drawer — a standalone position:fixed sibling, NOT inside <nav>.

        Why this matters for iOS Safari:
        CSS transitions on a child of a position:fixed parent invalidate iOS's
        touch hit-test map. Even opacity/max-height changes cause the browser to
        defer or drop click events on elements inside that stacking context.
        Moving the drawer outside <nav> gives it its own isolated stacking context
        so iOS can correctly deliver clicks to the links inside it.

        Show/hide uses opacity + pointer-events only — no height animation, no
        overflow-hidden. Links carry zero event handlers; the pathname useEffect
        above fires after Next.js finishes routing and closes the drawer cleanly.
      */}
      <div
        className={`md:hidden fixed top-16 left-0 right-0 z-[49] bg-white border-t border-neutral-200 shadow-lg transition-opacity duration-200 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="px-4 py-3 divide-y divide-neutral-100">

          {/* Nav links — zero handlers intentionally, pathname effect closes drawer */}
          <div className="pb-3 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 text-neutral-700 font-medium py-3 px-3 rounded-xl active:bg-neutral-100 transition-colors"
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
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                  <span className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <User size={18} className="text-primary-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {session.user?.name || "My Account"}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">{session.user?.email}</p>
                  </div>
                  {isAdmin && (
                    <span className="ml-auto shrink-0 text-xs font-medium bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Shield size={11} /> Admin
                    </span>
                  )}
                </div>

                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 text-neutral-700 font-medium py-3 px-3 rounded-xl active:bg-neutral-100 transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                    <LayoutDashboard size={18} className="text-neutral-600" />
                  </span>
                  Dashboard
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 text-neutral-700 font-medium py-3 px-3 rounded-xl active:bg-neutral-100 transition-colors"
                  >
                    <span className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <Shield size={18} className="text-primary-600" />
                    </span>
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={() => { signOut({ callbackUrl: "/" }); setIsOpen(false); }}
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
                  className="flex items-center justify-center py-3 px-6 rounded-xl border border-neutral-200 text-neutral-700 font-medium active:bg-neutral-100 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center justify-center py-3 px-6 rounded-xl bg-primary-600 text-white font-medium active:bg-primary-800 transition-colors"
                >
                  Sign Up — It&apos;s Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop — tap anywhere outside drawer to close */}
      <div
        className={`md:hidden fixed inset-0 z-[48] bg-black/30 transition-opacity duration-200 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
        onPointerDown={() => setIsOpen(false)}
      />
    </>
  );
}
