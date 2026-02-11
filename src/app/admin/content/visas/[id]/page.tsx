"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  CheckCircle,
  FileText,
  Download,
  Edit2,
  Upload,
  X,
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { getMediaProxyUrl } from "@/lib/media";
import { TextInput, NumberInput, TextareaInput, SelectInput, CheckboxInput } from "@/components/admin/MemoizedInputs";

type DocScope = "PER_TRAVELLER" | "PER_APPLICATION";

interface FormState {
  countryId: string;
  name: string;
  slug: string;
  subtitle: string;
  category: string;
  isActive: boolean;
  isFeatured: boolean;
  priceInInr: number;
  processingTime: string;
  stayDuration: string;
  validity: string;
  entryType: string; // structured enum value (SINGLE/DOUBLE/MULTIPLE)
  entryTypeLegacy: string;
  visaMode: string;
  stayType: string;
  visaSubTypeLabel: string;
  overview: string;
  eligibility: string;
  importantNotes: string;
  rejectionReasons: string;
  whyTravunited: string;
  statistics: string;
  heroImageUrl: string;
  metaTitle: string;
  metaDescription: string;
  sampleVisaImageUrl: string;
  currency: string;
}

interface RequirementState {
  uid: string;
  name: string;
  scope: DocScope;
  isRequired: boolean;
  category: string;
  description: string;
  sortOrder: number;
}

interface FaqState {
  uid: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
}


interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  fileKey: string;
  fileName: string;
  fileSize: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface CountryOption {
  id: string;
  name: string;
}

const CATEGORY_OPTIONS = [
  "Employment",
  "Business",
  "Tourist",
  "Student",
  "Transit",
  "Medical",
  "Other"
];
const ENTRY_TYPE_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "SINGLE", label: "Single Entry" },
  { value: "DOUBLE", label: "Double Entry" },
  { value: "MULTIPLE", label: "Multiple Entry" },
];
const VISA_MODE_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "EVISA", label: "eVisa" },
  { value: "E_VISA", label: "E-VISA" },
  { value: "STICKER", label: "Sticker" },
  { value: "VOA", label: "Visa on Arrival (VOA)" },
  { value: "VFS", label: "VFS Appointment" },
  { value: "ETA", label: "ETA" },
  { value: "PRE_ENROLLMENT", label: "Pre Enrollment" },
  { value: "ARRIVAL_CARD", label: "Arrival Card" },
  { value: "VISA_FREE_ENTRY", label: "Visa Free Entry" },
  { value: "SCHENGEN_VISA", label: "Schengen Visa" },
  { value: "APPOINTMENTS", label: "Appointments" },
  { value: "OTHER", label: "Other" },
];
const STAY_TYPE_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "SHORT_STAY", label: "Short Stay" },
  { value: "LONG_STAY", label: "Long Stay" },
];
const SCOPE_OPTIONS: { label: string; value: DocScope }[] = [
  { label: "Per Traveller", value: "PER_TRAVELLER" },
  { label: "Per Application", value: "PER_APPLICATION" },
];
const COMMON_SUBTYPE_LABELS = [
  "Single Entry eVisa",
  "Multiple Entry eVisa",
  "Single Entry Sticker Visa",
  "Multiple Entry Sticker Visa",
  "Visa on Arrival (VOA)",
  "Transit Visa",
  "Tourist Visa",
  "Business Visa",
  "Medical Visa",
  "Student Visa",
  "Employment Visa",
  "Short Stay Visa",
  "Long Stay Visa",
  "Single Entry",
  "Double Entry",
  "Multiple Entry",
];

