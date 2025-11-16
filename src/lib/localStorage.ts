// Utility functions for localStorage management

const STORAGE_KEY = "travunited_visa_draft";

export interface VisaDraft {
  country?: string;
  visaType?: string;
  visaId?: string;
  applicationId?: string;
  travelDate?: string;
  tripType?: string;
  primaryContact?: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  travellers?: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    passportNumber: string;
    passportIssueDate: string;
    passportExpiryDate: string;
    nationality: string;
    currentCity?: string;
  }>;
  documents?: Record<
    string,
    {
      file: File | null;
      preview?: string;
      requirementId?: string;
      travellerIndex?: number;
    }
  >;
  travellerIds?: string[];
  lastUpdated: number;
}

export function saveDraftToLocalStorage(draft: Partial<VisaDraft>) {
  if (typeof window === "undefined") return;
  
  try {
    const existing = getDraftFromLocalStorage();
    const updated = {
      ...existing,
      ...draft,
      lastUpdated: Date.now(),
    };
    
    // Convert File objects to base64 for storage (limited size)
    const serialized = { ...updated };
    if (serialized.documents) {
      const docMetadata: Record<string, any> = {};
      Object.keys(serialized.documents).forEach((key) => {
        const doc = serialized.documents![key];
        if (doc?.file) {
          docMetadata[key] = {
            name: doc.file.name,
            size: doc.file.size,
            type: doc.file.type,
            preview: doc.preview,
            requirementId: doc.requirementId,
            travellerIndex: doc.travellerIndex,
          };
        }
      });
      serialized.documents = docMetadata as any;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error("Error saving draft to localStorage:", error);
  }
}

export function getDraftFromLocalStorage(): Partial<VisaDraft> {
  if (typeof window === "undefined") return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const draft = JSON.parse(stored);
    
    // Check if draft is expired (7 days)
    if (draft.lastUpdated && Date.now() - draft.lastUpdated > 7 * 24 * 60 * 60 * 1000) {
      clearDraftFromLocalStorage();
      return {};
    }
    
    return draft;
  } catch (error) {
    console.error("Error reading draft from localStorage:", error);
    return {};
  }
}

export function clearDraftFromLocalStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

