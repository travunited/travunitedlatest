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
    backendSync?: boolean;
    backendEndpoint?: string;
  } = {}
) {
  const {
    enabled = true,
    debounceMs = 500,
    onRestore,
    excludeKeys = [],
    backendSync = false,
    backendEndpoint,
  } = options;

  const storageKey = `admin-form-${formKey}`;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoringRef = useRef(false);
  const hasRestoredRef = useRef(false);
  const formStateRef = useRef(formState);
  
  // Keep formStateRef in sync with formState
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  // Restore form state on mount
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || hasRestoredRef.current) {
      return;
    }

    // Use a small delay to ensure component is fully mounted
    const restoreTimer = setTimeout(() => {
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
            
            console.log(`Draft found for ${formKey}, restoring...`, cleanState);
            
            if (onRestore) {
              onRestore(cleanState);
            }
          } else {
            // Clear expired state
            console.log(`Draft expired for ${formKey}, clearing...`);
            localStorage.removeItem(storageKey);
          }
        } else {
          console.log(`No draft found for ${formKey}`);
        }
      } catch (error) {
        console.error(`Error restoring form state for ${formKey}:`, error);
      } finally {
        isRestoringRef.current = false;
      }
    }, 50); // Small delay to ensure component is ready

    return () => clearTimeout(restoreTimer);
  }, [formKey, storageKey, enabled, onRestore]);

  // Function to save form state
  const saveFormState = useCallback(async () => {
    if (!enabled || typeof window === "undefined" || isRestoringRef.current) {
      return;
    }

    try {
      // Create a copy of form state excluding specified keys
      const stateToSave: any = { ...formStateRef.current };
      excludeKeys.forEach((key) => {
        delete stateToSave[key];
      });

      // Add metadata
      stateToSave._savedAt = Date.now();

      // Save to localStorage (always)
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      console.log(`Draft saved for ${formKey}`, { timestamp: new Date().toISOString() });

      // Optionally sync to backend
      if (backendSync && backendEndpoint) {
        try {
          await fetch(backendEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stateToSave),
          });
        } catch (backendError) {
          // Backend sync failure shouldn't block localStorage save
          console.warn(`Backend draft sync failed for ${formKey}:`, backendError);
        }
      }
    } catch (error) {
      console.error(`Error saving form state for ${formKey}:`, error);
      // If quota exceeded, try to clear old entries
      if (error instanceof Error && error.name === "QuotaExceededError") {
        clearOldFormStates();
        // Try saving again after clearing old entries
        try {
          const stateToSave: any = { ...formStateRef.current };
          excludeKeys.forEach((key) => {
            delete stateToSave[key];
          });
          stateToSave._savedAt = Date.now();
          localStorage.setItem(storageKey, JSON.stringify(stateToSave));
        } catch (retryError) {
          console.error(`Error saving form state after cleanup for ${formKey}:`, retryError);
        }
      }
    }
  }, [formKey, storageKey, enabled, excludeKeys, backendSync, backendEndpoint]);

  // Save form state with debouncing on changes
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
      saveFormState();
    }, debounceMs);

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formState, debounceMs, saveFormState, enabled]);

  // Save immediately on window blur (user switches tabs/windows)
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const handleBlur = () => {
      // Clear any pending debounced save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Save immediately (fire and forget)
      saveFormState().catch(err => console.error("Error saving on blur:", err));
    };

    const handleBeforeUnload = () => {
      // Save immediately before page unload (synchronous localStorage only)
      // Note: async operations may not complete before page unloads
      try {
        const stateToSave: any = { ...formStateRef.current };
        excludeKeys.forEach((key) => {
          delete stateToSave[key];
        });
        stateToSave._savedAt = Date.now();
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      } catch (error) {
        console.error("Error saving on beforeunload:", error);
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, saveFormState]);

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