const uid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function AdminVisaEditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const cloneSourceId = searchParams?.get("clone");

  const isNew = params.id === "new";
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [formData, setFormData] = useState<FormState>({
    countryId: "",
    name: "",
    slug: "",
    subtitle: "",
    category: "Tourist",
    isActive: true,
    isFeatured: false,
    priceInInr: 0,
    processingTime: "",
    stayDuration: "",
    validity: "",
    entryType: "",
    entryTypeLegacy: "",
    visaMode: "",
    stayType: "",
    visaSubTypeLabel: "",
    overview: "",
    eligibility: "",
    importantNotes: "",
    rejectionReasons: "",
    whyTravunited: "",
    statistics: "",
    heroImageUrl: "",
    metaTitle: "",
    metaDescription: "",
    sampleVisaImageUrl: "",
    currency: "INR",
  });
  const [requirements, setRequirements] = useState<RequirementState[]>([]);
  const [faqs, setFaqs] = useState<FaqState[]>([]);
  const [heroImageMode, setHeroImageMode] = useState<"url" | "upload">("url");
  const [sampleVisaImageMode, setSampleVisaImageMode] = useState<"url" | "upload">("url");
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [heroImageUploadError, setHeroImageUploadError] = useState<string | null>(null);
  const [sampleVisaImageUploading, setSampleVisaImageUploading] = useState(false);
  const [sampleVisaImageUploadError, setSampleVisaImageUploadError] = useState<string | null>(null);

  // Template Management State
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);

  // Form persistence - save form state to localStorage
  const formPersistenceKey = `visa-editor-${params.id}`;
  const [isInitialized, setIsInitialized] = useState(false);
  const [showDraftSaved, setShowDraftSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const initialFormStateRef = useRef<any>(null);
  const isRestoringRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const combinedFormState = useMemo(() => ({
    formData,
    requirements,
    faqs,
    activeTab,
    heroImageMode,
    sampleVisaImageMode,
  }), [formData, requirements, faqs, activeTab, heroImageMode, sampleVisaImageMode]);

  // Track if form has unsaved changes (compare against initial state after restore/server load)
  useEffect(() => {
    if (isInitialized && initialFormStateRef.current) {
      const currentState = JSON.stringify(combinedFormState);
      const initialState = JSON.stringify(initialFormStateRef.current);
      setHasUnsavedChanges(currentState !== initialState);
    }
  }, [combinedFormState, isInitialized]);

  // Set initial state reference after form is fully initialized (restore + server load complete)
  useEffect(() => {
    if (isInitialized && !initialFormStateRef.current && !isRestoringRef.current) {
      // Use a small delay to ensure all state updates have settled
      const timer = setTimeout(() => {
        initialFormStateRef.current = JSON.parse(JSON.stringify(combinedFormState));
        console.log("Initial state captured for unsaved changes tracking");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, combinedFormState]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Protect against Next.js router navigation with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (link && link.href && !link.href.includes("#")) {
        const confirmed = window.confirm(
          "You have unsaved changes. Your draft will be saved automatically, but are you sure you want to leave this page?"
        );
        if (!confirmed) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener("click", handleLinkClick, true);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [hasUnsavedChanges]);

  // Custom save handler that shows feedback
  const handleAutoSave = useCallback(() => {
    if (!isInitialized || isRestoringRef.current || typeof window === "undefined" || isNew) {
      return;
    }

    try {
      const stateToSave = { ...combinedFormState, _savedAt: Date.now() };
      const storageKey = `admin-form-${formPersistenceKey}`;
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      setLastSaveTime(Date.now());

      // Show subtle feedback
      setShowDraftSaved(true);
      setTimeout(() => {
        setShowDraftSaved(false);
      }, 2000);
    } catch (error) {
      console.error("Error auto-saving draft:", error);
    }
  }, [formPersistenceKey, combinedFormState, isInitialized]);

  // Debounced auto-save on form changes
  useEffect(() => {
    if (!isInitialized || isRestoringRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave();
    }, 1000); // 1 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [combinedFormState, isInitialized, handleAutoSave]);

  // Save on window blur/unload
  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return;

    const handleBlur = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      handleAutoSave();
    };

    const handleBeforeUnload = () => {
      // Synchronous save for beforeunload
      try {
        const stateToSave = { ...combinedFormState, _savedAt: Date.now() };
        const storageKey = `admin-form-${formPersistenceKey}`;
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
  }, [isInitialized, combinedFormState, formPersistenceKey, handleAutoSave]);

  // Restore draft on mount (for new forms or before server data loads)
  useEffect(() => {
    if (isInitialized || typeof window === "undefined") return;

    const restoreDraft = () => {
      try {
        const storageKey = `admin-form-${formPersistenceKey}`;
        const stored = localStorage.getItem(storageKey);

        if (!stored) {
          console.log("No draft found for", formPersistenceKey);
          return false;
        }

        const restoredState = JSON.parse(stored);
        const savedAt = restoredState._savedAt;

        // Check if draft is recent (within 7 days)
        if (!savedAt || Date.now() - savedAt > 7 * 24 * 60 * 60 * 1000) {
          console.log("Draft expired, clearing");
          localStorage.removeItem(storageKey);
          return false;
        }

        // Remove metadata
        const { _savedAt, ...cleanState } = restoredState;

        if (Object.keys(cleanState).length === 0) {
          return false;
        }

        console.log("Restoring draft for", formPersistenceKey, cleanState);
        isRestoringRef.current = true;

        // Restore state
        if (cleanState.formData) {
          setFormData(cleanState.formData);
        }
        if (cleanState.requirements && Array.isArray(cleanState.requirements)) {
          setRequirements(cleanState.requirements);
        }
        if (cleanState.faqs && Array.isArray(cleanState.faqs)) {
          setFaqs(cleanState.faqs);
        }
        if (cleanState.activeTab) {
          setActiveTab(cleanState.activeTab);
        }
        if (cleanState.heroImageMode) {
          setHeroImageMode(cleanState.heroImageMode);
        }
        if (cleanState.sampleVisaImageMode) {
          setSampleVisaImageMode(cleanState.sampleVisaImageMode);
        }

        // Show restoration notification
        setShowDraftSaved(true);
        setTimeout(() => setShowDraftSaved(false), 3000);

        // Reset restoring flag after state updates settle
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 200);

        return true;
      } catch (error) {
        console.error("Error restoring draft:", error);
        isRestoringRef.current = false;
        return false;
      }
    };

    // For new forms, no draft restoration
    if (isNew) {
      setTimeout(() => {
        setIsInitialized(true);
      }, 100);
    }
    // For existing forms, restore will happen in hydrateFromVisa
  }, [isNew, formPersistenceKey, isInitialized]);

  // Clear saved state function
  const clearSavedState = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const storageKey = `admin-form-${formPersistenceKey}`;
      localStorage.removeItem(storageKey);
      initialFormStateRef.current = null;
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error clearing saved state:", error);
    }
  }, [formPersistenceKey]);

  const tabs = useMemo(
    () => [
      { id: "basic", label: "Basic Info" },
      { id: "pricing", label: "Pricing & Details" },
      { id: "content", label: "Content" },
      { id: "documents", label: "Documents & Process" },
      { id: "faqs", label: "FAQs" },
      { id: "media", label: "Media & SEO" },
    ],
    []
  );

  // Memoize tab click handler to prevent recreating on every render
  const handleTabClick = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  const fetchCountries = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content/countries");
      if (response.ok) {
        const data = await response.json();
        setCountries(
          data.map((country: any) => ({
            id: country.id,
            name: country.name,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load countries", error);
    }
  }, []);

  const hydrateFromVisa = (data: any, isClone = false) => {
    // Check if there's a draft to merge with server data
    const draftKey = `admin-form-${formPersistenceKey}`;
    let draftData: any = null;
    let shouldUseDraft = false;

    // Only check drafts for existing visas, not new ones
    if (!isNew) {
      try {
        const stored = localStorage.getItem(draftKey);
        if (stored) {
          draftData = JSON.parse(stored);
          const draftSavedAt = draftData._savedAt;
          // If draft exists and is recent (within 7 days), merge it with server data
          if (draftSavedAt && Date.now() - draftSavedAt < 7 * 24 * 60 * 60 * 1000) {
            shouldUseDraft = true;
            console.log("Found draft to merge with server data for existing visa");
          }
        }
      } catch (error) {
        console.error("Error checking draft:", error);
      }
    }

    isRestoringRef.current = true;

    // Base form data from server
    const baseFormData = {
      countryId: data.countryId,
      name: isClone ? `${data.name} Copy` : data.name,
      slug: isClone ? `${data.slug}-copy` : data.slug,
      subtitle: data.subtitle || "",
      category: data.category || "TOURIST",
      isActive: isClone ? false : data.isActive,
      isFeatured: isClone ? false : data.isFeatured,
      priceInInr: data.priceInInr,
      processingTime: data.processingTime || "",
      stayDuration: data.stayDuration || "",
      validity: data.validity || "",
      entryType: data.entryType || "",
      entryTypeLegacy: data.entryTypeLegacy || "",
      visaMode: data.visaMode || "EVISA",
      stayType: data.stayType || "",
      visaSubTypeLabel: data.visaSubTypeLabel || "",
      overview: data.overview || "",
      eligibility: data.eligibility || "",
      importantNotes: data.importantNotes || "",
      rejectionReasons: data.rejectionReasons || "",
      whyTravunited: data.whyTravunited || "",
      statistics: data.statistics || "",
      heroImageUrl: data.heroImageUrl || "",
      metaTitle: data.metaTitle || "",
      metaDescription: data.metaDescription || "",
      sampleVisaImageUrl: data.sampleVisaImageUrl || "",
      currency: data.currency || "INR",
    };

    // Merge draft with server data (draft takes precedence for user edits)
    if (shouldUseDraft && draftData?.formData) {
      console.log("Merging draft with server data");
      setFormData({ ...baseFormData, ...draftData.formData });
    } else {
      setFormData(baseFormData);
    }

    // Use draft arrays if they exist and have content, otherwise use server data
    if (shouldUseDraft && draftData?.requirements && Array.isArray(draftData.requirements) && draftData.requirements.length > 0) {
      console.log("Using draft requirements");
      setRequirements(draftData.requirements);
    } else {
      setRequirements(
        (data.requirements || []).map((req: any, index: number) => ({
          uid: uid(),
          name: req.name,
          scope: req.scope,
          isRequired: req.isRequired,
          category: req.category || "",
          description: req.description || "",
          sortOrder: req.sortOrder ?? index,
        }))
      );
    }

    if (shouldUseDraft && draftData?.faqs && Array.isArray(draftData.faqs) && draftData.faqs.length > 0) {
      console.log("Using draft faqs");
      setFaqs(draftData.faqs);
    } else {
      setFaqs(
        (data.faqs || []).map((faq: any, index: number) => ({
          uid: uid(),
          category: faq.category || "",
          question: faq.question || "",
          answer: faq.answer || "",
          sortOrder: faq.sortOrder ?? index,
        }))
      );
    }


    // Restore UI state from draft if available
    if (shouldUseDraft) {
      if (draftData?.activeTab) setActiveTab(draftData.activeTab);
      if (draftData?.heroImageMode) setHeroImageMode(draftData.heroImageMode);
      if (draftData?.sampleVisaImageMode) setSampleVisaImageMode(draftData.sampleVisaImageMode);

      // Show notification that draft was restored
      setShowDraftSaved(true);
      setTimeout(() => setShowDraftSaved(false), 3000);
    }

    // Reset restoring flag and mark as initialized after state updates settle
    setTimeout(() => {
      isRestoringRef.current = false;
      setIsInitialized(true);
    }, 200);
  };

  const fetchVisa = useCallback(
    async (targetId: string, clone = false) => {
      try {
        const response = await fetch(`/api/admin/content/visas/${targetId}`);
        if (!response.ok) {
          router.push("/admin/content/visas");
          return;
        }
        const data = await response.json();
        hydrateFromVisa(data, clone);
      } catch (error) {
        console.error("Failed to fetch visa", error);
        router.push("/admin/content/visas");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      router.push("/admin");
      return;
    }
    fetchCountries();
    if (!isNew) {
      fetchVisa(params.id, false);
    } else if (cloneSourceId) {
      fetchVisa(cloneSourceId, true);
    } else {
      // For new forms, loading is handled by the restore effect
      setLoading(false);
    }
  }, [session, status, router, isNew, params.id, cloneSourceId, fetchVisa, fetchCountries]);

  const fetchTemplates = useCallback(async () => {
    if (isNew) return;
    try {
      setLoadingTemplates(true);
      const response = await fetch(`/api/admin/content/visas/${params.id}/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Failed to load templates", error);
    } finally {
      setLoadingTemplates(false);
    }
  }, [params.id, isNew]);

  useEffect(() => {
    if (!isNew) {
      fetchTemplates();
    }
  }, [fetchTemplates, isNew]);

  const handleRequirementChange = useCallback((
    uidValue: string,
    key: keyof RequirementState,
    value: string | boolean | number
  ) => {
    setRequirements((prev) =>
      prev.map((req) => (req.uid === uidValue ? { ...req, [key]: value } : req))
    );
  }, []);

  const addRequirement = () => {
    setRequirements((prev) => [
      ...prev,
      {
        uid: uid(),
        name: "",
        scope: "PER_TRAVELLER",
        isRequired: true,
        category: "",
        description: "",
        sortOrder: prev.length,
      },
    ]);
  };

  const removeRequirement = (uidValue: string) => {
    setRequirements((prev) => prev.filter((req) => req.uid !== uidValue));
  };

  const addFaq = () => {
    setFaqs((prev) => [
      ...prev,
      {
        uid: uid(),
        category: "",
        question: "",
        answer: "",
        sortOrder: prev.length,
      },
    ]);
  };

  const handleFaqChange = useCallback((
    uidValue: string,
    key: keyof FaqState,
    value: string | number
  ) => {
    setFaqs((prev) =>
      prev.map((faq) => (faq.uid === uidValue ? { ...faq, [key]: value } : faq))
    );
  }, []);

  const removeFaq = (uidValue: string) => {
    setFaqs((prev) => prev.filter((faq) => faq.uid !== uidValue));
  };


  const autoGenerateSlug = useCallback(() => {
    if (!formData.name) return;
    setFormData((prev) => ({ ...prev, slug: slugify(prev.name) }));
  }, [formData.name]);

  // Memoize updateForm handlers to prevent recreating on every render
  const updateFormField = useCallback((field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Memoized handlers for specific fields to prevent inline function creation
  const updateProcessingTime = useCallback((value: string) => updateFormField("processingTime", value), [updateFormField]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const {
        entryTypeLegacy,
        entryType,
        visaMode,
        stayType,
        visaSubTypeLabel,
        ...restFormData
      } = formData;

      const payload = {
        ...restFormData,
        priceInInr: Number(formData.priceInInr),
        // Only include entryType/structuredEntryType if they have non-empty values
        // Don't send entryTypeLegacy as entryType - entryType should only come from the structured entryType field
        // entryTypeLegacy is handled separately in the API
        ...(entryType && entryType.trim() !== "" ? { structuredEntryType: entryType } : {}),
        ...(entryTypeLegacy && entryTypeLegacy.trim() !== "" ? { entryTypeLegacy } : {}),
        // Always include visaMode to allow setting it to null (empty string) when "Not specified" is selected
        visaMode: visaMode || "",
        // Always include stayType to allow setting it to null (empty string) when "Not specified" is selected
        stayType: stayType || "",
        ...(visaSubTypeLabel && visaSubTypeLabel.trim() !== "" ? { visaSubTypeLabel } : {}),
        sampleVisaImageUrl: formData.sampleVisaImageUrl ? formData.sampleVisaImageUrl : null,
        // Ensure SEO fields are always included, even if empty
        metaTitle: formData.metaTitle?.trim() || null,
        metaDescription: formData.metaDescription?.trim() || null,
        requirements: requirements.filter(req => req && req.name && req.name.trim() !== "").map((req, index) => ({
          name: req.name.trim(),
          scope: req.scope,
          isRequired: req.isRequired,
          category: (req.category && req.category.trim() !== "") ? req.category.trim() : null,
          description: (req.description && req.description.trim() !== "") ? req.description.trim() : null,
          sortOrder: index,
        })),
        faqs: faqs.filter(faq => faq && faq.question && faq.question.trim() !== "" && faq.answer && faq.answer.trim() !== "").map((faq, index) => ({
          category: (faq.category && faq.category.trim() !== "") ? faq.category.trim() : null,
          question: faq.question.trim(),
          answer: faq.answer.trim(),
          sortOrder: index,
        })),
      };

      const response = await fetch(
        isNew ? "/api/admin/content/visas" : `/api/admin/content/visas/${params.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.missingFields
          ? `${error.error || "Failed to save visa"}\n\nMissing fields: ${error.missingFields.join(", ")}`
          : error.message || error.error || "Failed to save visa";
        alert(errorMessage);
        console.error("Visa update error:", error);
        return;
      }

      // Clear saved form state on successful save
      clearSavedState();
      setHasUnsavedChanges(false);
      setIsInitialized(false);
      router.push("/admin/content/visas");
    } catch (error) {
      console.error("Failed to save visa", error);
      alert("Unexpected error while saving visa");
    } finally {
      setSaving(false);
    }
  };

  const handleHeroImageFileUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large. Maximum size is 5 MB.");
      return;
    }

    setHeroImageUploading(true);
    setHeroImageUploadError(null);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("folder", "visas");
      uploadData.append("scope", "hero");

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: uploadData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to upload image");
      }

      const payload = await response.json();
      setFormData((prev) => ({ ...prev, heroImageUrl: payload.proxyUrl || payload.url }));
      setHeroImageMode("upload");
    } catch (error: any) {
      console.error("Hero image upload failed", error);
      setHeroImageUploadError(error.message || "Failed to upload image");
    } finally {
      setHeroImageUploading(false);
    }
  };

  const handleSampleVisaImageFileUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large. Maximum size is 5 MB.");
      return;
    }

    setSampleVisaImageUploading(true);
    setSampleVisaImageUploadError(null);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("folder", "visas");
      uploadData.append("scope", "sample");

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: uploadData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to upload image");
      }

      const payload = await response.json();
      setFormData((prev) => ({
        ...prev,
        sampleVisaImageUrl: payload.proxyUrl || payload.url,
      }));
      setSampleVisaImageMode("upload");
    } catch (error: any) {
      console.error("Sample visa image upload failed", error);
      setSampleVisaImageUploadError(error.message || "Failed to upload image");
    } finally {
      setSampleVisaImageUploading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            <p className="mt-4 text-neutral-600">Loading visa...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/admin/content/visas"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-sm"
            >
              <ArrowLeft size={16} />
              Back to visas
            </Link>
            <div className="flex items-center gap-3 mt-3">
              <h1 className="text-3xl font-bold text-neutral-900">
                {isNew ? "Create Visa" : "Edit Visa"}
              </h1>
              {showDraftSaved && (
                <div className="flex items-center gap-2 text-sm text-green-600 animate-fade-in">
                  <CheckCircle size={18} />
                  <span>Draft saved</span>
                </div>
              )}
              {hasUnsavedChanges && !showDraftSaved && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <Loader2 size={18} className="animate-spin" />
                  <span>Unsaved changes</span>
                </div>
              )}
            </div>
            <p className="text-neutral-500">
              Configure everything travellers will see plus what powers the visa flow.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoSave}
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary-200 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100"
            >
              <Save size={16} />
              Save Draft
            </button>
            <button
              type="button"
              onClick={autoGenerateSlug}
              className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              <RefreshCw size={16} />
              Auto slug
            </button>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl">
          <div className="flex overflow-x-auto border-b border-neutral-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap ${activeTab === tab.id
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-neutral-500 hover:text-neutral-900"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {activeTab === "basic" && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Country
                    </label>
                    <SelectInput
                      value={formData.countryId}
                      onChange={(value) => updateFormField("countryId", value)}
                    >
                      <option value="">Select country</option>
                      {countries.map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.name}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Category
                    </label>
                    <SelectInput
                      value={formData.category}
                      onChange={(value) => updateFormField("category", value)}
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Visa Name
                    </label>
                    <TextInput
                      value={formData.name}
                      onChange={(value) => updateFormField("name", value)}
                      placeholder="UAE Tourist Visa - 30 Days"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Slug
                    </label>
                    <TextInput
                      value={formData.slug}
                      onChange={(value) => updateFormField("slug", value)}
                      placeholder="uae-tourist-30-days"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Used in URL: /visas/[country-code]/{formData.slug || "slug"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700">
                    Subtitle / Tagline
                  </label>
                  <TextInput
                    value={formData.subtitle}
                    onChange={(value) => updateFormField("subtitle", value)}
                    placeholder="Fast approvals for leisure travel"
                  />
                </div>
                <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Visa Mode
                    </label>
                    <SelectInput
                      value={formData.visaMode}
                      onChange={(value) => updateFormField("visaMode", value)}
                    >
                      {VISA_MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Entry Type
                    </label>
                    <SelectInput
                      value={formData.entryType}
                      onChange={(value) => updateFormField("entryType", value)}
                    >
                      {ENTRY_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Stay Type
                    </label>
                    <SelectInput
                      value={formData.stayType}
                      onChange={(value) => updateFormField("stayType", value)}
                    >
                      {STAY_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Subtype Label
                    </label>
                    <TextInput
                      value={formData.visaSubTypeLabel}
                      onChange={(value) => updateFormField("visaSubTypeLabel", value)}
                      placeholder="Single Entry eVisa – Short Stay"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Optional: Enter a custom subtype label (e.g., "Single Entry eVisa – Short Stay")
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="text-sm font-medium text-neutral-700">
                      Legacy Entry Display
                    </label>
                    <TextInput
                      value={formData.entryTypeLegacy}
                      onChange={(value) => updateFormField("entryTypeLegacy", value)}
                      placeholder="Single Entry"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Shown on older UI surfaces as fallback when subtype label is missing.
                    </p>
                  </div>
                  <label className="flex items-center gap-3 border border-neutral-200 rounded-lg px-4 py-2 mt-6">
                    <CheckboxInput
                      checked={formData.isFeatured}
                      onChange={(checked) => updateFormField("isFeatured", checked)}
                    />
                    <span className="text-sm font-medium text-neutral-700 flex items-center gap-1">
                      <Sparkles size={16} className="text-amber-500" />
                      Featured (homepage cards)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 border border-neutral-200 rounded-lg px-4 py-2 mt-6">
                    <CheckboxInput
                      checked={formData.isActive}
                      onChange={(checked) => updateFormField("isActive", checked)}
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      Visible to travellers
                    </span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "pricing" && (
              <div className="space-y-6">
                <div className="border-b border-neutral-200 pb-4">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Pricing</h3>
                  <p className="text-sm text-neutral-500">Set the fixed price for this visa</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Price *
                    </label>
                    <NumberInput
                      min={0}
                      value={formData.priceInInr}
                      onChange={(value) => updateFormField("priceInInr", value ?? 0)}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Currency
                    </label>
                    <SelectInput
                      value={formData.currency}
                      onChange={(value) => updateFormField("currency", value)}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="AED">AED (د.إ)</option>
                      <option value="GBP">GBP (£)</option>
                    </SelectInput>
                  </div>
                </div>
                {formData.priceInInr > 0 && (
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                    <div className="text-sm text-neutral-600 mb-1">Total Price</div>
                    <div className="text-2xl font-bold text-primary-600">
                      {formData.currency === "INR" ? "₹" : formData.currency === "USD" ? "$" : formData.currency === "EUR" ? "€" : formData.currency === "AED" ? "د.إ" : formData.currency === "GBP" ? "£" : formData.currency}
                      {formData.priceInInr.toLocaleString()}
                    </div>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Processing Time
                    </label>
                    <TextInput
                      value={formData.processingTime}
                      onChange={updateProcessingTime}
                      placeholder="3-5 working days"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Stay Duration
                    </label>
                    <TextInput
                      value={formData.stayDuration}
                      onChange={(value) => updateFormField("stayDuration", value)}
                      placeholder="e.g. 30 Days"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Duration allowed to stay</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Validity
                    </label>
                    <TextInput
                      value={formData.validity}
                      onChange={(value) => updateFormField("validity", value)}
                      placeholder="e.g. 60 days from issue"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Validity period from date of issue</p>
                  </div>
                </div>

              </div>
            )}

            {activeTab === "content" && (
              <div className="space-y-4">
                {[
                  { key: "overview", label: "Overview" },
                  { key: "eligibility", label: "Eligibility" },
                  { key: "importantNotes", label: "Important Notes" },
                  { key: "whyTravunited", label: "Why Travunited for this Visa" },
                  { key: "rejectionReasons", label: "Rejection Reasons" },
                  { key: "statistics", label: "Statistics / Highlights" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-sm font-medium text-neutral-700">{field.label}</label>
                    <TextareaInput
                      rows={field.key === "overview" ? 5 : 3}
                      value={(formData as any)[field.key] || ""}
                      onChange={(value) => updateFormField(field.key as keyof FormState, value)}
                      placeholder={`Markdown or plain text for ${field.label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "documents" && (
              <>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">Document Requirements</h3>
                      <p className="text-sm text-neutral-500">
                        These drive the visa detail page and Step 4 of the application flow.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addRequirement}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium"
                    >
                      <Plus size={16} /> Add Requirement
                    </button>
                  </div>
                  <div className="space-y-4">
                    {requirements.length === 0 && (
                      <div className="border border-dashed border-neutral-200 rounded-xl p-6 text-center text-neutral-500">
                        No documents yet. Add at least passport + photo to start.
                      </div>
                    )}
                    {requirements.map((req, index) => (
                      <div
                        key={req.uid}
                        className="border border-neutral-200 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-neutral-500">
                            Requirement #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRequirement(req.uid)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <TextInput
                            value={req.name}
                            onChange={(value) => handleRequirementChange(req.uid, "name", value)}
                            placeholder="Passport first & last page"
                            className="border border-neutral-300 rounded-lg"
                          />
                          <SelectInput
                            value={req.scope}
                            onChange={(value) => handleRequirementChange(req.uid, "scope", value as DocScope)}
                            className="border border-neutral-300 rounded-lg"
                          >
                            {SCOPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </SelectInput>
                        </div>
                        <div className="grid md:grid-cols-3 gap-3">
                          <TextInput
                            value={req.category}
                            onChange={(value) => handleRequirementChange(req.uid, "category", value)}
                            placeholder="Category (e.g., Identity)"
                            className="border border-neutral-300 rounded-lg"
                          />
                          <NumberInput
                            value={req.sortOrder}
                            onChange={(value) => handleRequirementChange(req.uid, "sortOrder", value ?? 0)}
                            className="border border-neutral-300 rounded-lg"
                            placeholder="Sort"
                          />
                          <label className="inline-flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-lg">
                            <CheckboxInput
                              checked={req.isRequired}
                              onChange={(checked) => handleRequirementChange(req.uid, "isRequired", checked)}
                            />
                            <span className="text-sm text-neutral-700">Required</span>
                          </label>
                        </div>
                        <TextareaInput
                          value={req.description}
                          onChange={(value) => handleRequirementChange(req.uid, "description", value)}
                          placeholder="Extra instructions (file format, DPI, etc.)"
                          className="w-full border border-neutral-300 rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">Downloadable Templates</h3>
                      <p className="text-sm text-neutral-500">
                        Upload sample documents (PDF, DOCX) for applicants to download.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(null);
                        setShowTemplateModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium"
                    >
                      <Plus size={16} /> Upload Template
                    </button>
                  </div>

                  {loadingTemplates ? (
                    <div className="text-center py-8">
                      <Loader2 className="animate-spin mx-auto text-neutral-400" size={24} />
                      <p className="text-sm text-neutral-500 mt-2">Loading templates...</p>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="border border-dashed border-neutral-200 rounded-xl p-6 text-center text-neutral-500">
                      No templates uploaded yet.
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="border border-neutral-200 rounded-xl p-4 flex items-center justify-between group hover:border-primary-200 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                              <FileText size={20} />
                            </div>
                            <div>
                              <h4 className="font-medium text-neutral-900">{template.name}</h4>
                              {template.description && (
                                <p className="text-sm text-neutral-500">{template.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                                <span>{template.fileName}</span>
                                {template.fileSize && (
                                  <span>• {(template.fileSize / 1024).toFixed(1)} KB</span>
                                )}
                                <span className={template.isActive ? "text-green-600" : "text-neutral-400"}>
                                  • {template.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTemplate(template);
                                setShowTemplateModal(true);
                              }}
                              className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("Are you sure you want to delete this template?")) return;
                                try {
                                  const res = await fetch(
                                    `/api/admin/content/visas/${params.id}/templates/${template.id}`,
                                    { method: "DELETE" }
                                  );
                                  if (res.ok) {
                                    fetchTemplates();
                                  } else {
                                    alert("Failed to delete template");
                                  }
                                } catch (e) {
                                  alert("Error deleting template");
                                }
                              }}
                              className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "faqs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">FAQ Builder</h3>
                    <p className="text-sm text-neutral-500">
                      Group questions by category if needed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addFaq}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium"
                  >
                    <Plus size={16} /> Add FAQ
                  </button>
                </div>
                <div className="space-y-4">
                  {faqs.length === 0 && (
                    <div className="border border-dashed border-neutral-200 rounded-xl p-6 text-center text-neutral-500">
                      No FAQs yet. Add common questions customers ask.
                    </div>
                  )}
                  {faqs.map((faq, index) => (
                    <div
                      key={faq.uid}
                      className="border border-neutral-200 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-neutral-500">
                          FAQ #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFaq(faq.uid)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <TextInput
                          value={faq.category}
                          onChange={(value) => handleFaqChange(faq.uid, "category", value)}
                          placeholder="Category (Optional)"
                          className="border border-neutral-300 rounded-lg"
                        />
                        <NumberInput
                          value={faq.sortOrder}
                          onChange={(value) => handleFaqChange(faq.uid, "sortOrder", value ?? 0)}
                          className="border border-neutral-300 rounded-lg"
                          placeholder="Sort order"
                        />
                      </div>
                      <TextInput
                        value={faq.question}
                        onChange={(value) => handleFaqChange(faq.uid, "question", value)}
                        placeholder="Question"
                        className="border border-neutral-300 rounded-lg"
                      />
                      <TextareaInput
                        value={faq.answer}
                        onChange={(value) => handleFaqChange(faq.uid, "answer", value)}
                        placeholder="Answer"
                        className="border border-neutral-300 rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "media" && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-neutral-700">
                        Hero Image
                      </label>
                      <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => setHeroImageMode("url")}
                          className={`px-3 py-1.5 ${heroImageMode === "url"
                            ? "bg-primary-600 text-white"
                            : "text-neutral-600"
                            }`}
                        >
                          Use URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeroImageMode("upload")}
                          className={`px-3 py-1.5 ${heroImageMode === "upload"
                            ? "bg-primary-600 text-white"
                            : "text-neutral-600"
                            }`}
                        >
                          Upload
                        </button>
                      </div>
                    </div>
                    {heroImageMode === "url" ? (
                      <TextInput
                        type="url"
                        value={formData.heroImageUrl}
                        onChange={(value) => updateFormField("heroImageUrl", value)}
                        className="mt-2"
                        placeholder="https://..."
                      />
                    ) : (
                      <div className="mt-2 space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleHeroImageFileUpload(e.target.files?.[0] || null)}
                          className="w-full border border-dashed border-neutral-300 rounded-lg px-4 py-3 text-sm text-neutral-600 hover:border-primary-400 cursor-pointer"
                        />
                        <p className="text-xs text-neutral-500">
                          JPG, PNG or WEBP up to 5 MB.
                        </p>
                        {heroImageUploading && (
                          <div className="text-sm text-neutral-600 flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            Uploading image...
                          </div>
                        )}
                        {heroImageUploadError && (
                          <p className="text-sm text-red-600">{heroImageUploadError}</p>
                        )}
                        {formData.heroImageUrl && (
                          <div className="text-xs text-neutral-500 break-all bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                            <span className="truncate">{formData.heroImageUrl}</span>
                            <a
                              href={formData.heroImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 font-semibold"
                            >
                              Open
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {formData.heroImageUrl && (
                      <div className="mt-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getMediaProxyUrl(formData.heroImageUrl)}
                          alt="Hero preview"
                          className="w-full max-h-56 object-cover rounded-xl border border-neutral-200"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">Meta Title</label>
                    <TextInput
                      value={formData.metaTitle || ""}
                      onChange={(value) => updateFormField("metaTitle", value)}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-neutral-700">
                        Sample Visa Image
                      </label>
                      <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => setSampleVisaImageMode("url")}
                          className={`px-3 py-1.5 ${sampleVisaImageMode === "url"
                            ? "bg-primary-600 text-white"
                            : "text-neutral-600"
                            }`}
                        >
                          Use URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setSampleVisaImageMode("upload")}
                          className={`px-3 py-1.5 ${sampleVisaImageMode === "upload"
                            ? "bg-primary-600 text-white"
                            : "text-neutral-600"
                            }`}
                        >
                          Upload
                        </button>
                      </div>
                    </div>
                    {sampleVisaImageMode === "url" ? (
                      <TextInput
                        type="url"
                        value={formData.sampleVisaImageUrl || ""}
                        onChange={(value) => updateFormField("sampleVisaImageUrl", value)}
                        className="mt-2"
                        placeholder="https://..."
                      />
                    ) : (
                      <div className="mt-2 space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleSampleVisaImageFileUpload(e.target.files?.[0] || null)
                          }
                          className="w-full border border-dashed border-neutral-300 rounded-lg px-4 py-3 text-sm text-neutral-600 hover:border-primary-400 cursor-pointer"
                        />
                        <p className="text-xs text-neutral-500">
                          Upload a redacted example visa stamp/page. JPG, PNG or WEBP up to 5 MB.
                        </p>
                        {sampleVisaImageUploading && (
                          <div className="text-sm text-neutral-600 flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            Uploading image...
                          </div>
                        )}
                        {sampleVisaImageUploadError && (
                          <p className="text-sm text-red-600">{sampleVisaImageUploadError}</p>
                        )}
                        {formData.sampleVisaImageUrl && (
                          <div className="text-xs text-neutral-500 break-all bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                            <span className="truncate">{formData.sampleVisaImageUrl}</span>
                            <div className="flex items-center gap-2">
                              <a
                                href={formData.sampleVisaImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-700 font-semibold"
                              >
                                Open
                              </a>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => ({ ...prev, sampleVisaImageUrl: "" }))
                                }
                                className="text-red-500 hover:text-red-600 font-semibold"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {formData.sampleVisaImageUrl && (
                      <div className="mt-3 space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getMediaProxyUrl(formData.sampleVisaImageUrl)}
                          alt="Sample visa preview"
                          className="w-full rounded-xl border border-neutral-200"
                          style={{ maxWidth: "100%", height: "auto" }}
                        />
                        <p className="text-xs text-neutral-500">
                          This image is for reference inside the admin panel and CMS. Sample visa images are displayed at full size, not as thumbnails.
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">Meta Description</label>
                    <TextareaInput
                      value={formData.metaDescription || ""}
                      onChange={(value) => updateFormField("metaDescription", value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
              <Link
                href="/admin/content/visas"
                className="px-5 py-2 border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Visa
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      {showTemplateModal && (
        <TemplateModal
          visaId={params.id}
          template={editingTemplate}
          onClose={() => setShowTemplateModal(false)}
          onSave={() => {
            setShowTemplateModal(false);
            fetchTemplates();
          }}
        />
      )}
    </AdminLayout>
  );
}

function TemplateModal({
  visaId,
  template,
  onClose,
  onSave,
}: {
  visaId: string;
  template: DocumentTemplate | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: template?.name || "",
    description: template?.description || "",
    sortOrder: template?.sortOrder || 0,
    isActive: template?.isActive ?? true,
  });
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (template) {
        // Update
        const res = await fetch(
          `/api/admin/content/visas/${visaId}/templates/${template.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          }
        );
        if (!res.ok) throw new Error("Failed to update");
      } else {
        // Create
        if (!file) {
          alert("Please select a file");
          setLoading(false);
          return;
        }

        const data = new FormData();
        data.append("file", file);
        data.append("name", formData.name);
        if (formData.description) data.append("description", formData.description);
        data.append("sortOrder", String(formData.sortOrder));
        data.append("isActive", String(formData.isActive));

        const res = await fetch(`/api/admin/content/visas/${visaId}/templates`, {
          method: "POST",
          body: data,
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create");
        }
      }

      onSave();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error saving template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-scale-in">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <h3 className="font-semibold text-lg text-neutral-900">
            {template ? "Edit Template" : "Upload Template"}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Display Name *
            </label>
            <TextInput
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder="e.g., Visa Application Form"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description
            </label>
            <TextInput
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              placeholder="Brief description for the user"
            />
          </div>

          {!template && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Document File *
              </label>
              <div className="border border-dashed border-neutral-300 rounded-lg p-6 hover:bg-neutral-50 transition-colors text-center">
                <input
                  type="file"
                  id="template-file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="template-file"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="p-3 bg-primary-50 text-primary-600 rounded-full">
                    <Upload size={20} />
                  </div>
                  <div className="text-sm font-medium text-neutral-700">
                    {file ? file.name : "Click to upload file"}
                  </div>
                  <div className="text-xs text-neutral-500">
                    PDF, DOC, DOCX up to 20MB
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Sort Order
              </label>
              <NumberInput
                value={formData.sortOrder}
                onChange={(value) => setFormData({ ...formData, sortOrder: value || 0 })}
                placeholder="0"
              />
            </div>
            <div className="flex items-center h-full pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <CheckboxInput
                  checked={formData.isActive}
                  onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <span className="text-sm font-medium text-neutral-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {template ? "Save Changes" : "Upload Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
