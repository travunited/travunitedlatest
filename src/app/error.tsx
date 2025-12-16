"use client";

import { useEffect } from "react";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error("Application error:", error);
    
    // Check if it's a ChunkLoadError and automatically reload
    const isChunkError = 
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Failed to fetch dynamically imported module");
    
    if (isChunkError) {
      console.warn("ChunkLoadError detected, reloading page...");
      // Reload after a short delay to allow user to see the error message
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [error]);
  
  const isChunkError = 
    error?.name === "ChunkLoadError" ||
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("Failed to fetch dynamically imported module");

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-large p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
          <AlertCircle size={32} className="text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          {isChunkError ? "Page Update Required" : "Something went wrong!"}
        </h1>
        
        <p className="text-neutral-600 mb-6">
          {isChunkError 
            ? "The page needs to be refreshed to load the latest version. This usually happens after a site update. The page will reload automatically in a moment."
            : "We encountered an unexpected error. Please try again or return to the homepage."}
        </p>
        
        {error.digest && (
          <p className="text-xs text-neutral-400 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
          >
            <Home size={18} />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

