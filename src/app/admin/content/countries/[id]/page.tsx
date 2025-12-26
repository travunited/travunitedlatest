"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";


interface CountryFormState {
  name: string;
  code: string;
  region?: string;
  flagUrl?: string;
  isActive: boolean;
}

export default function AdminCountryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isNew = params.id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CountryFormState>({
    name: "",
    code: "",
    region: "",
    flagUrl: "",
    isActive: true,
  });

  const pageTitle = useMemo(
    () => (isNew ? "Add Country" : "Edit Country"),
    [isNew]
  );

  const fetchCountry = useCallback(async () => {
    if (isNew) return;
    try {
      const response = await fetch(`/api/admin/content/countries/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          name: data.name || "",
          code: data.code || "",
          region: data.region || "",
          flagUrl: data.flagUrl || "",
          isActive: data.isActive ?? true,
        });
      } else {
        router.push("/admin/content/countries");
      }
    } catch (error) {
      console.error("Failed to fetch country", error);
      router.push("/admin/content/countries");
    } finally {
      setLoading(false);
    }
  }, [isNew, params.id, router]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      router.push("/admin");
      return;
    }
    if (!isNew) {
      fetchCountry();
    } else {
      setLoading(false);
    }
  }, [session, status, router, isNew, fetchCountry]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(
        isNew
          ? "/api/admin/content/countries"
          : `/api/admin/content/countries/${params.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            region: formData.region || "",
            flagUrl: formData.flagUrl || "",
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to save country");
      } else {
        router.push("/admin/content/countries");
      }
    } catch (error) {
      console.error("Failed to save country", error);
      alert("Unexpected error while saving country");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            <p className="mt-4 text-neutral-600">Loading country...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/admin/content/countries"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
          Back to Countries
        </Link>
        <div className="mt-4 bg-white border border-neutral-200 rounded-2xl p-6 space-y-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{pageTitle}</h1>
            <p className="text-sm text-neutral-500">Country level metadata used across visas and tours.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Country Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="United Arab Emirates"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Country Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                  }
                  required
                  maxLength={10}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg uppercase tracking-wide focus:ring-2 focus:ring-primary-500"
                  placeholder="UAE"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Used in URLs and filters. Keep it short (e.g., UAE, SG, FR).
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Region
                  </label>
                  <input
                    type="text"
                    value={formData.region || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, region: e.target.value }))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Middle East"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Flag Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.flagUrl || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, flagUrl: e.target.value }))}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="https://flagcdn.com/w320/ae.png"
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-800">
                  Active (visible in public listings)
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

