"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ContentProtection() {
  const pathname = usePathname();
  const [showWarning, setShowWarning] = useState(false);

  // Don't apply protection to dashboard or admin routes
  const isProtectedRoute = !pathname?.startsWith("/dashboard") && !pathname?.startsWith("/admin");

  useEffect(() => {
    if (!isProtectedRoute) return;

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable text selection (but allow in form inputs)
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      // Allow selection in form inputs, textareas, and contenteditable elements
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("input, textarea, [contenteditable='true']")
      ) {
        return true;
      }
      e.preventDefault();
      return false;
    };

    // Disable drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Ctrl+C, Ctrl+A, Ctrl+S, Ctrl+P, Ctrl+U, Ctrl+Shift+I, F12
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" ||
          e.key === "C" ||
          e.key === "a" ||
          e.key === "A" ||
          e.key === "s" ||
          e.key === "S" ||
          e.key === "p" ||
          e.key === "P" ||
          e.key === "u" ||
          e.key === "U" ||
          (e.shiftKey && (e.key === "I" || e.key === "i")))
      ) {
        e.preventDefault();
        return false;
      }

      // Disable F12 (Developer Tools)
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }

      // Disable Ctrl+Shift+C (Chrome DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        return false;
      }
    };

    // Disable copy event
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      // Allow copying from form inputs
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
      
      // Show warning message
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 2000);
      
      return false;
    };

    // Disable cut event
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);

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
      
      a, button, input, textarea, select, [contenteditable="true"] {
        -webkit-user-select: auto !important;
        -moz-user-select: auto !important;
        -ms-user-select: auto !important;
        user-select: auto !important;
      }
      
      /* Allow selection in form inputs and textareas */
      input[type="text"],
      input[type="email"],
      input[type="password"],
      input[type="number"],
      input[type="tel"],
      input[type="url"],
      input[type="search"],
      textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
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
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      
      // Remove style element
      const styleElement = document.getElementById("content-protection-styles");
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, [isProtectedRoute]);

  // Add overlay to prevent image dragging (only on protected routes)
  if (!isProtectedRoute) return null;

  return (
    <>
      {/* Invisible overlay to prevent dragging */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 999999,
          pointerEvents: "none",
          background: "transparent",
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
      
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

