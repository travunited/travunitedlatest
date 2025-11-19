"use client";

import { useState } from "react";
import { AdminSidebar, AdminSidebarStatic, AdminSidebarToggle } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <div className="hidden lg:flex w-64 flex-shrink-0">
        <AdminSidebarStatic />
      </div>

      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col">
        <AdminHeader />
        <div className="lg:hidden px-4 py-3 border-b border-neutral-200 flex items-center justify-between bg-white/90 backdrop-blur z-40">
          <div className="flex items-center space-x-3">
            <AdminSidebarToggle onToggle={() => setSidebarOpen(true)} />
            <p className="text-sm font-medium text-neutral-700">Menu</p>
          </div>
        </div>
        <main className="flex-1 px-4 py-6 lg:px-6">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}