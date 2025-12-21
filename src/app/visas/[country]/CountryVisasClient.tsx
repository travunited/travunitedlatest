"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

interface CountryVisasClientProps {
  children: React.ReactNode;
}

export function CountryVisasClient({ children }: CountryVisasClientProps) {
  const pathname = usePathname();

  // Store the country page URL in sessionStorage when component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Store the current path as the back URL for visa detail pages
      sessionStorage.setItem("visas-country-back-url", pathname);
    }
  }, [pathname]);

  return <>{children}</>;
}

