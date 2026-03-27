"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getMediaProxyUrl } from "@/lib/media";
import { shouldUseUnoptimizedImage } from "@/lib/image-helpers";

interface SafeImageProps {
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

export function SafeImage({
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
}: SafeImageProps) {
  const [currentSrc, setCurrentSrc] = useState(() => {
    const proxiedUrl = getMediaProxyUrl(src);
    return proxiedUrl || fallbackSrc;
  });
  const [errorCount, setErrorCount] = useState(0);

  // Update currentSrc when src or fallbackSrc changes
  useEffect(() => {
    const proxiedUrl = getMediaProxyUrl(src);
    setCurrentSrc(proxiedUrl || fallbackSrc);
    setErrorCount(0);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (errorCount === 0 && currentSrc !== fallbackSrc) {
      // First failure: try custom fallback
      setErrorCount(1);
      setCurrentSrc(fallbackSrc);
      onError?.();
    } else if (errorCount === 1 && currentSrc !== DEFAULT_FALLBACK) {
      // Second failure: use default fallback
      setErrorCount(2);
      setCurrentSrc(DEFAULT_FALLBACK);
    }
  };

  // Use Next.js Image for fallback to avoid ESLint warnings
  // All fallbacks use unoptimized mode since they're external URLs

  // Use Next.js Image for better optimization
  if (fill) {
    return (
      <Image
        src={currentSrc}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        unoptimized={shouldUseUnoptimizedImage(currentSrc)}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={width || 800}
      height={height || 600}
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized={shouldUseUnoptimizedImage(currentSrc)}
      onError={handleError}
    />
  );
}

