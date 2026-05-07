"use client";

import { useState } from "react";
import { Share2, Facebook, Linkedin, MessageCircle, Instagram, Link as LinkIcon, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon } from "./XIcon";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  variant?: "full" | "icon-only";
}

export function ShareButton({ url, title, description = "", image, variant = "full" }: ShareButtonProps) {
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

  const handleShare = async (platform: keyof typeof shareLinks | "instagram") => {
    // Try to use Web Share API for supported platforms if image is available and it's a mobile/capable device
    // This allows sharing the actual image file
    if (image && typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // For general share (if we were to add a generic 'Share' button) or if the platform is implicit
      // Here we intercept specific platform clicks if we want to force native share, but typically
      // native share is triggered by a specific generic share button. 
      // However, the user request is specifically about sharing the image.
      // If the user clicks a specific platform button like 'WhatsApp' in our custom UI, 
      // we usually just open the link. 
      // But let's try to be smart: if they click a platform and we have an image, 
      // and we are on mobile, maybe we can try to use the native share which supports images?
      // Actually, standard behavior for custom UI buttons is to just open the web intent.
      // Web Share API usually shares to a system picker, not a specific app directly (on web).

      // So, let's keep the specific platform buttons as they are (web intents), 
      // BUT for Instagram which doesn't have a web intent, we might want to try 
      // native share if available, otherwise copy link.
    }

    if (platform === "instagram") {
      // Try Web Share API Level 2 for files if available (mostly mobile)
      if (image && typeof navigator !== "undefined" && navigator.share) {
        try {
          // We need to fetch the image and convert to File
          const response = await fetch(image);
          const blob = await response.blob();
          const file = new File([blob], "share-image.jpg", { type: blob.type });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: title,
              text: shareText,
              url: shareUrl,
            });
            setIsOpen(false);
            return;
          }
        } catch (error) {
          console.error("Error sharing file:", error);
          // Fallback to copy link below
        }
      }

      // Fallback: Copy link
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          setIsOpen(false);
        }, 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
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
        } catch (error) {
          console.error("Fallback copy failed:", error);
        }
        document.body.removeChild(textArea);
      }
    } else {
      window.open(shareLinks[platform as keyof typeof shareLinks], "_blank", "width=600,height=400");
      setIsOpen(false);
    }
  };

  if (variant === "icon-only") {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
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
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-large border border-neutral-200 p-2 z-50 min-w-[180px]"
              >
                <button
                  onClick={() => handleShare("facebook")}
                  className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
                >
                  <Facebook size={18} className="text-blue-600" />
                  <span className="text-sm text-neutral-700">Facebook</span>
                </button>
                <button
                  onClick={() => handleShare("twitter")}
                  className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
                >
                  <XIcon size={18} className="text-neutral-900" />
                  <span className="text-sm text-neutral-700">X</span>
                </button>
                <button
                  onClick={() => handleShare("linkedin")}
                  className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
                >
                  <Linkedin size={18} className="text-blue-700" />
                  <span className="text-sm text-neutral-700">LinkedIn</span>
                </button>
                <button
                  onClick={() => handleShare("instagram")}
                  className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
                >
                  <Instagram size={18} className="text-pink-600" />
                  <span className="text-sm text-neutral-700">Instagram</span>
                </button>
                <button
                  onClick={() => handleShare("whatsapp")}
                  className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
                >
                  <MessageCircle size={18} className="text-green-600" />
                  <span className="text-sm text-neutral-700">WhatsApp</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
              onPointerDown={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-large border border-neutral-200 p-2 z-50 min-w-[180px]"
            >
              <button
                onClick={() => handleShare("facebook")}
                className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
              >
                <Facebook size={18} className="text-blue-600" />
                <span className="text-sm text-neutral-700">Facebook</span>
              </button>
              <button
                onClick={() => handleShare("twitter")}
                className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
              >
                <XIcon size={18} className="text-neutral-900" />
                <span className="text-sm text-neutral-700">X</span>
              </button>
              <button
                onClick={() => handleShare("linkedin")}
                className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
              >
                <Linkedin size={18} className="text-blue-700" />
                <span className="text-sm text-neutral-700">LinkedIn</span>
              </button>
              <button
                onClick={() => handleShare("instagram")}
                className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
              >
                <Instagram size={18} className="text-pink-600" />
                <span className="text-sm text-neutral-700">Instagram</span>
              </button>
              <button
                onClick={() => handleShare("whatsapp")}
                className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
              >
                <MessageCircle size={18} className="text-green-600" />
                <span className="text-sm text-neutral-700">WhatsApp</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center space-x-3 px-3 min-h-[44px] rounded-md hover:bg-neutral-50 transition-colors text-left"
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
