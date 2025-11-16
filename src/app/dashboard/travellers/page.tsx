"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Edit, Trash2, User, X } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";

interface Traveller {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
}

export default function TravellersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTraveller, setEditingTraveller] = useState<Traveller | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    passportNumber: "",
    passportExpiry: "",
  });

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchTravellers();
    }
  }, [sessionStatus]);

  const fetchTravellers = async () => {
    try {
      const response = await fetch("/api/travellers");
      if (response.ok) {
        const data = await response.json();
        setTravellers(data);
      }
    } catch (error) {
      console.error("Error fetching travellers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTraveller
        ? `/api/travellers/${editingTraveller.id}`
        : "/api/travellers";
      const method = editingTraveller ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTravellers();
        resetForm();
      } else {
        alert("Failed to save traveller. Please try again.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this traveller profile?")) {
      return;
    }

    try {
      const response = await fetch(`/api/travellers/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchTravellers();
      } else {
        alert("Failed to delete traveller. Please try again.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const handleEdit = (traveller: Traveller) => {
    setEditingTraveller(traveller);
    setFormData({
      firstName: traveller.firstName,
      lastName: traveller.lastName,
      email: traveller.email || "",
      phone: traveller.phone || "",
      dateOfBirth: traveller.dateOfBirth ? new Date(traveller.dateOfBirth).toISOString().split("T")[0] : "",
      passportNumber: traveller.passportNumber || "",
      passportExpiry: traveller.passportExpiry ? new Date(traveller.passportExpiry).toISOString().split("T")[0] : "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      passportNumber: "",
      passportExpiry: "",
    });
    setEditingTraveller(null);
    setShowForm(false);
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
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-neutral-900">Traveller Profiles</h1>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus size={20} />
              <span>Add Traveller</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add/Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-medium p-6 mb-8 border border-neutral-200"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900">
                  {editingTraveller ? "Edit Traveller" : "Add New Traveller"}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Passport Number
                    </label>
                    <input
                      type="text"
                      value={formData.passportNumber}
                      onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Passport Expiry
                    </label>
                    <input
                      type="date"
                      value={formData.passportExpiry}
                      onChange={(e) => setFormData({ ...formData, passportExpiry: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    {editingTraveller ? "Update" : "Add"} Traveller
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Travellers List */}
        {travellers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {travellers.map((traveller) => (
              <motion.div
                key={traveller.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-neutral-200 p-6 hover:shadow-medium transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <User size={24} className="text-primary-600" />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(traveller)}
                      className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-neutral-50 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(traveller.id)}
                      className="p-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">
                  {traveller.firstName} {traveller.lastName}
                </h3>
                <div className="space-y-1 text-sm text-neutral-600">
                  {traveller.email && <p>{traveller.email}</p>}
                  {traveller.phone && <p>{traveller.phone}</p>}
                  {traveller.dateOfBirth && (
                    <p>DOB: {formatDate(traveller.dateOfBirth)}</p>
                  )}
                  {traveller.passportNumber && (
                    <p>Passport: {traveller.passportNumber}</p>
                  )}
                  {traveller.passportExpiry && (
                    <p>Expiry: {formatDate(traveller.passportExpiry)}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <User size={48} className="text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 mb-4">No traveller profiles yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus size={20} />
              <span>Add Your First Traveller</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

