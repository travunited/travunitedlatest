"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface TourDetailClientProps {
  children: ReactNode;
  searchParams: { [key: string]: string | string[] | undefined };
}

export function TourDetailClient({ children, searchParams }: TourDetailClientProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();

  // Build back URL with preserved filter state
  const buildBackUrl = () => {
    const params = new URLSearchParams();
    
    // Preserve all search params from the detail page URL
    urlSearchParams.forEach((value, key) => {
      params.set(key, value);
    });
    
    const queryString = params.toString();
    return `/holidays${queryString ? `?${queryString}` : ""}`;
  };

  // Store the referrer URL in sessionStorage when component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      const backUrl = buildBackUrl();
      sessionStorage.setItem("tours-back-url", backUrl);
    }
  }, [urlSearchParams]);

  return <>{children}</>;
}

