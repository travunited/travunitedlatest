"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plane, MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Country {
  id: string;
  name: string;
  code: string;
  flagUrl?: string | null;
}

interface VisaType {
  id: string;
  name: string;
  slug: string;
  subtitle?: string | null;
  category: string;
  country: {
    id: string;
    name: string;
    code: string;
  };
}

export function Hero() {
  const router = useRouter();
  const [mode, setMode] = useState<"visa" | "tour">("visa");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedVisaType, setSelectedVisaType] = useState("");
  const [tourDestination, setTourDestination] = useState("");
  const [tourDate, setTourDate] = useState("");
  
  // Backend data
  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [tourDestinations, setTourDestinations] = useState<string[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch("/api/search/countries");
        if (response.ok) {
          const data = await response.json();
          setCountries(data);
        }
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };
    fetchCountries();
  }, []);

  // Fetch visa types when country is selected
  useEffect(() => {
    if (selectedCountry && mode === "visa") {
      const fetchVisaTypes = async () => {
        try {
          // selectedCountry is the country ID, find the country to get code/name
          const country = countries.find((c) => c.id === selectedCountry);
          const countryParam = country?.code || country?.name || selectedCountry;
          const response = await fetch(`/api/search/visa-types?country=${encodeURIComponent(countryParam)}`);
          if (response.ok) {
            const data = await response.json();
            setVisaTypes(data);
          }
        } catch (error) {
          console.error("Error fetching visa types:", error);
        }
      };
      fetchVisaTypes();
    } else {
      setVisaTypes([]);
    }
  }, [selectedCountry, mode, countries]);

  // Fetch destination suggestions for autocomplete
  const fetchDestinationSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setDestinationSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/search/tour-destinations?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setDestinationSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Error fetching destination suggestions:", error);
    }
  }, []);

  // Handle destination input change
  const handleDestinationChange = (value: string) => {
    setTourDestination(value);
    fetchDestinationSuggestions(value);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setTourDestination(suggestion);
    setShowSuggestions(false);
    setDestinationSuggestions([]);
  };

  const handleSearch = () => {
    if (mode === "visa") {
      if (selectedCountry && selectedVisaType && selectedVisaType !== "not-sure") {
        // Find the selected visa to get its slug
        const visa = visaTypes.find((v) => v.id === selectedVisaType);
        if (visa) {
          // Use the actual slug from database
          const countryCode = visa.country.code.toLowerCase();
          router.push(`/visas/${countryCode}/${visa.slug}`);
        } else {
          // Fallback: navigate to country visas page
          const country = countries.find((c) => c.id === selectedCountry || c.code.toLowerCase() === selectedCountry.toLowerCase() || c.name.toLowerCase() === selectedCountry.toLowerCase());
          if (country) {
            router.push(`/visas/${country.code.toLowerCase()}`);
          }
        }
      } else if (selectedCountry) {
        // Show visa types for country
        const country = countries.find((c) => c.id === selectedCountry || c.code.toLowerCase() === selectedCountry.toLowerCase() || c.name.toLowerCase() === selectedCountry.toLowerCase());
        if (country) {
          router.push(`/visas/${country.code.toLowerCase()}`);
        }
      }
    } else if (mode === "tour") {
      if (tourDestination) {
        // Navigate to tours with search query
        const params = new URLSearchParams({ destination: tourDestination });
        if (tourDate) params.append("date", tourDate);
        router.push(`/holidays?${params.toString()}`);
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
          Trusted by Global Travellers Across 160+ Destinations
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
            <div className="bg-neutral-100 rounded-lg p-1 flex flex-col gap-2 w-full max-w-md sm:inline-flex sm:flex-row sm:w-auto">
              <button
                onClick={() => {
                  setMode("visa");
                  setTourDestination("");
                  setSelectedVisaType("");
                }}
                className={`px-4 py-2 rounded-md font-medium text-sm sm:text-base transition-all w-full sm:w-auto ${
                  mode === "visa"
                    ? "bg-white text-primary-600 shadow-soft"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <Plane size={18} className="inline mr-2" />
                Visa Services
              </button>
              <button
                onClick={() => {
                  setMode("tour");
                  setSelectedCountry("");
                  setSelectedVisaType("");
                }}
                className={`px-4 py-2 rounded-md font-medium text-sm sm:text-base transition-all w-full sm:w-auto ${
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
                    <option key={country.id} value={country.id}>
                      {country.name}
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
                  disabled={!selectedCountry || visaTypes.length === 0}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select visa type</option>
                  <option value="not-sure">Not sure - Show all types</option>
                  {visaTypes.map((visa) => (
                    <option key={visa.id} value={visa.id}>
                      {visa.name}
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
              <div className="relative">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Destination or Tour Name
                </label>
                <input
                  type="text"
                  value={tourDestination}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  onFocus={() => {
                    if (destinationSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="e.g., Dubai, Singapore, Europe"
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {showSuggestions && destinationSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {destinationSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="w-full text-left px-4 py-2 hover:bg-neutral-100 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
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
            <span>Trusted by Individual & Corporate Travellers</span>
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
