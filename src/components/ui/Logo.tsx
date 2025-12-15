"use client";

import { useState } from "react";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({ width = 140, height = 56, className = "h-14 w-auto", priority = false }: LogoProps) {
  const [useFallback, setUseFallback] = useState(false);

  // Try SVG first, fallback to PNG if SVG fails to load
  return (
    <img
      src={useFallback ? "/logo.png" : "/logo.svg"}
      alt="Travunited Logo"
      width={width}
      height={height}
      className={className}
      onError={() => {
        if (!useFallback) {
          setUseFallback(true);
        }
      }}
      loading={priority ? "eager" : "lazy"}
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
}

