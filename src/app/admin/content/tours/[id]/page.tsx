"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getMediaProxyUrl } from "@/lib/media";

// Stable component for JSON array textareas to prevent re-render focus loss
const JsonArrayTextarea = memo(({ value, onChange, rows, placeholder, className }: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}) => {
  // Parse JSON value to display format once per value change
  const displayValue = useMemo(() => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.join("\n") : value;
    } catch {
      return value.replace(/[\[\]"]/g, "").replace(/,/g, "\n");
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const values = e.target.value.split("\n").map(v => v.trim()).filter(Boolean);
    onChange(JSON.stringify(values));
  }, [onChange]);

  return (
    <textarea
      rows={rows || 6}
      value={displayValue}
      onChange={handleChange}
      className={`mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 ${className || ""}`}
      placeholder={placeholder}
    />
  );
});
JsonArrayTextarea.displayName = "JsonArrayTextarea";

// Stable component for comma-separated inputs
const CommaSeparatedInput = memo(({ value, onChange, placeholder }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const displayValue = useMemo(() => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.join(", ") : value;
    } catch {
      return value.replace(/[\[\]"]/g, "").replace(/,/g, ", ");
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const values = e.target.value.split(",").map(v => v.trim()).filter(Boolean);
    onChange(JSON.stringify(values));
  }, [onChange]);

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
      placeholder={placeholder}
    />
  );
});
CommaSeparatedInput.displayName = "CommaSeparatedInput";

// Stable component for bestFor input
const BestForInput = memo(({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const displayValue = useMemo(() => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.join(", ") : value;
    } catch {
      return value.replace(/[\[\]"]/g, "").replace(/,/g, ", ");
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const values = e.target.value.split(",").map(v => v.trim()).filter(Boolean);
    onChange(JSON.stringify(values));
  }, [onChange]);

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
      placeholder="Couples, Families, Solo Travelers"
    />
  );
});
BestForInput.displayName = "BestForInput";

// Memoized input components to prevent focus loss
const TextInput = memo(({ value, onChange, placeholder, required, type = "text", className = "" }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  className?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <input
      type={type}
      required={required}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={`mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 ${className}`}
    />
  );
});
TextInput.displayName = "TextInput";

const NumberInput = memo(({ value, onChange, placeholder, min, max, required, className = "" }: {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  required?: boolean;
  className?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = e.target.value === "" ? null : Number(e.target.value);
    onChange(isNaN(numValue as number) ? null : numValue);
  }, [onChange]);

  return (
    <input
      type="number"
      required={required}
      min={min}
      max={max}
      value={value ?? ""}
      onChange={handleChange}
      placeholder={placeholder}
      className={`mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 ${className}`}
    />
  );
});
NumberInput.displayName = "NumberInput";

const TextareaInput = memo(({ value, onChange, placeholder, rows = 3, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <textarea
      rows={rows}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={`mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 ${className}`}
    />
  );
});
TextareaInput.displayName = "TextareaInput";

const SelectInput = memo(({ value, onChange, children, className = "", required }: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <select
      required={required}
      value={value}
      onChange={handleChange}
      className={`mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 ${className}`}
    >
      {children}
    </select>
  );
});
SelectInput.displayName = "SelectInput";

const CheckboxInput = memo(({ checked, onChange, label, className = "" }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  }, [onChange]);

  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
      />
      {label && <span className="text-sm font-medium text-neutral-700">{label}</span>}
    </label>
  );
});
CheckboxInput.displayName = "CheckboxInput";

type CountryOption = { id: string; name: string };

type DayState = {
  uid: string;
  dayIndex: number;
  title: string;
  content: string;
};

type AddOnForm = {
  uid: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  pricingType: "PER_BOOKING" | "PER_PERSON";
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
};

type FormState = {
  // Basic Info
  countryId: string;
  name: string;
  slug: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  tourType: string;
  tourSubType: string;
  bestFor: string; // JSON array string
  
  // Destination & Categorization
  destination: string;
  primaryDestination: string;
  destinationCountry: string;
  destinationState: string;
  citiesCovered: string; // JSON array string
  region: string;
  regionTags: string; // JSON array string
  categoryId: string;
  themes: string; // JSON array string
  
  // Duration & Group Size
  duration: string;
  durationDays: number | null;
  durationNights: number | null;
  groupSizeMin: number | null;
  groupSizeMax: number | null;
  minimumTravelers: number | null;
  maximumTravelers: number | null;
  difficultyLevel: string;
  
  // Pricing
  price: number;
  basePriceInInr: number;
  originalPrice: number | null;
  currency: string;
  packageType: string;
  seasonalPricing: string; // JSON string
  
  // Dates & Availability
  availableDates: string; // JSON array string
  bookingDeadline: string; // ISO date string
  status: string;
  isActive: boolean;
  isFeatured: boolean;
  
  // Advance Payment
  allowAdvance: boolean;
  advancePercentage: number | null;
  requiresPassport: boolean;
  
  // Content
  overview: string;
  highlights: string; // JSON array string
  inclusions: string; // JSON array string
  exclusions: string; // JSON array string
  itinerary: string; // JSON string (for structured itinerary)
  importantNotes: string;
  hotelCategories: string; // JSON array string
  customizationOptions: string; // JSON string
  bookingPolicies: string;
  cancellationTerms: string;
  
  // Images & Media
  imageUrl: string;
  heroImageUrl: string;
  featuredImage: string;
  galleryImageUrls: string; // JSON array string or newline-separated
  images: string; // JSON array string
  ogImage: string;
  twitterImage: string;
  
  // SEO & Social
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
};

