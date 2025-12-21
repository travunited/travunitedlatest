"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function BackToVisasButton({ 
  countryCode, 
  countryName 
}: { 
  countryCode?: string;
  countryName?: string;
}) {
  const router = useRouter();
  const [backUrl, setBackUrl] = useState(countryCode ? `/visas/${countryCode}` : "/visas");
  const [backText, setBackText] = useState(countryName ? `← Back to ${countryName} Visas` : "← Back to Visas");

  useEffect(() => {
    // Try to get the stored back URL from sessionStorage
    if (typeof window !== "undefined") {
      // First check if we have a country-specific back URL (user came from country page)
      const countryBackUrl = sessionStorage.getItem("visas-country-back-url");
      if (countryBackUrl) {
        setBackUrl(countryBackUrl);
        setBackText(countryName ? `← Back to ${countryName} Visas` : "← Back to Visas");
        return;
      }
      
      // Otherwise check for main visas page back URL (user came from main visas page)
      const stored = sessionStorage.getItem("visas-back-url");
      if (stored) {
        // Check if stored URL is the main visas page or country-specific
        if (stored.startsWith("/visas?")) {
          // Going back to main visas page with filters
          setBackUrl("/visas");
          setBackText("← Back to Visas");
        } else {
          setBackUrl(stored);
          // If it's a country URL, update text accordingly
          if (stored.startsWith("/visas/") && countryName) {
            setBackText(`← Back to ${countryName} Visas`);
          }
        }
      } else {
        // Fallback: use country-specific URL or default
        if (countryCode) {
          setBackUrl(`/visas/${countryCode}`);
          setBackText(countryName ? `← Back to ${countryName} Visas` : "← Back to Visas");
        } else {
          setBackUrl("/visas");
          setBackText("← Back to Visas");
        }
      }
    }
  }, [countryCode, countryName]);

  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    if (typeof window !== "undefined") {
      // First check if user came from country page
      const countryBackUrl = sessionStorage.getItem("visas-country-back-url");
      if (countryBackUrl) {
        router.push(countryBackUrl);
        return;
      }
      
      // Otherwise check if user came from main visas page with filters
      const storedBackUrl = sessionStorage.getItem("visas-back-url");
      if (storedBackUrl && storedBackUrl.startsWith("/visas")) {
        // Going back to main visas page - restore filters if available
        const stored = sessionStorage.getItem("visas-filter-state");
        if (stored) {
          try {
            const filterState = JSON.parse(stored);
            const params = new URLSearchParams();
            
            if (filterState.searchQuery) params.set("search", filterState.searchQuery);
            if (filterState.selectedRegion !== "all") params.set("region", filterState.selectedRegion);
            if (filterState.sortOption !== "alpha") params.set("sort", filterState.sortOption);
            
            const queryString = params.toString();
            router.push(`/visas${queryString ? `?${queryString}` : ""}`);
            return;
          } catch (e) {
            // Fallback to stored URL or default
          }
        }
        // Use stored URL if it exists
        router.push(storedBackUrl);
        return;
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
      {backText}
    </a>
  );
}

