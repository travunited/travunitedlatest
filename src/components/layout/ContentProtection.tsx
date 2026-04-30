"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ContentProtection() {
  const pathname = usePathname();
  const [showWarning, setShowWarning] = useState(false);

  // Don't apply protection to dashboard, admin, or apply routes
  const isProtectedRoute = !pathname?.startsWith("/dashboard") && !pathname?.startsWith("/admin") && !pathname?.startsWith("/apply");

  useEffect(() => {
    if (!isProtectedRoute) return;

    // Disable drag and drop of images/content
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable desktop keyboard shortcuts (Ctrl+C, Ctrl+A, etc.)
    // NOTE: only runs on non-touch devices to avoid blocking mobile taps
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" || e.key === "C" ||
          e.key === "a" || e.key === "A" ||
          e.key === "s" || e.key === "S" ||
          e.key === "p" || e.key === "P" ||
          e.key === "u" || e.key === "U" ||
          (e.shiftKey && (e.key === "I" || e.key === "i")))
      ) {
        e.preventDefault();
        return false;
      }
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
    };

    // Disable copy from non-input elements (desktop only)
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("input, textarea, [contenteditable='true']")
      ) {
        return true;
      }
      e.preventDefault();
      e.clipboardData?.setData("text/plain", "");
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 2000);
      return false;
    };

    // Add event listeners
    // IMPORTANT: contextmenu and selectstart are intentionally NOT registered here.
    // On iOS/Android, calling preventDefault() on contextmenu blocks the subsequent
    // click event — taps feel like "selections" instead of navigating. The CSS
    // user-select:none + -webkit-touch-callout:none already handles mobile protection.
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", handleCopy);

    // Add CSS to prevent text selection
    const style = document.createElement("style");
    style.id = "content-protection-styles";
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      img, picture, svg {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
        pointer-events: auto !important;
      }
      
      /* Links and buttons must NOT be text-selectable — taps should fire clicks */
      a, button, [role="button"], label,
      nav, [role="navigation"], [role="menu"], [role="menuitem"] {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }

      /* Allow selection in form inputs and textareas */
      input, textarea, select, [contenteditable="true"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        -webkit-touch-callout: default !important;
      }
    `;

    // Remove existing style if present
    const existingStyle = document.getElementById("content-protection-styles");
    if (existingStyle) {
      existingStyle.remove();
    }

    document.head.appendChild(style);

    // Cleanup
    return () => {
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", handleCopy);

      const styleElement = document.getElementById("content-protection-styles");
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, [isProtectedRoute]);

  if (!isProtectedRoute) return null;

  return (
    <>

      {/* Warning message when copy is attempted */}
      {showWarning && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "8px",
            zIndex: 1000000,
            fontSize: "14px",
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            pointerEvents: "none",
            animation: "contentProtectionFadeInOut 2s ease-in-out",
          }}
        >
          Content is protected. Copying is not allowed.
        </div>
      )}
    </>
  );
}