const defaultForm: FormState = {
  // Basic Info
  countryId: "",
  name: "",
  slug: "",
  subtitle: "",
  shortDescription: "",
  description: "",
  tourType: "",
  tourSubType: "",
  bestFor: "[]",
  
  // Destination & Categorization
  destination: "",
  primaryDestination: "",
  destinationCountry: "",
  destinationState: "",
  citiesCovered: "[]",
  region: "",
  regionTags: "[]",
  categoryId: "",
  themes: "[]",
  
  // Duration & Group Size
  duration: "",
  durationDays: null,
  durationNights: null,
  groupSizeMin: null,
  groupSizeMax: null,
  minimumTravelers: null,
  maximumTravelers: null,
  difficultyLevel: "",
  
  // Pricing
  price: 0,
  basePriceInInr: 0,
  originalPrice: null,
  currency: "INR",
  packageType: "",
  seasonalPricing: "{}",
  
  // Dates & Availability
  availableDates: "[]",
  bookingDeadline: "",
  status: "active",
  isActive: true,
  isFeatured: false,
  
  // Advance Payment
  allowAdvance: false,
  advancePercentage: null,
  requiresPassport: false,
  
  // Content
  overview: "",
  highlights: "[]",
  inclusions: "[]",
  exclusions: "[]",
  itinerary: "[]",
  importantNotes: "",
  hotelCategories: "[]",
  customizationOptions: "{}",
  bookingPolicies: "",
  cancellationTerms: "",
  
  // Images & Media
  imageUrl: "",
  heroImageUrl: "",
  featuredImage: "",
  galleryImageUrls: "",
  images: "[]",
  ogImage: "",
  twitterImage: "",
  
  // SEO & Social
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  twitterTitle: "",
  twitterDescription: "",
};

