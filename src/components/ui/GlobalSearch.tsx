"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, FileText, Plane, MapPin, ArrowRight } from "lucide-react";
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("pointerdown", handleClickOutside);
      return () => document.removeEventListener("pointerdown", handleClickOutside);
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
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
  }, [isOpen, results, selectedIndex]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Optimized search with request cancellation and immediate feedback
  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const trimmedQuery = query.trim();

    // If query is too short, clear results immediately
    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    // Show loading immediately for better UX
    setIsLoading(true);
    setIsOpen(true);

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Debounce with shorter delay (150ms for instant feel)
    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}&type=all&limit=8`,
          { signal: abortController.signal }
        );

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

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
        } else {
          setResults([]);
        }
      } catch (error: any) {
        // Ignore abort errors
        if (error.name === "AbortError") {
          return;
        }
        console.error("Search error:", error);
        setResults([]);
      } finally {
        // Only update loading state if this is still the current request
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 150); // Reduced from 300ms to 150ms for instant feel

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query]);

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      setQuery("");
      router.push(result.slug);
    },
    [router]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // Open dropdown immediately when user starts typing
    if (value.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (query.length >= 2) {
      setIsOpen(true);
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
          className="w-full pl-12 pr-10 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-base sm:text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              setResults([]);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors"
            type="button"
          >
            <X size={18} />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <Loader2 size={18} className="animate-spin text-primary-600" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && query.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 max-h-96 overflow-y-auto z-50"
          >
            {isLoading && results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Loader2 size={24} className="animate-spin text-primary-600 mx-auto mb-2" />
                <p className="text-neutral-500 text-sm">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelectResult(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors flex items-start space-x-3 ${selectedIndex === index ? "bg-neutral-50" : ""
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
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-neutral-500 text-sm">No results found</p>
                <p className="text-neutral-400 text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
