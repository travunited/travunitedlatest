"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function BackToHolidaysButton() {
  const router = useRouter();
  const [backUrl, setBackUrl] = useState("/holidays");

  useEffect(() => {
    // Try to get the stored back URL from sessionStorage
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("tours-back-url");
      if (stored) {
        setBackUrl(stored);
      } else {
        // Fallback: try to get from browser history or use default
        // Check if we have search params in the current URL
        const currentUrl = window.location.href;
        const url = new URL(currentUrl);
        const params = new URLSearchParams(url.search);
        
        // Build URL with current params
        const queryString = params.toString();
        setBackUrl(`/holidays${queryString ? `?${queryString}` : ""}`);
      }
    }
  }, []);

  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Try to restore filter state from sessionStorage
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("tours-filter-state");
      if (stored) {
        try {
          const filterState = JSON.parse(stored);
          const params = new URLSearchParams();
          
          if (filterState.searchQuery) params.set("destination", filterState.searchQuery);
          if (filterState.selectedCountry !== "all") params.set("country", filterState.selectedCountry);
          if (filterState.selectedRegion !== "all") params.set("region", filterState.selectedRegion);
          if (filterState.selectedTourType !== "all") params.set("tourType", filterState.selectedTourType);
          if (filterState.selectedThemes?.length > 0) params.set("themes", filterState.selectedThemes.join(","));
          if (filterState.durationRange?.[0] > 0) params.set("durationMin", filterState.durationRange[0].toString());
          if (filterState.durationRange?.[1] < 30) params.set("durationMax", filterState.durationRange[1].toString());
          if (filterState.priceRange?.[0] > 0) params.set("priceMin", filterState.priceRange[0].toString());
          if (filterState.priceRange?.[1] < 500000) params.set("priceMax", filterState.priceRange[1].toString());
          if (filterState.onlyFeatured) params.set("featured", "true");
          if (filterState.onlyAdvance) params.set("advance", "true");
          if (filterState.sortOption !== "recommended") params.set("sort", filterState.sortOption);
          
          const queryString = params.toString();
          router.push(`/holidays${queryString ? `?${queryString}` : ""}`);
          return;
        } catch (e) {
          // Fallback to stored URL or default
        }
      }
    }
    
    // Fallback: use stored back URL or default
    router.push(backUrl);
  };

  return (
    <a
      href={backUrl}
      onClick={handleBack}
      className="inline-flex items-center text-white/80 hover:text-white mb-4 text-sm transition-colors"
    >
      ← Back to Holidays
    </a>
  );
}