const tabs = [
  { id: "basic", label: "Basic Info" },
  { id: "destination", label: "Destination" },
  { id: "duration", label: "Duration & Group" },
  { id: "pricing", label: "Pricing" },
  { id: "addons", label: "Add-ons" },
  { id: "availability", label: "Dates & Availability" },
  { id: "content", label: "Content" },
  { id: "itinerary", label: "Itinerary" },
  { id: "media", label: "Media & SEO" },
];

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function AdminTourEditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";

  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [formData, setFormData] = useState<FormState>(defaultForm);
  const [days, setDays] = useState<DayState[]>([]);
  const [addOns, setAddOns] = useState<AddOnForm[]>([]);
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [coverImageMode, setCoverImageMode] = useState<"url" | "upload">("url");
  const [heroImageMode, setHeroImageMode] = useState<"url" | "upload">("url");
  const [featuredImageMode, setFeaturedImageMode] = useState<"url" | "upload">("url");
  const [coverUploading, setCoverUploading] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [featuredUploading, setFeaturedUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null);
  const [featuredUploadError, setFeaturedUploadError] = useState<string | null>(null);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);
  const [draggingGalleryIndex, setDraggingGalleryIndex] = useState<number | null>(null);

  const fetchCountries = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/content/countries");
      if (!response.ok) return;
      const data = await response.json();
      setCountries(
        data.map((country: any) => ({
          id: country.id,
          name: country.name,
        }))
      );
    } catch (error) {
      console.error("Failed to load countries", error);
    }
  }, []);

  const hydrateTour = useCallback((data: any) => {
    // Helper to parse JSON fields safely
    const parseJsonField = (value: any, defaultValue: string = "[]") => {
      if (!value) return defaultValue;
      if (typeof value === "string") {
        try {
          JSON.parse(value);
          return value;
        } catch {
          return defaultValue;
        }
      }
      return JSON.stringify(value);
    };

    setFormData({
      // Basic Info
      countryId: data.countryId ?? "",
      name: data.name ?? "",
      slug: data.slug ?? "",
      subtitle: data.subtitle ?? "",
      shortDescription: data.shortDescription ?? "",
      description: data.description ?? "",
      tourType: data.tourType ?? "",
      tourSubType: data.tourSubType ?? "",
      bestFor: parseJsonField(data.bestFor),
      
      // Destination & Categorization
      destination: data.destination ?? "",
      primaryDestination: data.primaryDestination ?? "",
      destinationCountry: data.destinationCountry ?? "",
      destinationState: data.destinationState ?? "",
      citiesCovered: parseJsonField(data.citiesCovered),
      region: data.region ?? "",
      regionTags: parseJsonField(data.regionTags),
      categoryId: data.categoryId ?? "",
      themes: parseJsonField(data.themes),
      
      // Duration & Group Size
      duration: data.duration ?? "",
      durationDays: data.durationDays ?? null,
      durationNights: data.durationNights ?? null,
      groupSizeMin: data.groupSizeMin ?? null,
      groupSizeMax: data.groupSizeMax ?? null,
      minimumTravelers: data.minimumTravelers ?? null,
      maximumTravelers: data.maximumTravelers ?? null,
      difficultyLevel: data.difficultyLevel ?? "",
      
      // Pricing
      price: data.price ?? 0,
      basePriceInInr: data.basePriceInInr ?? data.price ?? 0,
      originalPrice: data.originalPrice ?? null,
      currency: data.currency ?? "INR",
      packageType: data.packageType ?? "",
      seasonalPricing: parseJsonField(data.seasonalPricing, "{}"),
      
      // Dates & Availability
      availableDates: parseJsonField(data.availableDates),
      bookingDeadline: data.bookingDeadline ? new Date(data.bookingDeadline).toISOString().split("T")[0] : "",
      status: data.status ?? (data.isActive ? "active" : "inactive"),
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      
      // Advance Payment
      allowAdvance: data.allowAdvance ?? false,
      advancePercentage: data.advancePercentage ?? null,
      requiresPassport: data.requiresPassport ?? false,
      
      // Content
      overview: data.overview ?? "",
      highlights: parseJsonField(data.highlights),
      inclusions: parseJsonField(data.inclusions),
      exclusions: parseJsonField(data.exclusions),
      itinerary: parseJsonField(data.itinerary),
      importantNotes: data.importantNotes ?? "",
      hotelCategories: parseJsonField(data.hotelCategories),
      customizationOptions: parseJsonField(data.customizationOptions, "{}"),
      bookingPolicies: data.bookingPolicies ?? "",
      cancellationTerms: data.cancellationTerms ?? "",
      
      // Images & Media
      imageUrl: data.imageUrl ?? "",
      heroImageUrl: data.heroImageUrl ?? "",
      featuredImage: data.featuredImage ?? "",
      galleryImageUrls: data.galleryImageUrls
        ? (() => {
            try {
              const parsed = JSON.parse(data.galleryImageUrls);
              return Array.isArray(parsed) ? parsed.join("\n") : data.galleryImageUrls;
            } catch {
              return data.galleryImageUrls;
            }
          })()
        : data.images
        ? (() => {
            try {
              const parsed = JSON.parse(data.images);
              return Array.isArray(parsed) ? parsed.join("\n") : "";
            } catch {
              return "";
            }
          })()
        : "",
      images: parseJsonField(data.images),
      ogImage: data.ogImage ?? "",
      twitterImage: data.twitterImage ?? "",
      
      // SEO & Social
      metaTitle: data.metaTitle ?? "",
      metaDescription: data.metaDescription ?? "",
      metaKeywords: data.metaKeywords ?? "",
      canonicalUrl: data.canonicalUrl ?? "",
      ogTitle: data.ogTitle ?? "",
      ogDescription: data.ogDescription ?? "",
      twitterTitle: data.twitterTitle ?? "",
      twitterDescription: data.twitterDescription ?? "",
    });
    setDays(
      (data.days || []).map((day: any, index: number) => ({
        uid: uid(),
        dayIndex: day.dayIndex ?? index + 1,
        title: day.title ?? "",
        content: day.content ?? "",
      }))
    );
    setAddOns(
      (data.addOns || []).map((addOn: any, index: number) => ({
        uid: addOn.id ?? uid(),
        id: addOn.id,
        name: addOn.name ?? "",
        description: addOn.description ?? "",
        price: addOn.price ?? 0,
        pricingType: (addOn.pricingType as "PER_BOOKING" | "PER_PERSON") ?? "PER_BOOKING",
        isRequired: addOn.isRequired ?? false,
        isActive: addOn.isActive ?? true,
        sortOrder: addOn.sortOrder ?? index,
      }))
    );
  }, []);

  const fetchTour = useCallback(async () => {
    if (isNew) {
      setAddOns([]);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/admin/content/tours/${params.id}`);
      if (!response.ok) {
        router.push("/admin/content/tours");
        return;
      }
      const data = await response.json();
      hydrateTour(data);
    } catch (error) {
      console.error("Failed to load tour", error);
      router.push("/admin/content/tours");
    } finally {
      setLoading(false);
    }
  }, [hydrateTour, isNew, params.id, router]);

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
    fetchTour();
  }, [session, status, router, fetchCountries, fetchTour]);

  const updateForm = useCallback((key: keyof FormState, value: string | number | boolean | null) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Memoize handlers to prevent recreation
  const addDay = useCallback(() => {
    setDays((prev) => [
      ...prev,
      { uid: uid(), dayIndex: prev.length + 1, title: "", content: "" },
    ]);
  }, []);

  const updateDay = useCallback((uidValue: string, key: keyof DayState, value: string | number) => {
    setDays((prev) =>
      prev.map((day) => (day.uid === uidValue ? { ...day, [key]: value } : day))
    );
  }, []);

  const removeDay = useCallback((uidValue: string) => {
    setDays((prev) => prev.filter((day) => day.uid !== uidValue));
  }, []);

  const addAddOnRow = useCallback(() => {
    setAddOns((prev) => [
      ...prev,
      {
        uid: uid(),
        name: "",
        description: "",
        price: 0,
        pricingType: "PER_BOOKING",
        isRequired: false,
        isActive: true,
        sortOrder: prev.length,
      },
    ]);
  }, []);

  const updateAddOn = useCallback((
    uidValue: string,
    key: keyof Omit<AddOnForm, "uid">,
    value: string | number | boolean
  ) => {
    setAddOns((prev) =>
      prev.map((addOn) =>
        addOn.uid === uidValue
          ? { ...addOn, [key]: value }
          : addOn
      )
    );
  }, []);

  const removeAddOn = useCallback((uidValue: string) => {
    setAddOns((prev) =>
      prev
        .filter((addOn) => addOn.uid !== uidValue)
        .map((addOn, index) => ({ ...addOn, sortOrder: index }))
    );
  }, []);

  const galleryArray = useMemo(
    () =>
      formData.galleryImageUrls
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean),
    [formData.galleryImageUrls]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      // Helper to parse JSON strings safely
      const parseJsonString = (value: string, defaultValue: any = null) => {
        if (!value || value.trim() === "") return defaultValue;
        try {
          return JSON.parse(value);
        } catch {
          return defaultValue;
        }
      };

      // Convert gallery URLs to JSON array
      const galleryUrls = galleryArray.length > 0 ? galleryArray : parseJsonString(formData.images, []);

      const payload: any = {
        // Basic Info
        countryId: formData.countryId || null,
        name: formData.name,
        slug: formData.slug,
        subtitle: formData.subtitle || null,
        shortDescription: formData.shortDescription || null,
        description: formData.description || null,
        tourType: formData.tourType || null,
        tourSubType: formData.tourSubType || null,
        bestFor: parseJsonString(formData.bestFor, []),
        
        // Destination & Categorization
        destination: formData.destination,
        primaryDestination: formData.primaryDestination || null,
        destinationCountry: formData.destinationCountry || null,
        destinationState: formData.destinationState || null,
        citiesCovered: parseJsonString(formData.citiesCovered, []),
        region: formData.region || null,
        regionTags: parseJsonString(formData.regionTags, []),
        categoryId: formData.categoryId || null,
        themes: parseJsonString(formData.themes, []),
        
        // Duration & Group Size
        duration: formData.duration,
        durationDays: formData.durationDays,
        durationNights: formData.durationNights,
        groupSizeMin: formData.groupSizeMin,
        groupSizeMax: formData.groupSizeMax,
        minimumTravelers: formData.minimumTravelers,
        maximumTravelers: formData.maximumTravelers,
        difficultyLevel: formData.difficultyLevel || null,
        
        // Pricing
        price: formData.price,
        basePriceInInr: formData.basePriceInInr || formData.price,
        originalPrice: formData.originalPrice,
        currency: formData.currency || "INR",
        packageType: formData.packageType || null,
        seasonalPricing: parseJsonString(formData.seasonalPricing, {}),
        
        // Dates & Availability
        availableDates: parseJsonString(formData.availableDates, []),
        bookingDeadline: formData.bookingDeadline ? new Date(formData.bookingDeadline).toISOString() : null,
        status: formData.status || (formData.isActive ? "active" : "inactive"),
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        
        // Advance Payment
        allowAdvance: formData.allowAdvance,
        advancePercentage: formData.advancePercentage,
        requiresPassport: formData.requiresPassport,
        
        // Content
        overview: formData.overview || null,
        highlights: parseJsonString(formData.highlights, []),
        inclusions: parseJsonString(formData.inclusions, []),
        exclusions: parseJsonString(formData.exclusions, []),
        itinerary: parseJsonString(formData.itinerary, []),
        importantNotes: formData.importantNotes || null,
        hotelCategories: parseJsonString(formData.hotelCategories, []),
        customizationOptions: parseJsonString(formData.customizationOptions, {}),
        bookingPolicies: formData.bookingPolicies || null,
        cancellationTerms: formData.cancellationTerms || null,
        
        // Images & Media
        imageUrl: formData.imageUrl || null,
        heroImageUrl: formData.heroImageUrl || null,
        featuredImage: formData.featuredImage || null,
        galleryImageUrls: galleryUrls,
        images: galleryUrls,
        ogImage: formData.ogImage || null,
        twitterImage: formData.twitterImage || null,
        
        // SEO & Social
        metaTitle: formData.metaTitle || null,
        metaDescription: formData.metaDescription || null,
        metaKeywords: formData.metaKeywords || null,
        canonicalUrl: formData.canonicalUrl || null,
        ogTitle: formData.ogTitle || null,
        ogDescription: formData.ogDescription || null,
        twitterTitle: formData.twitterTitle || null,
        twitterDescription: formData.twitterDescription || null,
        
        addOns: addOns.map((addOn, index) => ({
          id: addOn.id,
          name: addOn.name,
          description: addOn.description,
          price: Number(addOn.price) || 0,
          pricingType: addOn.pricingType,
          isRequired: addOn.isRequired,
          isActive: addOn.isActive,
          sortOrder: typeof addOn.sortOrder === "number" ? addOn.sortOrder : index,
        })),
        
        // Itinerary Days
        days: days.map((day, index) => ({
          dayIndex: day.dayIndex || index + 1,
          title: day.title,
          content: day.content,
        })),
      };

      const response = await fetch(
        isNew ? "/api/admin/content/tours" : `/api/admin/content/tours/${params.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to save tour");
        return;
      }

      router.push("/admin/content/tours");
    } catch (error) {
      console.error("Failed to save tour", error);
      alert("Unexpected error while saving tour");
    } finally {
      setSaving(false);
    }
  };

  const uploadCmsImage = async (
    file: File,
    folder: string,
    scope: string
  ): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    form.append("scope", scope);

    console.log(`Uploading ${scope} image:`, { fileName: file.name, size: file.size, type: file.type });

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMessage = error.error || `Upload failed with status ${response.status}`;
      console.error("Upload API error:", errorMessage, error);
      throw new Error(errorMessage);
    }

    const payload = await response.json();
    const imageUrl = payload.proxyUrl || payload.url;
    
    if (!imageUrl) {
      console.error("Upload response missing URL:", payload);
      throw new Error("No image URL returned from upload");
    }

    console.log(`Upload successful for ${scope}:`, imageUrl);
    return imageUrl;
  };

  const handleCoverImageUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large. Maximum 5 MB allowed.");
      return;
    }

    setCoverUploading(true);
    setCoverUploadError(null);
    try {
      const url = await uploadCmsImage(file, "tours", "cover");
      if (!url) {
        throw new Error("No URL returned from upload");
      }
      updateForm("imageUrl", url);
      setCoverImageMode("upload");
    } catch (error: any) {
      console.error("Cover upload failed", error);
      const errorMessage = error.message || "Failed to upload cover image";
      setCoverUploadError(errorMessage);
      alert(`Cover image upload failed: ${errorMessage}`);
    } finally {
      setCoverUploading(false);
    }
  };

  const handleHeroImageUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large. Maximum 5 MB allowed.");
      return;
    }

    setHeroUploading(true);
    setHeroUploadError(null);
    try {
      const url = await uploadCmsImage(file, "tours", "hero");
      if (!url) {
        throw new Error("No URL returned from upload");
      }
      updateForm("heroImageUrl", url);
      setHeroImageMode("upload");
    } catch (error: any) {
      console.error("Hero upload failed", error);
      const errorMessage = error.message || "Failed to upload hero image";
      setHeroUploadError(errorMessage);
      alert(`Hero image upload failed: ${errorMessage}`);
    } finally {
      setHeroUploading(false);
    }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setGalleryUploading(true);
    setGalleryUploadError(null);
    try {
      const uploads: string[] = [];
      const fileArray = Array.from(files);
      
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        if (!file.type.startsWith("image/")) {
          throw new Error(`File "${file.name}" is not a valid image file.`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds 5 MB limit.`);
        }
        try {
          const url = await uploadCmsImage(file, "tours", "gallery");
          if (!url) {
            throw new Error(`No URL returned for "${file.name}"`);
          }
          uploads.push(url);
        } catch (uploadError: any) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          throw new Error(`Failed to upload "${file.name}": ${uploadError.message || "Unknown error"}`);
        }
      }
      
      if (uploads.length === 0) {
        throw new Error("No images were uploaded successfully.");
      }
      
      const existing = galleryArray;
      const combined = [...existing, ...uploads].join("\n");
      updateForm("galleryImageUrls", combined);
    } catch (error: any) {
      console.error("Gallery upload failed", error);
      const errorMessage = error.message || "Failed to upload gallery images";
      setGalleryUploadError(errorMessage);
      alert(`Gallery upload failed: ${errorMessage}`);
    } finally {
      setGalleryUploading(false);
    }
  };

  const setGalleryFromArray = (items: string[]) => {
    updateForm("galleryImageUrls", items.join("\n"));
  };

  const handleGalleryRemove = (index: number) => {
    const next = [...galleryArray];
    next.splice(index, 1);
    setGalleryFromArray(next);
  };

  const handleGalleryReorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= galleryArray.length || to >= galleryArray.length) {
      return;
    }
    const updated = [...galleryArray];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setGalleryFromArray(updated);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            <p className="mt-4 text-neutral-600">Loading tour...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <Link
            href="/admin/content/tours"
            className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Tours
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900 mt-3">
            {isNew ? "Create Tour" : "Edit Tour"}
          </h1>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
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
            {activeTab === "basic" && <BasicTab />}
            {activeTab === "destination" && <DestinationTab />}
            {activeTab === "duration" && <DurationTab />}
            {activeTab === "pricing" && <PricingTab />}
            {activeTab === "addons" && <AddOnsTab />}
            {activeTab === "availability" && <AvailabilityTab />}
            {activeTab === "content" && <ContentTab />}
            {activeTab === "itinerary" && <ItineraryTab />}
            {activeTab === "media" && <MediaTab />}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
              <Link
                href="/admin/content/tours"
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
                    Save Tour
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );

  function BasicTab() {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Tour Name <span className="text-red-500">*</span>
            </span>
            <TextInput
              required
              value={formData.name}
              onChange={(value) => updateForm("name", value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Slug <span className="text-red-500">*</span>
            </span>
            <div className="flex gap-2">
              <TextInput
                required
                value={formData.slug}
                onChange={(value) => updateForm("slug", value)}
                placeholder="dubai-deluxe-getaway"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => updateForm("slug", slugify(formData.name))}
                className="mt-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </label>
        </div>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Short Description</span>
          <TextareaInput
            rows={3}
            value={formData.shortDescription}
            onChange={(value) => updateForm("shortDescription", value)}
            placeholder="Brief overview (shown in listings)"
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Full Description</span>
          <TextareaInput
            rows={6}
            value={formData.description}
            onChange={(value) => updateForm("description", value)}
            placeholder="Detailed tour description"
          />
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Tour Type</span>
            <SelectInput
              value={formData.tourType}
              onChange={(value) => updateForm("tourType", value)}
            >
              <option value="">Select type</option>
              <option value="group">Group Tour</option>
              <option value="private">Private Tour</option>
              <option value="fixed_departure">Fixed Departure</option>
              <option value="on_demand">On Demand</option>
            </SelectInput>
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Tour Sub Type</span>
            <SelectInput
              value={formData.tourSubType}
              onChange={(value) => updateForm("tourSubType", value)}
            >
              <option value="">Select sub type</option>
              <option value="honeymoon">Honeymoon</option>
              <option value="family">Family</option>
              <option value="adventure">Adventure</option>
              <option value="leisure">Leisure</option>
              <option value="religious">Religious</option>
              <option value="wildlife">Wildlife</option>
            </SelectInput>
          </label>
        </div>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Best For (comma-separated)</span>
          <BestForInput
            value={formData.bestFor}
            onChange={(value) => updateForm("bestFor", value)}
          />
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-neutral-200 rounded-lg px-3 py-2">
            <CheckboxInput
              checked={formData.isFeatured}
              onChange={(checked) => updateForm("isFeatured", checked)}
              label="Featured package"
            />
          </div>
          <div className="border border-neutral-200 rounded-lg px-3 py-2">
            <CheckboxInput
              checked={formData.isActive}
              onChange={(checked) => updateForm("isActive", checked)}
              label="Visible to travellers"
            />
          </div>
        </div>
      </div>
    );
  }

  function DestinationTab() {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Country <span className="text-red-500">*</span>
            </span>
            <SelectInput
              required
              value={formData.countryId}
              onChange={(value) => updateForm("countryId", value)}
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </SelectInput>
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Destination <span className="text-red-500">*</span>
            </span>
            <TextInput
              required
              value={formData.destination}
              onChange={(value) => updateForm("destination", value)}
            />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Primary Destination</span>
            <TextInput
              value={formData.primaryDestination}
              onChange={(value) => updateForm("primaryDestination", value)}
              placeholder="Main city or location"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Destination Country</span>
            <TextInput
              value={formData.destinationCountry}
              onChange={(value) => updateForm("destinationCountry", value)}
            />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Destination State</span>
            <TextInput
              value={formData.destinationState}
              onChange={(value) => updateForm("destinationState", value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Region</span>
            <TextInput
              value={formData.region}
              onChange={(value) => updateForm("region", value)}
              placeholder="e.g., South East Asia, Europe"
            />
          </label>
        </div>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Cities Covered (comma-separated)</span>
          <CommaSeparatedInput
            value={formData.citiesCovered}
            onChange={(value) => updateForm("citiesCovered", value)}
            placeholder="Dubai, Abu Dhabi, Sharjah"
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Region Tags (comma-separated)</span>
          <CommaSeparatedInput
            value={formData.regionTags}
            onChange={(value) => updateForm("regionTags", value)}
            placeholder="Beach, Hills, City"
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Themes (comma-separated)</span>
          <CommaSeparatedInput
            value={formData.themes}
            onChange={(value) => updateForm("themes", value)}
            placeholder="Honeymoon, Adventure, Beach, Culture"
          />
        </label>
      </div>
    );
  }

  function DurationTab() {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Duration (Display) <span className="text-red-500">*</span>
            </span>
            <TextInput
              required
              value={formData.duration}
              onChange={(value) => updateForm("duration", value)}
              placeholder="5 Nights / 6 Days"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Difficulty Level</span>
            <SelectInput
              value={formData.difficultyLevel}
              onChange={(value) => updateForm("difficultyLevel", value)}
            >
              <option value="">Select level</option>
              <option value="Easy">Easy</option>
              <option value="Moderate">Moderate</option>
              <option value="Difficult">Difficult</option>
            </SelectInput>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Duration (Days)</span>
            <NumberInput
              min={1}
              value={formData.durationDays}
              onChange={(value) => updateForm("durationDays", value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Duration (Nights)</span>
            <NumberInput
              min={0}
              value={formData.durationNights}
              onChange={(value) => updateForm("durationNights", value)}
            />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Group Size Min</span>
            <NumberInput
              min={1}
              value={formData.groupSizeMin}
              onChange={(value) => updateForm("groupSizeMin", value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Group Size Max</span>
            <NumberInput
              min={1}
              value={formData.groupSizeMax}
              onChange={(value) => updateForm("groupSizeMax", value)}
            />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Minimum Travelers</span>
            <NumberInput
              min={1}
              value={formData.minimumTravelers}
              onChange={(value) => updateForm("minimumTravelers", value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Maximum Travelers</span>
            <NumberInput
              min={1}
              value={formData.maximumTravelers}
              onChange={(value) => updateForm("maximumTravelers", value)}
            />
          </label>
        </div>
      </div>
    );
  }

  function PricingTab() {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Price <span className="text-red-500">*</span>
            </span>
            <NumberInput
              min={0}
              required
              value={formData.price}
              onChange={(value) => updateForm("price", value ?? 0)}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Currency</span>
            <SelectInput
              value={formData.currency}
              onChange={(value) => updateForm("currency", value)}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </SelectInput>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Original Price</span>
            <NumberInput
              min={0}
              value={formData.originalPrice}
              onChange={(value) => updateForm("originalPrice", value)}
              placeholder="For showing strikethrough price"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Base Price Override</span>
            <NumberInput
              min={0}
              value={formData.basePriceInInr}
              onChange={(value) => updateForm("basePriceInInr", value ?? 0)}
              placeholder="Defaults to price above"
            />
          </label>
        </div>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Package Type</span>
          <SelectInput
            value={formData.packageType}
            onChange={(value) => updateForm("packageType", value)}
          >
            <option value="">Select type</option>
            <option value="fixed_departure">Fixed Departure</option>
            <option value="on_demand">On Demand</option>
            <option value="private">Private</option>
          </SelectInput>
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Seasonal Pricing (JSON)</span>
          <TextareaInput
            rows={6}
            value={formData.seasonalPricing}
            onChange={(value) => updateForm("seasonalPricing", value)}
            className="font-mono text-sm"
            placeholder='{"peak": {"from": "2025-12-15", "to": "2026-01-10", "price": 65000}}'
          />
          <p className="text-xs text-neutral-500 mt-1">
            JSON format: Define seasons with date ranges and price overrides
          </p>
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-neutral-200 rounded-lg px-3 py-2">
            <CheckboxInput
              checked={formData.allowAdvance}
              onChange={(checked) => updateForm("allowAdvance", checked)}
              label="Allow advance payment"
            />
          </div>
          {formData.allowAdvance && (
            <label className="flex flex-col">
              <span className="text-sm font-medium text-neutral-700">
                Advance percentage
              </span>
              <NumberInput
                min={0}
                max={100}
                value={formData.advancePercentage}
                onChange={(value) => updateForm("advancePercentage", value)}
              />
            </label>
          )}
        </div>

        <div className="border border-neutral-200 rounded-lg px-3 py-3">
          <CheckboxInput
            checked={formData.requiresPassport}
            onChange={(checked) => updateForm("requiresPassport", checked)}
            label="Passport required for this tour"
            className="items-start"
          />
          <span className="text-sm text-neutral-500 block mt-1">
            Enforce passport collection even for domestic packages.
          </span>
        </div>
      </div>
    );
  }

  function AddOnsTab() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          Configure optional or mandatory add-ons that travellers can choose during checkout.
        </p>

        {addOns.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-6 text-center">
            <p className="text-neutral-600 mb-3">No add-ons configured yet.</p>
            <button
              type="button"
              onClick={addAddOnRow}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition"
            >
              <Plus size={16} />
              Add first add-on
            </button>
          </div>
        )}

        <div className="space-y-4">
          {addOns.map((addOn, index) => (
            <div
              key={addOn.uid}
              className="border border-neutral-200 rounded-2xl p-4 shadow-sm bg-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    Add-on #{index + 1}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {addOn.id ? "Existing item" : "New item"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAddOn(addOn.uid)}
                  className="text-sm text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-700">Name</span>
                  <TextInput
                    value={addOn.name}
                    onChange={(value) => updateAddOn(addOn.uid, "name", value)}
                    placeholder="E.g. 4★ Hotel Upgrade"
                    required
                  />
                </label>
                <label className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-700">Price (₹)</span>
                  <NumberInput
                    min={0}
                    value={addOn.price}
                    onChange={(value) => updateAddOn(addOn.uid, "price", value ?? 0)}
                    placeholder="0 for free add-on"
                  />
                </label>
              </div>

              <label className="flex flex-col mt-4">
                <span className="text-sm font-medium text-neutral-700">Description</span>
                <TextareaInput
                  rows={2}
                  value={addOn.description}
                  onChange={(value) => updateAddOn(addOn.uid, "description", value)}
                  placeholder="Short description that appears to travellers"
                />
              </label>

              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <label className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-700">Pricing Type</span>
                  <SelectInput
                    value={addOn.pricingType}
                    onChange={(value) =>
                      updateAddOn(
                        addOn.uid,
                        "pricingType",
                        value as "PER_BOOKING" | "PER_PERSON"
                      )
                    }
                  >
                    <option value="PER_BOOKING">Per booking</option>
                    <option value="PER_PERSON">Per traveller</option>
                  </SelectInput>
                </label>

                <label className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-700">Sort order</span>
                  <NumberInput
                    value={addOn.sortOrder}
                    onChange={(value) =>
                      updateAddOn(
                        addOn.uid,
                        "sortOrder",
                        value ?? 0
                      )
                    }
                  />
                </label>

                <div className="flex flex-col gap-2">
                  <div className="border border-neutral-200 rounded-lg px-3 py-2">
                    <CheckboxInput
                      checked={addOn.isRequired}
                      onChange={(checked) => updateAddOn(addOn.uid, "isRequired", checked)}
                      label="Required"
                    />
                  </div>
                  <div className="border border-neutral-200 rounded-lg px-3 py-2">
                    <CheckboxInput
                      checked={addOn.isActive}
                      onChange={(checked) => updateAddOn(addOn.uid, "isActive", checked)}
                      label="Active"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {addOns.length > 0 && (
          <button
            type="button"
            onClick={addAddOnRow}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-neutral-300 text-sm font-medium hover:border-neutral-400 transition"
          >
            <Plus size={16} />
            Add another add-on
          </button>
        )}
      </div>
    );
  }

  function AvailabilityTab() {
    return (
      <div className="space-y-4">
        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Status</span>
          <SelectInput
            value={formData.status}
            onChange={(value) => {
              updateForm("status", value);
              updateForm("isActive", value === "active");
            }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </SelectInput>
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Available Dates (comma-separated or JSON array)</span>
          <JsonArrayTextarea
            value={formData.availableDates}
            onChange={(value) => updateForm("availableDates", value)}
            rows={4}
            className="font-mono text-sm"
            placeholder="2025-12-15&#10;2025-12-22&#10;2026-01-05"
          />
          <p className="text-xs text-neutral-500 mt-1">
            One date per line (YYYY-MM-DD format) for fixed departure tours
          </p>
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Booking Deadline</span>
          <TextInput
            type="date"
            value={formData.bookingDeadline}
            onChange={(value) => updateForm("bookingDeadline", value)}
          />
          <p className="text-xs text-neutral-500 mt-1">
            Last date for booking (leave empty for no deadline)
          </p>
        </label>
      </div>
    );
  }

  function ContentTab() {
    return (
      <div className="space-y-4">
        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Overview</span>
          <TextareaInput
            rows={5}
            value={formData.overview}
            onChange={(value) => updateForm("overview", value)}
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Highlights (one per line)</span>
          <JsonArrayTextarea
            value={formData.highlights}
            onChange={(value) => updateForm("highlights", value)}
            rows={6}
            placeholder="Key highlights of the tour"
          />
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Inclusions (one per line)</span>
            <JsonArrayTextarea
              value={formData.inclusions}
              onChange={(value) => updateForm("inclusions", value)}
              rows={6}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Exclusions (one per line)</span>
            <JsonArrayTextarea
              value={formData.exclusions}
              onChange={(value) => updateForm("exclusions", value)}
              rows={6}
            />
          </label>
        </div>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Hotel Categories (comma-separated)</span>
          <CommaSeparatedInput
            value={formData.hotelCategories}
            onChange={(value) => updateForm("hotelCategories", value)}
            placeholder="3-star, 4-star, 5-star"
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Customization Options (JSON)</span>
          <TextareaInput
            rows={6}
            value={formData.customizationOptions}
            onChange={(value) => updateForm("customizationOptions", value)}
            className="font-mono text-sm"
            placeholder='{"Private Transfers": {"price": 5000, "type": "per_person"}, "Extra Night": {"price": 3000, "type": "flat"}}'
          />
          <p className="text-xs text-neutral-500 mt-1">
            JSON format: Define customization options with pricing
          </p>
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Booking Policies</span>
            <TextareaInput
              rows={4}
              value={formData.bookingPolicies}
              onChange={(value) => updateForm("bookingPolicies", value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Cancellation Terms</span>
            <TextareaInput
              rows={4}
              value={formData.cancellationTerms}
              onChange={(value) => updateForm("cancellationTerms", value)}
            />
          </label>
        </div>

        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">Important Notes</span>
          <TextareaInput
            rows={3}
            value={formData.importantNotes}
            onChange={(value) => updateForm("importantNotes", value)}
          />
        </label>
      </div>
    );
  }

  function ItineraryTab() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Day cards</h3>
            <p className="text-sm text-neutral-500">
              These show up as an itinerary timeline on the tour page.
            </p>
          </div>
          <button
            type="button"
            onClick={addDay}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium"
          >
            <Plus size={16} />
            Add day
          </button>
        </div>
        {days.length === 0 && (
          <p className="text-sm text-neutral-500">
            Start by adding at least one itinerary day.
          </p>
        )}
        <div className="space-y-4">
          {days.map((day) => (
            <div
              key={day.uid}
              className="border border-neutral-200 rounded-xl p-4 space-y-3"
            >
              <div className="grid md:grid-cols-3 gap-3">
                <label className="flex flex-col">
                  <span className="text-xs font-medium text-neutral-600">
                    Day number
                  </span>
                  <NumberInput
                    min={1}
                    value={day.dayIndex}
                    onChange={(value) =>
                      updateDay(day.uid, "dayIndex", value ?? 1)
                    }
                    className="text-sm"
                  />
                </label>
                <label className="flex flex-col md:col-span-2">
                  <span className="text-xs font-medium text-neutral-600">
                    Title
                  </span>
                  <TextInput
                    value={day.title}
                    onChange={(value) => updateDay(day.uid, "title", value)}
                    className="text-sm"
                    placeholder="Arrival & Marina Cruise"
                  />
                </label>
              </div>
              <label className="flex flex-col">
                <span className="text-xs font-medium text-neutral-600">
                  Description
                </span>
                <TextareaInput
                  rows={3}
                  value={day.content}
                  onChange={(value) => updateDay(day.uid, "content", value)}
                  className="text-sm"
                  placeholder="Outline activities, transfers, dining, etc."
                />
              </label>
              <button
                type="button"
                onClick={() => removeDay(day.uid)}
                className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 size={14} />
                Remove day
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleFeaturedImageUpload = async (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image (JPG, PNG, WEBP).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Image too large. Maximum 5 MB allowed.");
        return;
      }

      setFeaturedUploading(true);
      setFeaturedUploadError(null);
      try {
        const url = await uploadCmsImage(file, "tours", "featured");
        if (!url) {
          throw new Error("No URL returned from upload");
        }
        updateForm("featuredImage", url);
        setFeaturedImageMode("upload");
      } catch (error: any) {
        console.error("Featured image upload failed", error);
        const errorMessage = error.message || "Failed to upload featured image";
        setFeaturedUploadError(errorMessage);
        alert(`Featured image upload failed: ${errorMessage}`);
      } finally {
        setFeaturedUploading(false);
      }
    };

  function MediaTab() {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">
                Featured Image
              </span>
              <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setFeaturedImageMode("url")}
                  className={`px-3 py-1.5 ${
                    featuredImageMode === "url" ? "bg-primary-600 text-white" : "text-neutral-600"
                  }`}
                >
                  Use URL
                </button>
                <button
                  type="button"
                  onClick={() => setFeaturedImageMode("upload")}
                  className={`px-3 py-1.5 ${
                    featuredImageMode === "upload" ? "bg-primary-600 text-white" : "text-neutral-600"
                  }`}
                >
                  Upload
                </button>
              </div>
            </div>
            {featuredImageMode === "url" ? (
              <TextInput
                type="url"
                value={formData.featuredImage}
                onChange={(value) => updateForm("featuredImage", value)}
                className="mt-2"
                placeholder="https://..."
              />
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFeaturedImageUpload(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 hover:border-primary-400 cursor-pointer"
                />
                <p className="text-xs text-neutral-500">JPG, PNG or WEBP up to 5 MB.</p>
                {featuredUploading && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Loader2 size={16} className="animate-spin" />
                    Uploading featured image...
                  </div>
                )}
                {featuredUploadError && (
                  <p className="text-sm text-red-600">{featuredUploadError}</p>
                )}
              </div>
            )}
            {formData.featuredImage && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaProxyUrl(formData.featuredImage)}
                  alt="Featured preview"
                  className="w-full max-h-48 object-cover rounded-lg border border-neutral-200"
                />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">
                Cover Image
              </span>
              <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-medium">
              <button
                type="button"
                onClick={() => setCoverImageMode("url")}
                className={`px-3 py-1.5 ${
                  coverImageMode === "url" ? "bg-primary-600 text-white" : "text-neutral-600"
                }`}
              >
                Use URL
              </button>
              <button
                type="button"
                onClick={() => setCoverImageMode("upload")}
                className={`px-3 py-1.5 ${
                  coverImageMode === "upload" ? "bg-primary-600 text-white" : "text-neutral-600"
                }`}
              >
                Upload
              </button>
            </div>
            </div>
            {coverImageMode === "url" ? (
              <TextInput
                type="url"
                value={formData.imageUrl}
                onChange={(value) => updateForm("imageUrl", value)}
                className="mt-2"
                placeholder="https://..."
              />
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCoverImageUpload(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 hover:border-primary-400 cursor-pointer"
                />
                <p className="text-xs text-neutral-500">JPG, PNG or WEBP up to 5 MB.</p>
                {coverUploading && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Loader2 size={16} className="animate-spin" />
                    Uploading cover image...
                  </div>
                )}
                {coverUploadError && (
                  <p className="text-sm text-red-600">{coverUploadError}</p>
                )}
              </div>
            )}
            {formData.imageUrl && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaProxyUrl(formData.imageUrl)}
                  alt="Cover preview"
                  className="w-full max-h-48 object-cover rounded-lg border border-neutral-200"
                />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">
                Hero Image
              </span>
              <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setHeroImageMode("url")}
                  className={`px-3 py-1.5 ${
                    heroImageMode === "url" ? "bg-primary-600 text-white" : "text-neutral-600"
                  }`}
                >
                  Use URL
                </button>
                <button
                  type="button"
                  onClick={() => setHeroImageMode("upload")}
                  className={`px-3 py-1.5 ${
                    heroImageMode === "upload" ? "bg-primary-600 text-white" : "text-neutral-600"
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
                onChange={(value) => updateForm("heroImageUrl", value)}
                className="mt-2"
                placeholder="https://..."
              />
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleHeroImageUpload(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 hover:border-primary-400 cursor-pointer"
                />
                <p className="text-xs text-neutral-500">JPG, PNG or WEBP up to 5 MB.</p>
                {heroUploading && (
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Loader2 size={16} className="animate-spin" />
                    Uploading hero image...
                  </div>
                )}
                {heroUploadError && (
                  <p className="text-sm text-red-600">{heroUploadError}</p>
                )}
              </div>
            )}
            {formData.heroImageUrl && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaProxyUrl(formData.heroImageUrl)}
                  alt="Hero preview"
                  className="w-full max-h-48 object-cover rounded-lg border border-neutral-200"
                />
              </div>
            )}
          </div>
        </div>
        <label className="flex flex-col">
          <span className="text-sm font-medium text-neutral-700">
            Gallery image URLs (one per line)
          </span>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleGalleryUpload(e.target.files)}
              className="px-3 py-2 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 hover:border-primary-400 cursor-pointer"
            />
            {galleryUploading && (
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Loader2 size={16} className="animate-spin" />
                Uploading gallery images...
              </div>
            )}
            {galleryUploadError && (
              <p className="text-sm text-red-600">{galleryUploadError}</p>
            )}
          </div>
          <TextareaInput
            rows={4}
            value={formData.galleryImageUrls}
            onChange={(value) => updateForm("galleryImageUrls", value)}
            placeholder="https://example.com/photo1.jpg"
          />
          {galleryArray.length > 0 && (
            <div className="mt-4 space-y-2">
              {galleryArray.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  draggable
                  onDragStart={() => setDraggingGalleryIndex(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggingGalleryIndex === null || draggingGalleryIndex === index) return;
                    handleGalleryReorder(draggingGalleryIndex, index);
                    setDraggingGalleryIndex(index);
                  }}
                  onDragEnd={() => setDraggingGalleryIndex(null)}
                  className={`flex items-center gap-3 border border-neutral-200 rounded-lg p-3 bg-white ${
                    draggingGalleryIndex === index ? "opacity-70 border-primary-300" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getMediaProxyUrl(url)}
                    alt={`Gallery ${index + 1}`}
                    className="h-16 w-16 object-cover rounded-md border border-neutral-200 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{url}</p>
                    <p className="text-xs text-neutral-500">Drag to reorder</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGalleryRemove(index)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </label>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">SEO Metadata</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium text-neutral-700">Meta Title</span>
              <TextInput
                value={formData.metaTitle}
                onChange={(value) => updateForm("metaTitle", value)}
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm font-medium text-neutral-700">Meta Keywords</span>
              <TextInput
                value={formData.metaKeywords}
                onChange={(value) => updateForm("metaKeywords", value)}
                placeholder="comma, separated, keywords"
              />
            </label>
          </div>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Meta Description</span>
            <TextareaInput
              rows={3}
              value={formData.metaDescription}
              onChange={(value) => updateForm("metaDescription", value)}
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Canonical URL</span>
            <TextInput
              type="url"
              value={formData.canonicalUrl}
              onChange={(value) => updateForm("canonicalUrl", value)}
              placeholder="https://travunited.com/tours/slug"
            />
          </label>
        </div>

        <div className="space-y-4 border-t border-neutral-200 pt-4">
          <h3 className="text-lg font-semibold text-neutral-900">Open Graph (Facebook/LinkedIn)</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium text-neutral-700">OG Title</span>
              <TextInput
                value={formData.ogTitle}
                onChange={(value) => updateForm("ogTitle", value)}
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm font-medium text-neutral-700">OG Image URL</span>
              <TextInput
                type="url"
                value={formData.ogImage}
                onChange={(value) => updateForm("ogImage", value)}
              />
            </label>
          </div>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">OG Description</span>
            <TextareaInput
              rows={2}
              value={formData.ogDescription}
              onChange={(value) => updateForm("ogDescription", value)}
            />
          </label>
        </div>

        <div className="space-y-4 border-t border-neutral-200 pt-4">
          <h3 className="text-lg font-semibold text-neutral-900">Twitter Cards</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium text-neutral-700">Twitter Title</span>
              <TextInput
                value={formData.twitterTitle}
                onChange={(value) => updateForm("twitterTitle", value)}
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm font-medium text-neutral-700">Twitter Image URL</span>
              <TextInput
                type="url"
                value={formData.twitterImage}
                onChange={(value) => updateForm("twitterImage", value)}
              />
            </label>
          </div>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Twitter Description</span>
            <TextareaInput
              rows={2}
              value={formData.twitterDescription}
              onChange={(value) => updateForm("twitterDescription", value)}
            />
          </label>
        </div>
      </div>
    );
  }
}

