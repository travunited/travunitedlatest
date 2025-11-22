"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getMediaProxyUrl } from "@/lib/media";

interface RobustImageProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackSrc?: string;
  onError?: () => void;
}

const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80";

export function RobustImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className = "",
  sizes,
  priority = false,
  fallbackSrc = DEFAULT_FALLBACK,
  onError,
}: RobustImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(() => {
    const proxiedUrl = getMediaProxyUrl(src);
    return proxiedUrl || fallbackSrc;
  });
  const [useUnoptimized, setUseUnoptimized] = useState(false);

  // Check if URL is external and should use unoptimized
  useEffect(() => {
    if (imageSrc && !imageSrc.startsWith("/") && !imageSrc.includes("/api/media")) {
      try {
        const url = new URL(imageSrc);
        // Use unoptimized for external URLs to avoid 400/429 errors
        setUseUnoptimized(true);
      } catch {
        // Invalid URL, use fallback
        setImageSrc(fallbackSrc);
      }
    }
  }, [imageSrc, fallbackSrc]);

  const handleError = () => {
    if (!imageError && imageSrc !== fallbackSrc) {
      // First error: try fallback
      setImageError(true);
      setUseUnoptimized(true);
      setImageSrc(fallbackSrc);
      onError?.();
    } else if (imageSrc !== DEFAULT_FALLBACK) {
      // Second error: use default placeholder
      setImageSrc(DEFAULT_FALLBACK);
      setUseUnoptimized(true);
    }
  };

  // Use Next.js Image for fallback to avoid ESLint warnings
  // All fallbacks use unoptimized mode since they're external URLs

  // Use Next.js Image for better optimization (when it works)
  if (fill) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        unoptimized={useUnoptimized || imageError}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width || 800}
      height={height || 600}
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized={useUnoptimized || imageError}
      onError={handleError}
    />
  );
}

