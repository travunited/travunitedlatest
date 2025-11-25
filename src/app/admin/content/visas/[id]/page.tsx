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
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { getMediaProxyUrl } from "@/lib/media";

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

interface CountryOption {
  id: string;
  name: string;
}

const CATEGORY_OPTIONS = ["Tourist", "Business", "Transit", "Student", "Other"];
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
  const [heroImageMode, setHeroImageMode] = useState<"url" | "upload">("url");
  const [sampleVisaImageMode, setSampleVisaImageMode] = useState<"url" | "upload">("url");
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [heroImageUploadError, setHeroImageUploadError] = useState<string | null>(null);
  const [sampleVisaImageUploading, setSampleVisaImageUploading] = useState(false);
  const [sampleVisaImageUploadError, setSampleVisaImageUploadError] = useState<string | null>(null);

  const tabs = useMemo(
    () => [
      { id: "basic", label: "Basic Info" },
      { id: "pricing", label: "Pricing & Validity" },
      { id: "content", label: "Content" },
      { id: "documents", label: "Documents & Process" },
      { id: "faqs", label: "FAQs" },
      { id: "media", label: "Media & SEO" },
    ],
    []
  );

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
    }
  }, [session, status, router, isNew, params.id, cloneSourceId, fetchVisa, fetchCountries]);

  const handleRequirementChange = (
    uidValue: string,
    key: keyof RequirementState,
    value: string | boolean | number
  ) => {
    setRequirements((prev) =>
      prev.map((req) => (req.uid === uidValue ? { ...req, [key]: value } : req))
    );
  };

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

