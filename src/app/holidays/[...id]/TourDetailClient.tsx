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

  // Store the referrer URL in sessionStorage when component mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();
      urlSearchParams.forEach((value, key) => {
        params.set(key, value);
      });
      const queryString = params.toString();
      const backUrl = `/holidays${queryString ? `?${queryString}` : ""}`;
      sessionStorage.setItem("tours-back-url", backUrl);
    }
  }, [urlSearchParams]);

  return <>{children}</>;
}

