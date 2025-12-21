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
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Code</label>
                  <TextInput
                    value={formData.code}
                    onChange={(value) =>
                      setFormData({ ...formData, code: value.toUpperCase() })
                    }
                    required
                    placeholder="SUMMER2024"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Code will be converted to uppercase</p>
                </div>
                <div className="flex items-center space-x-3 pt-6">
                  <CheckboxInput
                    checked={formData.isActive}
                    onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <label className="text-sm font-medium text-neutral-700">Active</label>
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                <TextareaInput
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Admin notes or description"
                  rows={3}
                />
              </div>
            </div>

            {/* Discount Settings */}
            <div className="border-b border-neutral-200 pb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Discount Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Discount Type</label>
                  <SelectInput
                    value={formData.discountType}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        discountType: value as any,
                      })
                    }
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED_AMOUNT">Fixed Amount</option>
                    <option value="FREE">Free</option>
                  </SelectInput>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {formData.discountType === "PERCENTAGE"
                      ? "Discount Percentage"
                      : formData.discountType === "FIXED_AMOUNT"
                        ? "Discount Amount (in ₹)"
                        : "Discount Value"}
                  </label>
                  <TextInput
                    type="number"
                    value={
                      formData.discountType === "FIXED_AMOUNT"
                        ? (formData.discountValue / 100).toString()
                        : formData.discountValue.toString()
                    }
                    onChange={(value) => {
                      const numValue = parseFloat(value) || 0;
                      setFormData({
                        ...formData,
                        discountValue:
                          formData.discountType === "FIXED_AMOUNT" ? Math.round(numValue * 100) : numValue,
                      });
                    }}
                    required
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    {formData.discountType === "PERCENTAGE"
                      ? "Enter percentage (0-100)"
                      : formData.discountType === "FIXED_AMOUNT"
                        ? "Enter amount in rupees"
                        : "Enter discount value"}
                  </p>
                </div>
                {formData.discountType === "PERCENTAGE" && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Maximum Discount Amount (in ₹)</label>
                    <TextInput
                      type="number"
                      value={formData.maxDiscountAmount ? (formData.maxDiscountAmount / 100).toString() : ""}
                      onChange={(value) => {
                        const numValue = value ? parseFloat(value) : null;
                        setFormData({
                          ...formData,
                          maxDiscountAmount: numValue ? Math.round(numValue * 100) : null,
                        });
                      }}
                      placeholder="No limit"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Optional: Cap the maximum discount amount</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Minimum Purchase Amount (in ₹)</label>
                  <TextInput
                    type="number"
                    value={formData.minPurchaseAmount ? (formData.minPurchaseAmount / 100).toString() : ""}
                    onChange={(value) => {
                      const numValue = value ? parseFloat(value) : null;
                      setFormData({
                        ...formData,
                        minPurchaseAmount: numValue ? Math.round(numValue * 100) : null,
                      });
                    }}
                    placeholder="No minimum"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Optional: Minimum order value to apply code</p>
                </div>
              </div>
            </div>

            {/* Applicability */}
            <div className="border-b border-neutral-200 pb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Applicability</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Applicable To</label>
                  <SelectInput
                    value={formData.applicableTo}
                    onChange={(value) =>
                      setFormData({ ...formData, applicableTo: value as any })
                    }
                  >
                    <option value="BOTH">Both Visas and Tours</option>
                    <option value="VISAS">Visas Only</option>
                    <option value="TOURS">Tours Only</option>
                  </SelectInput>
                </div>
              </div>
              <div className="mt-4 text-sm text-neutral-600">
                <p>Note: Specific visa/tour/country restrictions can be added after creating the promo code.</p>
              </div>
            </div>

            {/* Usage Limits */}
            <div className="border-b border-neutral-200 pb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Usage Limits</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Maximum Total Uses</label>
                  <TextInput
                    type="number"
                    value={formData.maxUses ? formData.maxUses.toString() : ""}
                    onChange={(value) => {
                      const numValue = value ? parseInt(value) : null;
                      setFormData({ ...formData, maxUses: numValue });
                    }}
                    placeholder="Unlimited"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Leave empty for unlimited uses</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Maximum Uses Per User</label>
                  <TextInput
                    type="number"
                    value={formData.maxUsesPerUser.toString()}
                    onChange={(value) => {
                      const numValue = parseInt(value) || 1;
                      setFormData({ ...formData, maxUsesPerUser: numValue });
                    }}
                    required
                  />
                </div>
                <div className="md:col-span-2 flex items-center space-x-3">
                  <CheckboxInput
                    checked={formData.newUsersOnly}
                    onChange={(checked) => setFormData({ ...formData, newUsersOnly: checked })}
                  />
                  <div>
                    <label className="text-sm font-medium text-neutral-700">New Users Only</label>
                    <p className="text-xs text-neutral-500 mt-1">Only users with no previous bookings/applications can use this code</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Validity Period */}
            <div className="border-b border-neutral-200 pb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Validity Period</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Valid From</label>
                  <TextInput
                    type="datetime-local"
                    value={formData.validFrom}
                    onChange={(value) => setFormData({ ...formData, validFrom: value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Valid Until</label>
                  <TextInput
                    type="datetime-local"
                    value={formData.validUntil}
                    onChange={(value) => setFormData({ ...formData, validUntil: value })}
                    required
                  />
                </div>
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