const handleFaqChange = (
  uidValue: string,
  key: keyof FaqState,
  value: string | number
) => {
    setFaqs((prev) =>
      prev.map((faq) => (faq.uid === uidValue ? { ...faq, [key]: value } : faq))
    );
  };

  const removeFaq = (uidValue: string) => {
    setFaqs((prev) => prev.filter((faq) => faq.uid !== uidValue));
  };

  const autoGenerateSlug = () => {
    if (!formData.name) return;
    setFormData((prev) => ({ ...prev, slug: slugify(prev.name) }));
  };

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
        entryType: entryTypeLegacy || null,
        structuredEntryType: entryType || null,
        visaMode: visaMode || null,
        stayType: stayType || null,
        visaSubTypeLabel: visaSubTypeLabel || null,
        sampleVisaImageUrl: formData.sampleVisaImageUrl ? formData.sampleVisaImageUrl : null,
        priceInInr: Number(formData.priceInInr),
        // Ensure SEO fields are always included, even if empty
        metaTitle: formData.metaTitle?.trim() || null,
        metaDescription: formData.metaDescription?.trim() || null,
        requirements: requirements.map((req, index) => ({
          name: req.name,
          scope: req.scope,
          isRequired: req.isRequired,
          category: req.category || null,
          description: req.description || null,
          sortOrder: index,
        })),
        faqs: faqs.map((faq, index) => ({
          category: faq.category || null,
          question: faq.question,
          answer: faq.answer,
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
        alert(error.error || "Failed to save visa");
        return;
      }

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
            <h1 className="text-3xl font-bold text-neutral-900 mt-3">
              {isNew ? "Create Visa" : "Edit Visa"}
            </h1>
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
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
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
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.countryId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, countryId: e.target.value }))}
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select country</option>
                      {countries.map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Visa Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                      placeholder="UAE Tourist Visa - 30 Days"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                    className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                    placeholder="Fast approvals for leisure travel"
                  />
                </div>
                <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Visa Mode
                    </label>
                    <select
                      value={formData.visaMode}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, visaMode: e.target.value }))
                      }
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                    >
                      {VISA_MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Entry Type
                    </label>
                    <select
                      value={formData.entryType}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, entryType: e.target.value }))
                      }
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                    >
                      {ENTRY_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Stay Type
                    </label>
                    <select
                      value={formData.stayType}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, stayType: e.target.value }))
                      }
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                    >
                      {STAY_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Subtype Label
                    </label>
                    <input
                      type="text"
                      value={formData.visaSubTypeLabel}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, visaSubTypeLabel: e.target.value }))
                      }
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                      placeholder="Single Entry eVisa – Short Stay"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="text-sm font-medium text-neutral-700">
                      Legacy Entry Display
                    </label>
                    <input
                      type="text"
                      value={formData.entryTypeLegacy}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, entryTypeLegacy: e.target.value }))
                      }
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                      placeholder="Single Entry"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Shown on older UI surfaces as fallback when subtype label is missing.
                    </p>
                  </div>
                  <label className="flex items-center gap-3 border border-neutral-200 rounded-lg px-4 py-2 mt-6">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))
                      }
                      className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-neutral-700 flex items-center gap-1">
                      <Sparkles size={16} className="text-amber-500" />
                      Featured (homepage cards)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 border border-neutral-200 rounded-lg px-4 py-2 mt-6">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                      className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
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
                    <input
                      type="number"
                      min={0}
                      value={formData.priceInInr}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, priceInInr: Number(e.target.value) || 0 }))
                      }
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, currency: e.target.value }))
                      }
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="AED">AED (د.إ)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
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
                    <input
                      type="text"
                      value={formData.processingTime}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, processingTime: e.target.value }))
                      }
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                      <input
                        type="number"
                        min={1}
                        value={formData.stayDurationDays ?? ""}
                        onChange={(e) => {
                          const days = e.target.value ? parseInt(e.target.value) : null;
                          setFormData((prev) => ({ 
                            ...prev, 
                            stayDurationDays: days,
                            stayDuration: days ? `${days} days` : prev.stayDuration
                          }));
                        }}
                        className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                        placeholder="30"
                      />
                      <p className="text-xs text-neutral-500 mt-1">Number of days allowed to stay</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Validity (Days from Issue)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formData.validityDays ?? ""}
                        onChange={(e) => {
                          const days = e.target.value ? parseInt(e.target.value) : null;
                          setFormData((prev) => ({ 
                            ...prev, 
                            validityDays: days,
                            validity: days ? `${days} days from issue` : prev.validity
                          }));
                        }}
                        className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                      <input
                        type="text"
                        value={formData.stayDuration}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, stayDuration: e.target.value }))
                        }
                        className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 bg-neutral-50"
                        placeholder="Up to 30 days"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-700">
                        Validity (Legacy Text)
                      </label>
                      <input
                        type="text"
                        value={formData.validity}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, validity: e.target.value }))
                        }
                        className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 bg-neutral-50"
                        placeholder="60 days from issue"
                        readOnly
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
                    <textarea
                      rows={field.key === "overview" ? 5 : 3}
                      value={(formData as any)[field.key]}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                        <input
                          type="text"
                          value={req.name}
                          onChange={(e) =>
                            handleRequirementChange(req.uid, "name", e.target.value)
                          }
                          placeholder="Passport first & last page"
                          className="border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                        />
                        <select
                          value={req.scope}
                          onChange={(e) =>
                            handleRequirementChange(req.uid, "scope", e.target.value as DocScope)
                          }
                          className="border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                        >
                          {SCOPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={req.category}
                          onChange={(e) =>
                            handleRequirementChange(req.uid, "category", e.target.value)
                          }
                          placeholder="Category (e.g., Identity)"
                          className="border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                        />
                        <input
                          type="number"
                          value={req.sortOrder}
                          onChange={(e) =>
                            handleRequirementChange(req.uid, "sortOrder", Number(e.target.value))
                          }
                          className="border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                          placeholder="Sort"
                        />
                        <label className="inline-flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-lg">
                          <input
                            type="checkbox"
                            checked={req.isRequired}
                            onChange={(e) =>
                              handleRequirementChange(req.uid, "isRequired", e.target.checked)
                            }
                            className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-neutral-700">Required</span>
                        </label>
                      </div>
                      <textarea
                        value={req.description}
                        onChange={(e) =>
                          handleRequirementChange(req.uid, "description", e.target.value)
                        }
                        placeholder="Extra instructions (file format, DPI, etc.)"
                        className="w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                        <input
                          type="text"
                          value={faq.category}
                          onChange={(e) => handleFaqChange(faq.uid, "category", e.target.value)}
                          placeholder="Category (Optional)"
                          className="border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                        />
                        <input
                          type="number"
                          value={faq.sortOrder}
                          onChange={(e) =>
                            handleFaqChange(
                              faq.uid,
                              "sortOrder",
                              Number(e.target.value) || 0
                            )
                          }
                          className="border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                          placeholder="Sort order"
                        />
                      </div>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => handleFaqChange(faq.uid, "question", e.target.value)}
                        placeholder="Question"
                        className="border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                      />
                      <textarea
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(faq.uid, "answer", e.target.value)}
                        placeholder="Answer"
                        className="border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                          className={`px-3 py-1.5 ${
                            heroImageMode === "url"
                              ? "bg-primary-600 text-white"
                              : "text-neutral-600"
                          }`}
                        >
                          Use URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeroImageMode("upload")}
                          className={`px-3 py-1.5 ${
                            heroImageMode === "upload"
                              ? "bg-primary-600 text-white"
                              : "text-neutral-600"
                          }`}
                        >
                          Upload
                        </button>
                      </div>
                    </div>
                    {heroImageMode === "url" ? (
                      <input
                        type="url"
                        value={formData.heroImageUrl}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, heroImageUrl: e.target.value }))
                        }
                        className="mt-2 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                    <input
                      type="text"
                      value={formData.metaTitle}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))
                      }
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                          className={`px-3 py-1.5 ${
                            sampleVisaImageMode === "url"
                              ? "bg-primary-600 text-white"
                              : "text-neutral-600"
                          }`}
                        >
                          Use URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setSampleVisaImageMode("upload")}
                          className={`px-3 py-1.5 ${
                            sampleVisaImageMode === "upload"
                              ? "bg-primary-600 text-white"
                              : "text-neutral-600"
                          }`}
                        >
                          Upload
                        </button>
                      </div>
                    </div>
                    {sampleVisaImageMode === "url" ? (
                      <input
                        type="url"
                        value={formData.sampleVisaImageUrl}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, sampleVisaImageUrl: e.target.value }))
                        }
                        className="mt-2 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                          className="w-full max-h-56 object-cover rounded-xl border border-neutral-200"
                        />
                        <p className="text-xs text-neutral-500">
                          This image is for reference inside the admin panel and CMS.
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700">Meta Description</label>
                    <textarea
                      value={formData.metaDescription}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))
                      }
                      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
