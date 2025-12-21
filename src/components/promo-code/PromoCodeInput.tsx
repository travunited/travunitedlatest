"use client";

import { useState } from "react";
import { Tag, CheckCircle, X, AlertCircle } from "lucide-react";

interface PromoCodeInputProps {
  onApply: (code: string) => Promise<{
    valid: boolean;
    discountAmount?: number;
    finalAmount?: number;
    promoCode?: {
      id: string;
      code: string;
      discountType: string;
      discountValue: number;
    };
    message?: string;
    error?: string;
  }>;
  appliedCode?: {
    code: string;
    discountAmount: number;
    message?: string;
  } | null;
  onRemove?: () => void;
  disabled?: boolean;
}

export function PromoCodeInput({
  onApply,
  appliedCode,
  onRemove,
  disabled = false,
}: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) {
      setError("Please enter a promo code");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await onApply(code.trim().toUpperCase());
      
      if (result.valid && result.discountAmount !== undefined) {
        setCode("");
      } else {
        setError(result.error || "Invalid promo code");
      }
    } catch (err) {
      setError("Failed to validate promo code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCode("");
    setError(null);
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-neutral-700">
        Promo Code
      </label>
      
      {appliedCode ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle size={20} className="text-green-600" />
              <div>
                <div className="font-medium text-green-900">
                  Code Applied: {appliedCode.code}
                </div>
                {appliedCode.message && (
                  <div className="text-sm text-green-700 mt-1">
                    {appliedCode.message}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="text-green-700 hover:text-green-900 disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Tag
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApply();
                }
              }}
              disabled={disabled || loading}
              placeholder="Enter promo code"
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 ${
                error ? "border-red-300" : "border-neutral-300"
              }`}
            />
          </div>
          <button
            type="button"
            onClick={handleApply}
            disabled={disabled || loading || !code.trim()}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Checking..." : "Apply"}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start space-x-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
