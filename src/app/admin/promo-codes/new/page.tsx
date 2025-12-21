"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Tag } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { TextInput, TextareaInput, SelectInput, CheckboxInput } from "@/components/admin/MemoizedInputs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function NewPromoCodePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT" | "FREE",
    discountValue: 0,
    minPurchaseAmount: null as number | null,
    maxDiscountAmount: null as number | null,
    applicableTo: "BOTH" as "VISAS" | "TOURS" | "BOTH",
    maxUses: null as number | null,
    maxUsesPerUser: 1,
    newUsersOnly: false,
    isActive: true,
    validFrom: new Date().toISOString().slice(0, 16),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 30 days from now
    visaIds: [] as string[],
    countryIds: [] as string[],
    tourIds: [] as string[],
    restrictedUserIds: [] as string[],
    restrictedEmails: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          validFrom: new Date(formData.validFrom).toISOString(),
          validUntil: new Date(formData.validUntil).toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/admin/promo-codes/${data.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create promo code");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/admin/promo-codes"
          className="inline-flex items-center text-neutral-600 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Promo Codes
        </Link>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <div className="flex items-center mb-6">
            <Tag size={24} className="text-primary-600 mr-3" />
            <h1 className="text-2xl font-bold text-neutral-900">Create Promo Code</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="border-b border-neutral-200 pb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextInput
                  label="Code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  required
                  placeholder="SUMMER2024"
                  helpText="Code will be converted to uppercase"
                />
                <CheckboxInput
                  label="Active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              </div>
              <div className="mt-6">
                <TextareaInput
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Admin notes or description"
                  rows={3}
                />
              </div>
            </div>

            {/* Discount Settings */}
            <div className="border-b border-neutral-200 pb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Discount Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectInput
                  label="Discount Type"
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountType: e.target.value as any,
                    })
                  }
                  options={[
                    { value: "PERCENTAGE", label: "Percentage" },
                    { value: "FIXED_AMOUNT", label: "Fixed Amount" },
                    { value: "FREE", label: "Free" },
                  ]}
                  required
                />
                <TextInput
                  label={
                    formData.discountType === "PERCENTAGE"
                      ? "Discount Percentage"
                      : formData.discountType === "FIXED_AMOUNT"
                      ? "Discount Amount (in ₹)"
                      : "Discount Value"
                  }
                  type="number"
                  value={
                    formData.discountType === "FIXED_AMOUNT"
                      ? formData.discountValue / 100
                      : formData.discountValue
                  }
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      discountValue:
                        formData.discountType === "FIXED_AMOUNT" ? Math.round(value * 100) : value,
                    });
                  }}
                  required
                  min={0}
                  max={formData.discountType === "PERCENTAGE" ? 100 : undefined}
                  helpText={
                    formData.discountType === "PERCENTAGE"
                      ? "Enter percentage (0-100)"
                      : formData.discountType === "FIXED_AMOUNT"
                      ? "Enter amount in rupees"
                      : "Enter discount value"
                  }
                />
                {formData.discountType === "PERCENTAGE" && (
                  <TextInput
                    label="Maximum Discount Amount (in ₹)"
                    type="number"
                    value={formData.maxDiscountAmount ? formData.maxDiscountAmount / 100 : ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : null;
                      setFormData({
                        ...formData,
                        maxDiscountAmount: value ? Math.round(value * 100) : null,
                      });
                    }}
                    placeholder="No limit"
                    helpText="Optional: Cap the maximum discount amount"
                  />
                )}
                <TextInput
                  label="Minimum Purchase Amount (in ₹)"
                  type="number"
                  value={formData.minPurchaseAmount ? formData.minPurchaseAmount / 100 : ""}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : null;
                    setFormData({
                      ...formData,
                      minPurchaseAmount: value ? Math.round(value * 100) : null,
                    });
                  }}
                  placeholder="No minimum"
                  helpText="Optional: Minimum order value to apply code"
                />
              </div>
            </div>

            {/* Applicability */}
            <div className="border-b border-neutral-200 pb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Applicability</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectInput
                  label="Applicable To"
                  value={formData.applicableTo}
                  onChange={(e) =>
                    setFormData({ ...formData, applicableTo: e.target.value as any })
                  }
                  options={[
                    { value: "BOTH", label: "Both Visas and Tours" },
                    { value: "VISAS", label: "Visas Only" },
                    { value: "TOURS", label: "Tours Only" },
                  ]}
                  required
                />
              </div>
              <div className="mt-4 text-sm text-neutral-600">
                <p>Note: Specific visa/tour/country restrictions can be added after creating the promo code.</p>
              </div>
            </div>

            {/* Usage Limits */}
            <div className="border-b border-neutral-200 pb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Usage Limits</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextInput
                  label="Maximum Total Uses"
                  type="number"
                  value={formData.maxUses || ""}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    setFormData({ ...formData, maxUses: value });
                  }}
                  placeholder="Unlimited"
                  helpText="Leave empty for unlimited uses"
                  min={1}
                />
                <TextInput
                  label="Maximum Uses Per User"
                  type="number"
                  value={formData.maxUsesPerUser}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setFormData({ ...formData, maxUsesPerUser: value });
                  }}
                  required
                  min={1}
                />
                <CheckboxInput
                  label="New Users Only"
                  checked={formData.newUsersOnly}
                  onChange={(e) => setFormData({ ...formData, newUsersOnly: e.target.checked })}
                  helpText="Only users with no previous bookings/applications can use this code"
                />
              </div>
            </div>

            {/* Validity Period */}
            <div className="border-b border-neutral-200 pb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Validity Period</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TextInput
                  label="Valid From"
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  required
                />
                <TextInput
                  label="Valid Until"
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6">
              <Link
                href="/admin/promo-codes"
                className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                <span>{loading ? "Creating..." : "Create Promo Code"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
