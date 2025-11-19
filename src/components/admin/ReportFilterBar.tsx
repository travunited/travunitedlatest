"use client";

import { useState, useEffect } from "react";
import { Calendar, Filter, X } from "lucide-react";

interface ReportFilterBarProps {
  onFilterChange: (filters: ReportFilters) => void;
  showCountry?: boolean;
  showStatus?: boolean;
  showPaymentStatus?: boolean;
  showType?: boolean;
  countries?: Array<{ id: string; name: string }>;
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  datePreset?: string;
  countryIds?: string[];
  status?: string;
  paymentStatus?: string;
  type?: string;
}

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "last7" },
  { label: "Last 30 days", value: "last30" },
  { label: "This month", value: "thisMonth" },
  { label: "Last month", value: "lastMonth" },
  { label: "Custom", value: "custom" },
];

export function ReportFilterBar({
  onFilterChange,
  showCountry = false,
  showStatus = false,
  showPaymentStatus = false,
  showType = false,
  countries = [],
}: ReportFilterBarProps) {
  const [datePreset, setDatePreset] = useState("last30");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    // Set default dates based on preset
    const today = new Date();
    let from = new Date();
    let to = new Date();

    switch (datePreset) {
      case "today":
        from = new Date(today);
        to = new Date(today);
        break;
      case "last7":
        from = new Date(today);
        from.setDate(from.getDate() - 7);
        break;
      case "last30":
        from = new Date(today);
        from.setDate(from.getDate() - 30);
        break;
      case "thisMonth":
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "lastMonth":
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "custom":
        // Don't auto-set dates for custom
        break;
    }

    if (datePreset !== "custom") {
      setDateFrom(from.toISOString().split("T")[0]);
      setDateTo(to.toISOString().split("T")[0]);
    }
  }, [datePreset]);

  useEffect(() => {
    // Notify parent of filter changes
    onFilterChange({
      dateFrom,
      dateTo,
      datePreset,
      countryIds: selectedCountries.length > 0 ? selectedCountries : undefined,
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      type: type || undefined,
    });
  }, [dateFrom, dateTo, datePreset, selectedCountries, status, paymentStatus, type, onFilterChange]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset === "custom") {
      // Clear dates so user can set custom
      setDateFrom("");
      setDateTo("");
    }
  };

  const clearFilters = () => {
    setDatePreset("last30");
    setSelectedCountries([]);
    setStatus("");
    setPaymentStatus("");
    setType("");
  };

  return (
    <div className="bg-white rounded-2xl shadow-medium p-6 border border-neutral-200 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter size={20} className="text-neutral-600" />
        <h3 className="text-lg font-semibold text-neutral-900">Filters</h3>
        {(selectedCountries.length > 0 || status || paymentStatus || type) && (
          <button
            onClick={clearFilters}
            className="ml-auto inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"
          >
            <X size={16} />
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Preset */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Date Range</label>
          <select
            value={datePreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Date From */}
        {datePreset === "custom" && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        )}

        {/* Custom Date To */}
        {datePreset === "custom" && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        )}

        {/* Country Filter */}
        {showCountry && countries.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Country</label>
            <select
              multiple
              value={selectedCountries}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, (option) => option.value);
                setSelectedCountries(values);
              }}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm min-h-[42px]"
              size={3}
            >
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
            {selectedCountries.length > 0 && (
              <div className="mt-2 text-xs text-neutral-600">
                {selectedCountries.length} selected
              </div>
            )}
          </div>
        )}

        {/* Status Filter */}
        {showStatus && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="IN_PROCESS">In Process</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        )}

        {/* Payment Status Filter */}
        {showPaymentStatus && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Payment Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        )}

        {/* Type Filter */}
        {showType && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Types</option>
              <option value="VISA">Visa</option>
              <option value="TOUR">Tour</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}


