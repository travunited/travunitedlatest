"use client";

import { useState } from "react";
import { Share2, Facebook, Twitter, Linkedin, MessageCircle, Link as LinkIcon, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  variant?: "full" | "icon-only";
}

export function ShareButton({ url, title, description = "", variant = "full" }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" ? window.location.origin + url : url;
  const shareText = `${title}${description ? ` - ${description}` : ""}`;

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], "_blank", "width=600,height=400");
    setIsOpen(false);
  };

  if (variant === "icon-only") {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
          aria-label="Share"
        >
          <Share2 size={18} className="text-neutral-700" />
        </button>
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-large border border-neutral-200 p-2 z-50 min-w-[180px]"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleShare("facebook");
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-50 transition-colors text-left"
                >
                  <Facebook size={18} className="text-blue-600" />
                  <span className="text-sm text-neutral-700">Facebook</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleShare("twitter");
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-50 transition-colors text-left"
                >
                  <Twitter size={18} className="text-sky-500" />
                  <span className="text-sm text-neutral-700">Twitter</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleShare("linkedin");
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-50 transition-colors text-left"
                >
                  <Linkedin size={18} className="text-blue-700" />
                  <span className="text-sm text-neutral-700">LinkedIn</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleShare("whatsapp");
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-50 transition-colors text-left"
                >
                  <MessageCircle size={18} className="text-green-600" />
                  <span className="text-sm text-neutral-700">WhatsApp</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCopyLink();
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-50 transition-colors text-left"
                >
                  {copied ? (
                    <>
                      <Check size={18} className="text-green-600" />
                      <span className="text-sm text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon size={18} className="text-neutral-600" />
                      <span className="text-sm text-neutral-700">Copy Link</span>
                    </>
                  )}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        aria-label="Share this article"
      >
        <Share2 size={18} />
        <span>Share</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-large border border-neutral-200 p-2 z-50 min-w-[180px]"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleShare("facebook");
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-50 transition-colors text-left"
              >
                <Facebook size={18} className="text-blue-600" />
                <span className="text-sm text-neutral-700">Facebook</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleShare("twitter");
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-50 transition-colors text-left"
              >
                <Twitter size={18} className="text-sky-500" />
                <span className="text-sm text-neutral-700">Twitter</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleShare("linkedin");
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-50 transition-colors text-left"
              >
                <Linkedin size={18} className="text-blue-700" />
                <span className="text-sm text-neutral-700">LinkedIn</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleShare("whatsapp");
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-50 transition-colors text-left"
              >
                <MessageCircle size={18} className="text-green-600" />
                <span className="text-sm text-neutral-700">WhatsApp</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopyLink();
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-neutral-50 transition-colors text-left"
              >
                {copied ? (
                  <>
                    <Check size={18} className="text-green-600" />
                    <span className="text-sm text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <LinkIcon size={18} className="text-neutral-600" />
                    <span className="text-sm text-neutral-700">Copy Link</span>
                  </>
                )}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
