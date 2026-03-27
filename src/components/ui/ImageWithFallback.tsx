"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getMediaProxyUrl } from "@/lib/media";
import { shouldUseUnoptimizedImage } from "@/lib/image-helpers";

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackSrc?: string;
}

const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80";

export function ImageWithFallback({
  src,
  alt,
  fill = false,
  width,
  height,
  className = "",
  sizes,
  priority = false,
  fallbackSrc = DEFAULT_FALLBACK,
}: ImageWithFallbackProps) {
  const [imageSrc, setImageSrc] = useState(() => {
    const proxiedUrl = getMediaProxyUrl(src);
    return proxiedUrl || fallbackSrc;
  });
  const [errorCount, setErrorCount] = useState(0);

  // Update imageSrc when src or fallbackSrc changes
  useEffect(() => {
    const proxiedUrl = getMediaProxyUrl(src);
    setImageSrc(proxiedUrl || fallbackSrc);
    setErrorCount(0);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (errorCount === 0 && imageSrc !== fallbackSrc) {
      // First failure: try custom fallback
      setErrorCount(1);
      setImageSrc(fallbackSrc);
    } else if (errorCount === 1 && imageSrc !== DEFAULT_FALLBACK) {
      // Second failure: use default fallback
      setErrorCount(2);
      setImageSrc(DEFAULT_FALLBACK);
    }
  };

  // Compute based on the currently displayed src, not the original prop
  const useUnoptimized = shouldUseUnoptimizedImage(imageSrc);

  if (fill) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        unoptimized={useUnoptimized}
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
      unoptimized={useUnoptimized}
      onError={handleError}
    />
  );
}

