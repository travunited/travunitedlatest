"use client";

import { useState, useEffect } from "react";
import { X, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SampleVisaPreviewProps {
  sampleVisaUrl: string;
}

export function SampleVisaPreview({ sampleVisaUrl }: SampleVisaPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle keyboard navigation (ESC to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Preview Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
      >
        <Eye size={16} className="mr-1" />
        <span>View visa sample</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-pointer"
            onClick={() => setIsOpen(false)}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col cursor-auto"
              onClick={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                <h2 className="text-xl font-bold text-neutral-900">Visa Sample</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                  aria-label="Close preview"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-auto p-6 bg-neutral-50">
                <div className="flex justify-center">
                  <div className="relative max-w-4xl w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sampleVisaUrl}
                      alt="Visa Sample"
                      className="w-full h-auto rounded-lg shadow-lg"
                      style={{ display: "block", maxWidth: "100%", height: "auto" }}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                <p className="text-sm text-neutral-600 text-center">
                  This is a sample visa document for reference purposes only.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

