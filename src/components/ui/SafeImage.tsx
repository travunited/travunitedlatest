"use client";

import { useState } from "react";
import Image from "next/image";
import { getMediaProxyUrl } from "@/lib/media";

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
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => {
    const proxiedUrl = getMediaProxyUrl(src);
    return proxiedUrl || fallbackSrc;
  });

  const handleError = () => {
    if (!imageError && currentSrc !== fallbackSrc) {
      setImageError(true);
      setCurrentSrc(fallbackSrc);
      onError?.();
    }
  };

  // If Next.js Image fails, fallback to regular img tag
  if (imageError && currentSrc === fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        style={fill ? { width: "100%", height: "100%", objectFit: "cover" } : undefined}
        onError={(e) => {
          // Prevent infinite loop
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = DEFAULT_FALLBACK;
        }}
      />
    );
  }

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
        unoptimized={imageError || currentSrc === fallbackSrc}
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
      unoptimized={imageError || currentSrc === fallbackSrc}
      onError={handleError}
    />
  );
}

