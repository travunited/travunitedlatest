"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type CountryOption = { id: string; name: string };

type DayState = {
  uid: string;
  dayIndex: number;
  title: string;
  content: string;
};

type FormState = {
  countryId: string;
  name: string;
  slug: string;
  subtitle: string;
  destination: string;
  duration: string;
  overview: string;
  description: string;
  inclusions: string;
  exclusions: string;
  importantNotes: string;
  price: number;
  basePriceInInr: number;
  allowAdvance: boolean;
  advancePercentage: number | null;
  isActive: boolean;
  isFeatured: boolean;
  imageUrl: string;
  heroImageUrl: string;
  galleryImageUrls: string;
  metaTitle: string;
  metaDescription: string;
};

const defaultForm: FormState = {
  countryId: "",
  name: "",
  slug: "",
  subtitle: "",
  destination: "",
  duration: "",
  overview: "",
  description: "",
  inclusions: "",
  exclusions: "",
  importantNotes: "",
  price: 0,
  basePriceInInr: 0,
  allowAdvance: false,
  advancePercentage: null,
  isActive: true,
  isFeatured: false,
  imageUrl: "",
  heroImageUrl: "",
  galleryImageUrls: "",
  metaTitle: "",
  metaDescription: "",
};

const tabs = [
  { id: "basic", label: "Basic Info" },
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
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [coverImageMode, setCoverImageMode] = useState<"url" | "upload">("url");
  const [heroImageMode, setHeroImageMode] = useState<"url" | "upload">("url");
  const [coverUploading, setCoverUploading] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [heroUploadError, setHeroUploadError] = useState<string | null>(null);
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
    setFormData({
      countryId: data.countryId ?? "",
      name: data.name ?? "",
      slug: data.slug ?? "",
      subtitle: data.subtitle ?? "",
      destination: data.destination ?? "",
      duration: data.duration ?? "",
      overview: data.overview ?? "",
      description: data.description ?? "",
      inclusions: data.inclusions ?? "",
      exclusions: data.exclusions ?? "",
      importantNotes: data.importantNotes ?? "",
      price: data.price ?? 0,
      basePriceInInr: data.basePriceInInr ?? data.price ?? 0,
      allowAdvance: data.allowAdvance ?? false,
      advancePercentage: data.advancePercentage ?? null,
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      imageUrl: data.imageUrl ?? "",
      heroImageUrl: data.heroImageUrl ?? "",
      galleryImageUrls: data.galleryImageUrls
        ? JSON.parse(data.galleryImageUrls).join("\n")
        : "",
      metaTitle: data.metaTitle ?? "",
      metaDescription: data.metaDescription ?? "",
    });
    setDays(
      (data.days || []).map((day: any, index: number) => ({
        uid: uid(),
        dayIndex: day.dayIndex ?? index + 1,
        title: day.title ?? "",
        content: day.content ?? "",
      }))
    );
  }, []);

  const fetchTour = useCallback(async () => {
    if (isNew) {
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
    if (session.user.role !== "SUPER_ADMIN") {
      router.push("/admin");
      return;
    }
    fetchCountries();
    fetchTour();
  }, [session, status, router, fetchCountries, fetchTour]);

  const updateForm = (key: keyof FormState, value: string | number | boolean | null) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const addDay = () => {
    setDays((prev) => [
      ...prev,
      { uid: uid(), dayIndex: prev.length + 1, title: "", content: "" },
    ]);
  };

  const updateDay = (uidValue: string, key: keyof DayState, value: string | number) => {
    setDays((prev) =>
      prev.map((day) => (day.uid === uidValue ? { ...day, [key]: value } : day))
    );
  };

  const removeDay = (uidValue: string) => {
    setDays((prev) => prev.filter((day) => day.uid !== uidValue));
  };

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
      const payload = {
        ...formData,
        galleryImageUrls: galleryArray,
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

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to upload image");
    }

    const payload = await response.json();
    return payload.url as string;
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
      updateForm("imageUrl", url);
      setCoverImageMode("upload");
    } catch (error: any) {
      console.error("Cover upload failed", error);
      setCoverUploadError(error.message || "Failed to upload image");
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
      updateForm("heroImageUrl", url);
      setHeroImageMode("upload");
    } catch (error: any) {
      console.error("Hero upload failed", error);
      setHeroUploadError(error.message || "Failed to upload image");
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
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Gallery images must be valid image files.");
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Each gallery image must be under 5 MB.");
        }
        const url = await uploadCmsImage(file, "tours", "gallery");
        uploads.push(url);
      }
      const existing = galleryArray;
      const combined = [...existing, ...uploads].join("\n");
      updateForm("galleryImageUrls", combined);
    } catch (error: any) {
      console.error("Gallery upload failed", error);
      setGalleryUploadError(error.message || "Failed to upload gallery images");
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
              Country <span className="text-red-500">*</span>
            </span>
            <select
              required
              value={formData.countryId}
              onChange={(e) => updateForm("countryId", e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Tour Name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => updateForm("name", e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Slug <span className="text-red-500">*</span>
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => updateForm("slug", e.target.value)}
                className="mt-1 flex-1 border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
                placeholder="dubai-deluxe-getaway"
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
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Destination <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              required
              value={formData.destination}
              onChange={(e) => updateForm("destination", e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
            />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Duration <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              required
              value={formData.duration}
              onChange={(e) => updateForm("duration", e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
              placeholder="5 Nights / 6 Days"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Subtitle</span>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => updateForm("subtitle", e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
              placeholder="Skyline views, desert adventures & premium stays"
            />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Price (INR) <span className="text-red-500">*</span>
            </span>
            <input
              type="number"
              min={0}
              value={formData.price}
              onChange={(e) => updateForm("price", Number(e.target.value) || 0)}
              className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Base Price Override
            </span>
            <input
              type="number"
              min={0}
              value={formData.basePriceInInr}
              onChange={(e) =>
                updateForm("basePriceInInr", Number(e.target.value) || 0)
              }
              className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
              placeholder="Defaults to price above"
            />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="inline-flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              checked={formData.allowAdvance}
              onChange={(e) => updateForm("allowAdvance", e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-neutral-700">
              Allow advance payment
            </span>
          </label>
          {formData.allowAdvance && (
            <label className="flex flex-col">
              <span className="text-sm font-medium text-neutral-700">
                Advance percentage
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.advancePercentage ?? ""}
                onChange={(e) =>
                  updateForm(
                    "advancePercentage",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
              />
            </label>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="inline-flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => updateForm("isFeatured", e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-neutral-700">
              Featured package
            </span>
          </label>
          <label className="inline-flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => updateForm("isActive", e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-neutral-700">
              Visible to travellers
            </span>
          </label>
        </div>
      </div>
    );
  }

  function ContentTab() {
    const fields = [
      { key: "overview", label: "Overview", rows: 5 },
      { key: "description", label: "Description", rows: 4 },
      { key: "inclusions", label: "Inclusions (one per line)", rows: 4 },
      { key: "exclusions", label: "Exclusions (one per line)", rows: 4 },
      { key: "importantNotes", label: "Important Notes", rows: 3 },
    ] as const;
    return (
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-sm font-medium text-neutral-700">
              {field.label}
            </label>
            <textarea
              rows={field.rows}
              value={(formData as any)[field.key]}
              onChange={(e) =>
                updateForm(field.key as keyof FormState, e.target.value)
              }
              className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        ))}
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
                  <input
                    type="number"
                    min={1}
                    value={day.dayIndex}
                    onChange={(e) =>
                      updateDay(day.uid, "dayIndex", Number(e.target.value) || 1)
                    }
                    className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col md:col-span-2">
                  <span className="text-xs font-medium text-neutral-600">
                    Title
                  </span>
                  <input
                    type="text"
                    value={day.title}
                    onChange={(e) => updateDay(day.uid, "title", e.target.value)}
                    className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Arrival & Marina Cruise"
                  />
                </label>
              </div>
              <label className="flex flex-col">
                <span className="text-xs font-medium text-neutral-600">
                  Description
                </span>
                <textarea
                  rows={3}
                  value={day.content}
                  onChange={(e) => updateDay(day.uid, "content", e.target.value)}
                  className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
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

  function MediaTab() {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
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
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => updateForm("imageUrl", e.target.value)}
                className="mt-2 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                  src={formData.imageUrl}
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
              <input
                type="url"
                value={formData.heroImageUrl}
                onChange={(e) => updateForm("heroImageUrl", e.target.value)}
                className="mt-2 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                  src={formData.heroImageUrl}
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
          <textarea
            rows={4}
            value={formData.galleryImageUrls}
            onChange={(e) => updateForm("galleryImageUrls", e.target.value)}
            className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
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
                    src={url}
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
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Meta title
            </span>
            <input
              type="text"
              value={formData.metaTitle}
              onChange={(e) => updateForm("metaTitle", e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">
              Meta description
            </span>
            <textarea
              rows={3}
              value={formData.metaDescription}
              onChange={(e) => updateForm("metaDescription", e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500"
            />
          </label>
        </div>
      </div>
    );
  }
}

