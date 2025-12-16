"use client";

import { useEffect } from "react";

/**
 * Handles ChunkLoadError by automatically retrying or prompting user to refresh
 * This is a common issue after deployments when old chunks are no longer available
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      const error = event.error;
      
      // Check if it's a ChunkLoadError
      if (
        error?.name === "ChunkLoadError" ||
        error?.message?.includes("Loading chunk") ||
        error?.message?.includes("Failed to fetch dynamically imported module")
      ) {
        console.warn("ChunkLoadError detected, attempting to recover...", error);
        
        // Try to reload the page after a short delay
        // This will fetch the latest chunks from the server
        const retryCount = parseInt(sessionStorage.getItem("chunkRetryCount") || "0", 10);
        
        if (retryCount < 2) {
          // Retry up to 2 times
          sessionStorage.setItem("chunkRetryCount", String(retryCount + 1));
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          // After 2 retries, show a user-friendly message
          sessionStorage.removeItem("chunkRetryCount");
          const shouldReload = window.confirm(
            "The page needs to be refreshed to load the latest version. Click OK to refresh now."
          );
          if (shouldReload) {
            window.location.reload();
          }
        }
        
        // Prevent the error from bubbling up
        event.preventDefault();
        return false;
      }
    };

    // Listen for unhandled errors
    window.addEventListener("error", handleChunkError, true);
    
    // Also listen for unhandled promise rejections (chunk errors can be promises)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (
        reason?.name === "ChunkLoadError" ||
        reason?.message?.includes("Loading chunk") ||
        reason?.message?.includes("Failed to fetch dynamically imported module")
      ) {
        console.warn("ChunkLoadError in promise rejection, attempting to recover...", reason);
        handleChunkError(new ErrorEvent("error", { error: reason }));
        event.preventDefault();
      }
    };
    
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // Reset retry count on successful page load
    sessionStorage.removeItem("chunkRetryCount");

    return () => {
      window.removeEventListener("error", handleChunkError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}

