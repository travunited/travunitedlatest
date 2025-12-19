"use client";

import { useState } from "react";
import {
  Share2,
  Facebook,
  Twitter,
  MessageCircle,
  Linkedin,
  Link as LinkIcon,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
}

export function ShareButton({
  url,
  title,
  description,
  className = "",
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Use current URL if available, otherwise fall back to provided URL
  const shareUrl = typeof window !== "undefined" ? window.location.href : url;
  const shareTitle = title;
  const shareDescription = description || title;

  const shareOptions = [
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-[#1877F2] hover:bg-[#166FE5]",
      onClick: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          "_blank",
          "width=600,height=400"
        );
        setIsOpen(false);
      },
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "bg-[#1DA1F2] hover:bg-[#1A91DA]",
      onClick: () => {
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
          "_blank",
          "width=600,height=400"
        );
        setIsOpen(false);
      },
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-[#25D366] hover:bg-[#20BA5A]",
      onClick: () => {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${shareTitle} - ${shareUrl}`)}`,
          "_blank"
        );
        setIsOpen(false);
      },
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      color: "bg-[#0077B5] hover:bg-[#006399]",
      onClick: () => {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          "_blank",
          "width=600,height=400"
        );
        setIsOpen(false);
      },
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setIsOpen(false);
        }, 2000);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        aria-label="Share"
      >
        <Share2 size={18} />
        <span>Share</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 z-40"
            />

            {/* Share Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-large border border-neutral-200 p-3 z-50"
            >
              <div className="space-y-2">
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide px-2 py-1">
                  Share via
                </div>
                {shareOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.name}
                      onClick={option.onClick}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white ${option.color} transition-colors text-sm font-medium`}
                    >
                      <Icon size={18} />
                      <span>{option.name}</span>
                    </button>
                  );
                })}
                <div className="border-t border-neutral-200 pt-2 mt-2">
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors text-sm font-medium"
                  >
                    {copied ? (
                      <>
                        <Check size={18} className="text-green-600" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon size={18} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

