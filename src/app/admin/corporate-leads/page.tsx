"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Mail, Phone, Calendar, User } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

interface CorporateLead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

export default function AdminCorporateLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState<CorporateLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        router.push("/dashboard");
      } else {
        fetchLeads();
      }
    }
  }, [session, status, router]);

  const fetchLeads = async () => {
    try {
      const response = await fetch("/api/admin/corporate-leads");
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-8">Corporate Leads</h1>
        {leads.length > 0 ? (
          <div className="space-y-4">
            {leads.map((lead) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-medium transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Building2 size={20} className="text-primary-600" />
                      <h3 className="text-lg font-semibold text-neutral-900">{lead.companyName}</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-neutral-600 mb-4">
                      <div className="flex items-center space-x-2">
                        <User size={16} className="text-neutral-400" />
                        <span><strong>Contact:</strong> {lead.contactName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail size={16} className="text-neutral-400" />
                        <span>{lead.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone size={16} className="text-neutral-400" />
                        <span>{lead.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar size={16} className="text-neutral-400" />
                        <span>{formatDate(lead.createdAt)}</span>
                      </div>
                    </div>
                    <div className="bg-neutral-50 rounded-lg p-4">
                      <p className="text-sm text-neutral-700">{lead.message}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <Building2 size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600">No corporate leads found</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

