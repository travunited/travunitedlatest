import { useEffect, useRef, useCallback } from "react";

/**
 * Hook for persisting form state to localStorage
 * @param formKey - Unique key for this form (e.g., 'admin-visa-editor', 'admin-tour-editor')
 * @param formState - The form state object to persist
 * @param options - Configuration options
 */
export function useFormPersistence<T extends Record<string, any>>(
  formKey: string,
  formState: T,
  options: {
    enabled?: boolean;
    debounceMs?: number;
    onRestore?: (restoredState: Partial<T>) => void;
    excludeKeys?: string[];
  } = {}
) {
  const {
    enabled = true,
    debounceMs = 500,
    onRestore,
    excludeKeys = [],
  } = options;

  const storageKey = `admin-form-${formKey}`;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoringRef = useRef(false);
  const hasRestoredRef = useRef(false);

  // Restore form state on mount
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || hasRestoredRef.current) {
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const restoredState = JSON.parse(stored);
        // Check if saved state is recent (within 7 days)
        const savedAt = restoredState._savedAt;
        if (savedAt && Date.now() - savedAt < 7 * 24 * 60 * 60 * 1000) {
          isRestoringRef.current = true;
          hasRestoredRef.current = true;
          
          // Remove internal metadata
          const { _savedAt, ...cleanState } = restoredState;
          
          if (onRestore) {
            onRestore(cleanState);
          }
        } else {
          // Clear expired state
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error(`Error restoring form state for ${formKey}:`, error);
    } finally {
      isRestoringRef.current = false;
    }
  }, [formKey, storageKey, enabled, onRestore]);

  // Save form state with debouncing
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || isRestoringRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      try {
        // Create a copy of form state excluding specified keys
        const stateToSave: any = { ...formState };
        excludeKeys.forEach((key) => {
          delete stateToSave[key];
        });

        // Add metadata
        stateToSave._savedAt = Date.now();

        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      } catch (error) {
        console.error(`Error saving form state for ${formKey}:`, error);
        // If quota exceeded, try to clear old entries
        if (error instanceof Error && error.name === "QuotaExceededError") {
          clearOldFormStates();
        }
      }
    }, debounceMs);

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formState, formKey, storageKey, enabled, debounceMs, excludeKeys]);

  // Clear saved state
  const clearSavedState = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(storageKey);
      hasRestoredRef.current = false;
    } catch (error) {
      console.error(`Error clearing form state for ${formKey}:`, error);
    }
  }, [formKey, storageKey]);

  return { clearSavedState };
}

/**
 * Clear all old form states (older than 7 days)
 */
function clearOldFormStates() {
  if (typeof window === "undefined") return;

  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    keys.forEach((key) => {
      if (key.startsWith("admin-form-")) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const data = JSON.parse(stored);
            if (data._savedAt && now - data._savedAt > maxAge) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // If parsing fails, remove the key
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error("Error clearing old form states:", error);
  }
}

