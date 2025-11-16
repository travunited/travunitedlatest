"use client";

import { useState } from "react";
import { AdminSidebar, AdminSidebarToggle } from "./AdminSidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

