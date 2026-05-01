"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { getMediaProxyUrl } from "@/lib/media";

interface PhotoGalleryProps {
  images: string[];
  tourName: string;
}

export function PhotoGallery({ images, tourName }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const openGallery = (index: number) => {
    setSelectedIndex(index);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
  };

  const closeGallery = () => {
    setSelectedIndex(null);
    document.body.style.overflow = "unset";
  };

  const goToPrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev === null ? null : prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev === null ? null : prev === images.length - 1 ? 0 : prev + 1));
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIndex(null);
        document.body.style.overflow = "unset";
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === null ? null : prev === 0 ? images.length - 1 : prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === null ? null : prev === images.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIndex, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.slice(0, 6).map((src, index) => (
          <div
            key={index}
            onClick={() => openGallery(index)}
            className="relative aspect-video rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-neutral-100 group"
          >
            <ImageWithFallback
              src={getMediaProxyUrl(src) || src || "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&q=80"}
              alt={`${tourName} - Image ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              fallbackSrc="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&q=80"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            {/* View indicator */}
            {index === 5 && images.length > 6 && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-medium text-sm">+{images.length - 6} more</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Carousel Modal */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center cursor-pointer"
          onPointerDown={closeGallery}
          onClick={closeGallery}
        >
          {/* Close Button */}
          <button
            onClick={closeGallery}
            className="absolute top-4 right-4 z-10 text-white hover:text-neutral-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close gallery"
          >
            <X size={28} />
          </button>

          {/* Previous Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 z-10 text-white hover:text-neutral-300 transition-colors p-2 bg-black/50 rounded-full hover:bg-black/70"
              aria-label="Previous image"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {/* Next Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 z-10 text-white hover:text-neutral-300 transition-colors p-2 bg-black/50 rounded-full hover:bg-black/70"
              aria-label="Next image"
            >
              <ChevronRight size={32} />
            </button>
          )}

          {/* Image Container */}
          <div
            className="relative max-w-7xl w-full h-full flex items-center justify-center p-4 md:p-8 cursor-auto"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full max-h-[90vh] flex items-center justify-center">
              <ImageWithFallback
                src={getMediaProxyUrl(images[selectedIndex]) || images[selectedIndex] || "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80"}
                alt={`${tourName} - Image ${selectedIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                fallbackSrc="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80"
                priority
              />
            </div>

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                {selectedIndex + 1} / {images.length}
              </div>
            )}

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4 py-2 bg-black/50 rounded-lg">
                {images.map((src, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(index);
                    }}
                    className={`relative w-16 h-16 md:w-20 md:h-20 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${
                      index === selectedIndex
                        ? "border-white scale-110"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <ImageWithFallback
                      src={getMediaProxyUrl(src) || src || "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&q=80"}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                      fallbackSrc="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&q=80"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

