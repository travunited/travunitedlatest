"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { getMediaProxyUrl } from "@/lib/media";
import { TextInput, NumberInput, TextareaInput, SelectInput, CheckboxInput } from "@/components/admin/MemoizedInputs";
import { useFormPersistence } from "@/hooks/useFormPersistence";

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
  // New fields matching CSV template
  stayDurationDays: number | null;
  validityDays: number | null;
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

interface SubTypeState {
  uid: string;
  label: string;
  code: string;
  sortOrder: number;
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
  { value: "STICKER", label: "Sticker" },
  { value: "VOA", label: "Visa on Arrival (VOA)" },
  { value: "VFS", label: "VFS Appointment" },
  { value: "ETA", label: "ETA" },
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
  const cloneSourceId = searchParams.get("clone");

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
    // New fields
    stayDurationDays: null,
    validityDays: null,
    sampleVisaImageUrl: "",
    currency: "INR",
  });
  const [requirements, setRequirements] = useState<RequirementState[]>([]);
  const [faqs, setFaqs] = useState<FaqState[]>([]);
  const [subTypes, setSubTypes] = useState<SubTypeState[]>([]);
  const [heroImageMode, setHeroImageMode] = useState<"url" | "upload">("url");
  const [sampleVisaImageMode, setSampleVisaImageMode] = useState<"url" | "upload">("url");
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [heroImageUploadError, setHeroImageUploadError] = useState<string | null>(null);
  const [sampleVisaImageUploading, setSampleVisaImageUploading] = useState(false);
  const [sampleVisaImageUploadError, setSampleVisaImageUploadError] = useState<string | null>(null);

  // Form persistence - save form state to localStorage
  const formPersistenceKey = `visa-editor-${params.id}`;
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);
  const [showDraftSaved, setShowDraftSaved] = useState(false);
  const combinedFormState = useMemo(() => ({
    formData,
    requirements,
    faqs,
    subTypes,
    activeTab,
    heroImageMode,
    sampleVisaImageMode,
  }), [formData, requirements, faqs, subTypes, activeTab, heroImageMode, sampleVisaImageMode]);

  const { clearSavedState } = useFormPersistence(
    formPersistenceKey,
    combinedFormState,
    {
      enabled: true,
      debounceMs: 1000, // 1 second debounce for auto-save
      onRestore: (restoredState: any) => {
        // Restore draft if we haven't loaded from server yet
        // This works for both new forms and when editing (before server data loads)
        if (!hasLoadedFromServer) {
          // For new forms, restore everything
          // For existing forms, only restore if user made changes before server data loaded
          if (isNew || Object.keys(restoredState).length > 0) {
            if (restoredState.formData) {
              setFormData(restoredState.formData);
            }
            if (restoredState.requirements) {
              setRequirements(restoredState.requirements);
            }
            if (restoredState.faqs) {
              setFaqs(restoredState.faqs);
            }
            if (restoredState.subTypes) {
              setSubTypes(restoredState.subTypes);
            }
            if (restoredState.activeTab) {
              setActiveTab(restoredState.activeTab);
            }
            if (restoredState.heroImageMode) {
              setHeroImageMode(restoredState.heroImageMode);
            }
            if (restoredState.sampleVisaImageMode) {
              setSampleVisaImageMode(restoredState.sampleVisaImageMode);
            }
            // Show notification that draft was restored
            if (Object.keys(restoredState).length > 0) {
              setShowDraftSaved(true);
              setTimeout(() => setShowDraftSaved(false), 3000);
            }
          }
        }
      },
      excludeKeys: ['_savedAt'],
    }
  );

  // Show draft saved indicator when form state changes (debounced save happens)
  useEffect(() => {
    if (hasLoadedFromServer) {
      const timer = setTimeout(() => {
        setShowDraftSaved(true);
        setTimeout(() => setShowDraftSaved(false), 2000);
      }, 1200); // Show after debounce + small delay
      return () => clearTimeout(timer);
    }
  }, [combinedFormState, hasLoadedFromServer]);

  const tabs = useMemo(
    () => [
      { id: "basic", label: "Basic Info" },
      { id: "pricing", label: "Pricing & Validity" },
      { id: "content", label: "Content" },
      { id: "documents", label: "Documents & Process" },
      { id: "faqs", label: "FAQs" },
      { id: "subtypes", label: "Subtypes" },
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
    setHasLoadedFromServer(true);
    setFormData({
      countryId: data.countryId,
      name: isClone ? `${data.name} Copy` : data.name,
      slug: isClone ? `${data.slug}-copy` : data.slug,
      subtitle: data.subtitle || "",
      category: data.category,
      isActive: isClone ? false : data.isActive,
      isFeatured: isClone ? false : data.isFeatured,
      priceInInr: data.priceInInr,
      processingTime: data.processingTime,
      stayDuration: data.stayDuration,
      validity: data.validity,
      entryType: data.entryType || "",
      entryTypeLegacy: data.entryTypeLegacy || "",
      visaMode: data.visaMode || "",
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
      // New fields
      stayDurationDays: data.stayDurationDays ?? null,
      validityDays: data.validityDays ?? null,
      sampleVisaImageUrl: data.sampleVisaImageUrl || "",
      currency: data.currency || "INR",
    });
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
    setFaqs(
      (data.faqs || []).map((faq: any, index: number) => ({
        uid: uid(),
        category: faq.category || "",
        question: faq.question || "",
        answer: faq.answer || "",
        sortOrder: faq.sortOrder ?? index,
      }))
    );
    setSubTypes(
      (data.subTypes || []).map((subtype: any, index: number) => ({
        uid: uid(),
        label: subtype.label || "",
        code: subtype.code || "",
        sortOrder: subtype.sortOrder ?? index,
      }))
    );
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
      setLoading(false);
      setHasLoadedFromServer(true); // Mark as loaded for new forms
    }
  }, [session, status, router, isNew, params.id, cloneSourceId, fetchVisa, fetchCountries]);

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

  const handleSubTypeChange = useCallback((
    uidValue: string,
    field: keyof SubTypeState,
    value: string | number
  ) => {
    setSubTypes((prev) =>
      prev.map((st) => (st.uid === uidValue ? { ...st, [field]: value } : st))
    );
  }, []);

  const addSubType = () => {
    setSubTypes((prev) => [
      ...prev,
      {
        uid: uid(),
        label: "",
        code: "",
        sortOrder: prev.length,
      },
    ]);
  };

  const removeSubType = (uidValue: string) => {
    setSubTypes((prev) => prev.filter((st) => st.uid !== uidValue));
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
  const updateStayDurationDays = useCallback((value: number | null) => {
    setFormData((prev) => ({
      ...prev,
      stayDurationDays: value,
      stayDuration: value ? `${value} days` : prev.stayDuration
    }));
  }, []);
  const updateValidityDays = useCallback((value: number | null) => {
    setFormData((prev) => ({
      ...prev,
      validityDays: value,
      validity: value ? `${value} days from issue` : prev.validity
    }));
  }, []);

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
        // Only include entryType/structuredEntryType if they have non-empty values
        // Don't send entryTypeLegacy as entryType - entryType should only come from the structured entryType field
        // entryTypeLegacy is handled separately in the API
        ...(entryType && entryType.trim() !== "" ? { structuredEntryType: entryType } : {}),
        ...(entryTypeLegacy && entryTypeLegacy.trim() !== "" ? { entryTypeLegacy } : {}),
        ...(visaMode && visaMode.trim() !== "" ? { visaMode } : {}),
        ...(stayType && stayType.trim() !== "" ? { stayType } : {}),
        ...(visaSubTypeLabel && visaSubTypeLabel.trim() !== "" ? { visaSubTypeLabel } : {}),
        sampleVisaImageUrl: formData.sampleVisaImageUrl ? formData.sampleVisaImageUrl : null,
        priceInInr: Number(formData.priceInInr),
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
        subTypes: subTypes.filter(subtype => subtype && subtype.label && subtype.label.trim() !== "").map((subtype, index) => ({
          label: subtype.label.trim(),
          code: (subtype.code && subtype.code.trim() !== "") ? subtype.code.trim() : null,
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
              className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900"
            >
              <ArrowLeft size={16} className="mr-2" />
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
            </div>
            <p className="text-neutral-500">
              Configure everything travellers will see plus what powers the visa flow.
            </p>
          </div>
          <button
            type="button"
            onClick={autoGenerateSlug}
            className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50"
          >
            <RefreshCw size={16} />
            Auto slug
          </button>
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
                    {subTypes.length > 0 ? (
                      <SelectInput
                        value={formData.visaSubTypeLabel}
                        onChange={(value) => updateFormField("visaSubTypeLabel", value)}
                      >
                        <option value="">Select a subtype label (optional)</option>
                        {subTypes.map((subtype) => (
                          <option key={subtype.uid} value={subtype.label}>
                            {subtype.label || `Subtype ${subtype.uid.slice(0, 8)}`}
                          </option>
                        ))}
                      </SelectInput>
                    ) : (
                      <TextInput
                        value={formData.visaSubTypeLabel}
                        onChange={(value) => updateFormField("visaSubTypeLabel", value)}
                        placeholder="Single Entry eVisa – Short Stay (add subtypes to enable dropdown)"
                      />
                    )}
                    <p className="text-xs text-neutral-500 mt-1">
                      {subTypes.length > 0 
                        ? "Select a subtype label from the subtypes you've added below, or leave empty."
                        : "Add subtypes in the 'Subtypes' tab to enable dropdown selection."}
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
                <div className="border-t border-neutral-200 pt-4">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Validity & Duration</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Stay Duration (Days)
                      </label>
                      <NumberInput
                        min={1}
                        value={formData.stayDurationDays}
                        onChange={updateStayDurationDays}
                        placeholder="30"
                      />
                      <p className="text-xs text-neutral-500 mt-1">Number of days allowed to stay</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Validity (Days from Issue)
                      </label>
                      <NumberInput
                        min={1}
                        value={formData.validityDays}
                        onChange={updateValidityDays}
                        placeholder="60"
                      />
                      <p className="text-xs text-neutral-500 mt-1">Number of days visa is valid from date of issue</p>
                    </div>
                  </div>
                  <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Stay Duration (Legacy Text)
                      </label>
                      <TextInput
                        value={formData.stayDuration}
                        onChange={(value) => updateFormField("stayDuration", value)}
                        className="bg-neutral-50"
                        placeholder="Up to 30 days"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Validity (Legacy Text)
                      </label>
                      <TextInput
                        value={formData.validity}
                        onChange={(value) => updateFormField("validity", value)}
                        className="bg-neutral-50"
                        placeholder="60 days from issue"
                        disabled
                      />
                    </div>
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

            {activeTab === "subtypes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">Visa Subtypes</h3>
                    <p className="text-sm text-neutral-500">
                      Add multiple subtypes for this visa (e.g., Single Entry, Multiple Entry, etc.)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addSubType}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium"
                  >
                    <Plus size={16} /> Add Subtype
                  </button>
                </div>
                <div className="space-y-4">
                  {subTypes.length === 0 && (
                    <div className="border border-dashed border-neutral-200 rounded-xl p-6 text-center text-neutral-500">
                      No subtypes yet. Add subtypes to help users understand different visa options.
                    </div>
                  )}
                  {subTypes.map((subtype, index) => (
                    <div
                      key={subtype.uid}
                      className="border border-neutral-200 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-neutral-500">
                          Subtype #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSubType(subtype.uid)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <div className="space-y-2">
                            <SelectInput
                              value={subtype.label}
                              onChange={(value) => handleSubTypeChange(subtype.uid, "label", value)}
                              className="w-full border border-neutral-300 rounded-lg"
                            >
                              <option value="">Select or type custom label</option>
                              {COMMON_SUBTYPE_LABELS.map((commonLabel) => (
                                <option key={commonLabel} value={commonLabel}>
                                  {commonLabel}
                                </option>
                              ))}
                            </SelectInput>
                            {!COMMON_SUBTYPE_LABELS.includes(subtype.label) && subtype.label && (
                              <TextInput
                                value={subtype.label}
                                onChange={(value) => handleSubTypeChange(subtype.uid, "label", value)}
                                placeholder="Or type a custom subtype label"
                                className="w-full border border-neutral-300 rounded-lg mt-2"
                              />
                            )}
                            <p className="text-xs text-neutral-500">
                              Select from common options or type a custom label
                            </p>
                          </div>
                        </div>
                        <div>
                          <TextInput
                            value={subtype.code}
                            onChange={(value) => handleSubTypeChange(subtype.uid, "code", value)}
                            placeholder="Code (Optional)"
                            className="w-full border border-neutral-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <NumberInput
                        value={subtype.sortOrder}
                        onChange={(value) => handleSubTypeChange(subtype.uid, "sortOrder", value ?? 0)}
                        className="w-full border border-neutral-300 rounded-lg"
                        placeholder="Sort order"
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
    </AdminLayout>
  );
}
