"use client";

import { useState } from "react";
import { Search, Plane, MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export function Hero() {
  const [mode, setMode] = useState<"visa" | "tour">("visa");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedVisaType, setSelectedVisaType] = useState("");
  const [tourDestination, setTourDestination] = useState("");
  const [tourDate, setTourDate] = useState("");

  const countries = [
    "UAE", "Schengen", "USA", "UK", "Singapore", "Thailand", "Malaysia", "Australia"
  ];

  const visaTypes: Record<string, string[]> = {
    "UAE": ["Tourist Visa", "Business Visa", "Transit Visa"],
    "Schengen": ["Tourist Visa", "Business Visa"],
    "USA": ["Tourist Visa (B2)", "Business Visa (B1)"],
    "UK": ["Tourist Visa", "Business Visa"],
    "Singapore": ["Tourist Visa", "Business Visa"],
    "Thailand": ["Tourist Visa", "Business Visa"],
    "Malaysia": ["Tourist Visa", "Business Visa"],
    "Australia": ["Tourist Visa", "Business Visa"],
  };

  const availableVisaTypes = selectedCountry ? (visaTypes[selectedCountry] || []) : [];

  const handleSearch = () => {
    if (mode === "visa") {
      if (selectedCountry && selectedVisaType && selectedVisaType !== "not-sure") {
        // Exact match - navigate directly to visa detail page
        const countrySlug = selectedCountry.toLowerCase();
        const visaSlug = selectedVisaType.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "");
        window.location.href = `/visas/${countrySlug}/${visaSlug}`;
      } else if (selectedCountry) {
        // Show visa types for country
        window.location.href = `/visas/${selectedCountry.toLowerCase()}`;
      }
    } else if (mode === "tour") {
      if (tourDestination) {
        // Try to find exact match first, otherwise show search results
        const destinationSlug = tourDestination.toLowerCase().replace(/\s+/g, "-");
        // Navigate to tours with search query
        const params = new URLSearchParams({ destination: tourDestination });
        if (tourDate) params.append("date", tourDate);
        window.location.href = `/tours?${params.toString()}`;
      }
    }
  };

  return (
    <div className="relative min-h-[600px] md:min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/60 via-primary-800/50 to-primary-900/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Visas & Holidays,
            <br />
            <span className="bg-gradient-to-r from-accent-400 to-accent-300 bg-clip-text text-transparent">
              Seamlessly Managed
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Your trusted partner for premium visa services and unforgettable tour experiences
          </p>
        </motion.div>

        {/* Search Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass rounded-2xl p-6 md:p-8 shadow-large"
        >
          {/* Mode Toggle */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-neutral-100 rounded-lg p-1 inline-flex">
              <button
                onClick={() => setMode("visa")}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  mode === "visa"
                    ? "bg-white text-primary-600 shadow-soft"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <Plane size={18} className="inline mr-2" />
                Visa Services
              </button>
              <button
                onClick={() => setMode("tour")}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  mode === "tour"
                    ? "bg-white text-primary-600 shadow-soft"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <MapPin size={18} className="inline mr-2" />
                Tour Packages
              </button>
            </div>
          </div>

          {/* Search Form */}
          {mode === "visa" ? (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Select Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    setSelectedCountry(e.target.value);
                    setSelectedVisaType(""); // Reset visa type when country changes
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Choose a country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Visa Type
                </label>
                <select
                  value={selectedVisaType}
                  onChange={(e) => setSelectedVisaType(e.target.value)}
                  disabled={!selectedCountry}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select visa type</option>
                  <option value="not-sure">Not sure - Show all types</option>
                  {availableVisaTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={!selectedCountry}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Search size={20} />
                  <span>Search</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Destination or Tour Name
                </label>
                <input
                  type="text"
                  value={tourDestination}
                  onChange={(e) => setTourDestination(e.target.value)}
                  placeholder="e.g., Dubai, Singapore, Europe"
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Travel Date (Optional)
                </label>
                <input
                  type="date"
                  value={tourDate}
                  onChange={(e) => setTourDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={!tourDestination}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Search size={20} />
                  <span>Search Tours</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Trust Elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-6 text-white/90 text-sm"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span>Trusted by Indian travellers</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span>Secure payments via Razorpay</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span>Expert support for visas & tours</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

