"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, FileText, Plane, MapPin, ArrowRight } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  id: string;
  type: "visa" | "tour";
  title: string;
  subtitle?: string;
  country?: string;
  price?: number;
  slug: string;
  countryCode?: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const debouncedQuery = useDebounce(query, 300);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        handleSelectResult(results[selectedIndex]);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, results, selectedIndex]);

  // Search API call
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}&type=all&limit=8`
        );
        if (response.ok) {
          const data = await response.json();
          const searchResults: SearchResult[] = [
            ...(data.visas || []).map((v: any) => ({
              id: v.id,
              type: "visa" as const,
              title: v.name,
              subtitle: v.category,
              country: v.Country?.name,
              countryCode: v.Country?.code,
              price: v.priceInInr,
              slug: `/visas/${v.Country?.code?.toLowerCase() || "all"}/${v.slug}`,
            })),
            ...(data.tours || []).map((t: any) => ({
              id: t.id,
              type: "tour" as const,
              title: t.name,
              subtitle: t.destination,
              country: t.Country?.name,
              countryCode: t.Country?.code,
              price: t.price,
              slug: `/holidays/${t.slug || t.id}`,
            })),
          ];
          setResults(searchResults);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      setQuery("");
      router.push(result.slug);
    },
    [router]
  );

  const handleInputFocus = () => {
    if (query.length >= 2 && results.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search visas, holidays, destinations..."
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="w-full pl-12 pr-10 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X size={18} />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <Loader2 size={18} className="animate-spin text-neutral-400" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 max-h-96 overflow-y-auto z-50"
          >
            {results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelectResult(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors flex items-start space-x-3 ${
                      selectedIndex === index ? "bg-neutral-50" : ""
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {result.type === "visa" ? (
                        <FileText size={20} className="text-primary-600" />
                      ) : (
                        <Plane size={20} className="text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-neutral-900 truncate">{result.title}</p>
                        {result.price !== undefined && (
                          <span className="text-sm font-medium text-primary-600 ml-2 flex-shrink-0">
                            ₹{result.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        {result.country && (
                          <div className="flex items-center space-x-1 text-xs text-neutral-500">
                            <MapPin size={12} />
                            <span>{result.country}</span>
                          </div>
                        )}
                        {result.subtitle && (
                          <span className="text-xs text-neutral-500">• {result.subtitle}</span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                          {result.type === "visa" ? "Visa" : "Tour"}
                        </span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-neutral-400 flex-shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            ) : !isLoading && query.length >= 2 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-neutral-500 text-sm">No results found</p>
                <p className="text-neutral-400 text-xs mt-1">Try a different search term</p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

