"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Mail, Phone, User, Trash2, CheckCircle, AlertCircle,
  Shield, Lock, Globe, Users, FileText, CreditCard, Tag, Info, Calendar,
  MapPin, Briefcase, Upload, X, Eye, FileCheck, Download
} from "lucide-react";
import Link from "next/link";
import { saveDraftToLocalStorage, getDraftFromLocalStorage, clearDraftFromLocalStorage, VisaDraft } from "@/lib/localStorage";
import { loadRazorpayScript } from "@/lib/razorpay-client";
import { useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/dateFormat";
import { UnifiedAuthModal } from "@/components/auth/UnifiedAuthModal";
import { PromoCodeInput } from "@/components/promo-code/PromoCodeInput";
import { CountrySelect } from "@/components/ui/CountrySelect";

type DocScope = "PER_TRAVELLER" | "PER_APPLICATION";

interface VisaRequirement {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  scope: DocScope;
  isRequired: boolean;
  sortOrder: number;
}

interface VisaDetailsResponse {
  id: string;
  slug: string;
  name: string;
  subtitle?: string | null;
  category: string;
  priceInInr: number;
  processingTime: string;
  entryType: string;
  visaMode: string | null;
  overview: string;
  visaSubTypeLabel?: string | null;
  country: {
    id: string;
    code: string;
    name: string;
    flagUrl?: string | null;
  };
  requirements: VisaRequirement[];
  subTypes?: Array<{ id: string; label: string; code?: string | null }> | null;
}

const steps = [
  { id: 1, name: "Select Visa", icon: CheckCircle },
  { id: 2, name: "Primary Contact", icon: User },
  { id: 3, name: "Travellers", icon: User },
  { id: 4, name: "Review", icon: CheckCircle },
  { id: 5, name: "Terms & Conditions", icon: FileCheck },
  { id: 6, name: "Payment", icon: CreditCard },
  { id: 7, name: "Documents", icon: FileText },
];

export default function VisaApplicationPage({ params }: { params: { country: string; type: string } }) {


  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [visaInfo, setVisaInfo] = useState<VisaDetailsResponse | null>(null);
  const [visaLoading, setVisaLoading] = useState(true);
  const [createdTravellerIds, setCreatedTravellerIds] = useState<string[]>([]);
  const [dateErrors, setDateErrors] = useState<Record<string, string>>({});
  const [phoneErrors, setPhoneErrors] = useState<Record<string, string>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [previewModal, setPreviewModal] = useState<{ url: string; fileName: string } | null>(null);
  const [showAccountGate, setShowAccountGate] = useState(false);
  const [guestApplicationId, setGuestApplicationId] = useState<string | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(true); // Start in guest mode
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null); // null = checking, true/false = result
  const [isLoadingGuestData, setIsLoadingGuestData] = useState(true);
  const [appliedPromoCode, setAppliedPromoCode] = useState<{
    id: string;
    code: string;
    discountAmount: number;
    message?: string;
  } | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [stepErrorAction, setStepErrorAction] = useState<{ label: string; href: string } | null>(null);

  const isFreeVisa = visaInfo?.priceInInr === 0;

  type FormDataTraveller = {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    passportNumber: string;
    passportIssueDate: string;
    passportExpiryDate: string;
    nationality: string;
    currentCity?: string;
  };

  type FormData = Omit<Partial<VisaDraft>, 'travellers'> & {
    travellers?: FormDataTraveller[];
  };

  const buildInitialFormData = (): FormData => ({
    country: params?.country || "",
    visaType: params?.type || "",
    visaId: undefined,
    selectedSubTypeId: undefined,
    primaryContact: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
    travellers: [],
    documents: {},
    applicationId: undefined,
    travellerIds: [],
  });

  const [formData, setFormData] = useState<FormData>(buildInitialFormData);

  // Memoize travellerCount to prevent unnecessary recalculations
  const travellerCount = useMemo(() => formData.travellers?.length ?? 0, [formData.travellers?.length]);

  const perTravellerRequirements = useMemo(
    () =>
      (visaInfo?.requirements || []).filter(
        (req) => req.scope === "PER_TRAVELLER"
      ),
    [visaInfo]
  );

  const perApplicationRequirements = useMemo(
    () =>
      (visaInfo?.requirements || []).filter(
        (req) => req.scope === "PER_APPLICATION"
      ),
    [visaInfo]
  );

  const getDocumentKey = (requirementId: string, travellerId?: string) =>
    travellerId
      ? `${requirementId}:traveller-${travellerId}`
      : `${requirementId}:application`;

  const visaName = visaInfo?.name || `${params?.country?.toUpperCase() || "Visa"} Visa`;
  const visaPrice = visaInfo?.priceInInr ?? 0;
  const visaProcessing = (visaInfo?.processingTime && visaInfo.processingTime !== "0")
    ? visaInfo.processingTime
    : "Processing time shared after review";

  const requirementMap = useMemo(() => {
    const map = new Map<string, VisaRequirement>();
    (visaInfo?.requirements || []).forEach((req) => {
      if (req?.id) {
        map.set(req.id, req);
      }
    });
    return map;
  }, [visaInfo]);

  const resetFormToInitialState = () => {
    setFormData(buildInitialFormData());
    setDraftId(null);
    setCreatedTravellerIds([]);
    setDateErrors({});
    setPhoneErrors({});
    // Leave visaInfo as-is so context (price, requirements) stays loaded
  };

  const documentSummary = useMemo(() => {
    if (!formData.documents) return [];
    return Object.entries(formData.documents)
      .map(([key, doc]) => {
        if (!doc) return null;
        const requirement = doc.requirementId
          ? requirementMap.get(doc.requirementId)
          : undefined;
        const travellerId = typeof doc.travellerId === "string" ? doc.travellerId : undefined;
        const travellerData = travellerId
          ? formData.travellers?.find((t) => t.id === travellerId)
          : undefined;
        const travellerIndex = travellerId
          ? formData.travellers?.findIndex((t) => t.id === travellerId) ?? -1
          : -1;
        return {
          key,
          requirement,
          travellerLabel: travellerData
            ? `${travellerData.firstName} ${travellerData.lastName}`.trim()
            : travellerIndex >= 0
              ? `Traveller ${travellerIndex + 1}`
              : null,
          category:
            requirement?.category ||
            (requirement
              ? requirement.scope === "PER_TRAVELLER"
                ? "Per traveller"
                : "Per application"
              : undefined),
          fileName:
            doc.file?.name ||
            (doc as unknown as { name?: string }).name ||
            requirement?.name ||
            "Supporting document",
        };
      })
      .filter(Boolean) as Array<{
        key: string;
        requirement?: VisaRequirement;
        travellerLabel: string | null;
        category?: string;
        fileName: string;
      }>;
  }, [formData.documents, formData.travellers, requirementMap]);

  useEffect(() => {
    let isMounted = true;
    let redirecting = false;

    async function loadVisa() {
      if (!params?.country || !params?.type) {
        setVisaLoading(false);
        return;
      }

      setVisaLoading(true);
      try {
        const response = await fetch(
          `/api/visas/${encodeURIComponent(params.country)}/${encodeURIComponent(params.type)}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Visa not found");
          }
          throw new Error(`Failed to load visa: ${response.statusText}`);
        }

        const data: VisaDetailsResponse = await response.json();

        if (!isMounted) return;

        // Validate data structure
        if (!data || !data.id) {
          throw new Error("Invalid visa data received");
        }

        // Block VOA visas from application flow (VISA_FREE_ENTRY is allowed without payment)
        // EXCEPT when in edit mode
        const isEditMode = searchParams?.get("edit") || searchParams?.get("applicationId");
        if (data.visaMode === "VOA" && !isEditMode) {
          redirecting = true;
          router.replace(`/visas/${params.country}/${params.type}`);
          return;
        }

        setVisaInfo(data);
        setFormData((prev) => ({
          ...prev,
          country: data.country?.code?.toLowerCase() || params.country.toLowerCase(),
          visaType: data.slug || params.type,
          visaId: data.id,
        }));

        // Use templates from visa data if available
        if ((data as any).templates) {
          setTemplates((data as any).templates);
        }
      } catch (error) {
        console.error("Failed to load visa:", error);
        if (isMounted && !redirecting) {
          redirecting = true;
          // Use replace instead of push to avoid breaking back navigation
          router.replace("/visas");
        }
      } finally {
        if (isMounted && !redirecting) {
          setVisaLoading(false);
        }
      }
    }

    loadVisa();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.country, params?.type, router, session?.user?.id]);

  // Check email verification status if logged in
  useEffect(() => {
    if (session?.user?.email) {
      fetch("/api/auth/verify-email")
        .then(res => res.json())
        .then(data => {
          setEmailVerified(data.emailVerified || false);
        })
        .catch(() => {
          setEmailVerified(false);
        });
    } else {
      setEmailVerified(null);
    }
  }, [session?.user?.email]);

  // Load guest application data on mount (if not editing existing application)
  useEffect(() => {
    const editId = searchParams?.get("edit");
    const applicationId = searchParams?.get("applicationId");
    const restored = searchParams?.get("restored");

    // Skip guest loading if editing existing application or if user is logged in (they should have merged data)
    if (editId || applicationId) {
      setIsLoadingGuestData(false);
      return;
    }

    // If user just logged in and restored, skip guest loading as merge should have happened
    if (session?.user && !restored) {
      setIsLoadingGuestData(false);
      return;
    }

    async function loadGuestApplication() {
      try {
        const response = await fetch(`/api/guest-applications?country=${params.country}&visaType=${params.type}`);
        if (response.ok) {
          const guestData = await response.json();
          if (guestData.id) {
            setGuestApplicationId(guestData.id);

            // Restore form data from guest application
            if (guestData.formData) {
              const restoredData = guestData.formData;
              setFormData(prev => ({
                ...prev,
                ...restoredData,
                // Ensure travellers have IDs
                travellers: restoredData.travellers?.map((t: any, idx: number) => ({
                  ...t,
                  id: t.id || `traveller-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
                })) || prev.travellers,
              }));

              // Restore step (but don't go beyond step 2 if not logged in)
              if (guestData.stepCompleted && guestData.stepCompleted > 1) {
                // If logged in, can go to any step; if not, max step 2
                const maxStep = session?.user ? steps.length : 2;
                setCurrentStep(Math.min(guestData.stepCompleted, maxStep));
              }
            }
          }
        } else if (response.status === 404) {
          // No guest application found - that's fine
        }
      } catch (error) {
        console.error("Error loading guest application:", error);
      } finally {
        setIsLoadingGuestData(false);
      }
    }

    loadGuestApplication();
  }, [params.country, params.type, searchParams, session?.user, steps.length]);

  // Load existing application data if editing
  useEffect(() => {
    const editId = searchParams?.get("edit");
    const applicationId = searchParams?.get("applicationId");

    if (editId || applicationId) {
      const appId = editId || applicationId;
      fetch(`/api/applications/${appId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.id) {
            // Load application data into form
            setFormData(prev => ({
              ...prev,
              country: data.country || prev.country,
              visaType: data.visaType || prev.visaType,
              visaId: data.visa?.id || prev.visaId,
              selectedSubTypeId: data.visaSubTypeId || data.visaSubType?.id || prev.selectedSubTypeId,
              primaryContact: {
                name: data.user?.name || prev.primaryContact?.name || "",
                email: data.user?.email || prev.primaryContact?.email || "",
                phone: data.user?.phone || prev.primaryContact?.phone || "",
                address: prev.primaryContact?.address || "",
              },
              applicationId: data.id,
            }));

            setDraftId(data.id);

            // Load travellers if available
            if (data.travellers && data.travellers.length > 0) {
              const travellersWithIds: FormDataTraveller[] = data.travellers.map((t: any, idx: number) => ({
                id: t.traveller?.id || `traveller-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
                firstName: t.traveller?.firstName || "",
                lastName: t.traveller?.lastName || "",
                dateOfBirth: t.traveller?.dateOfBirth ? new Date(t.traveller.dateOfBirth).toISOString().split('T')[0] : "",
                gender: t.traveller?.gender || "",
                passportNumber: t.traveller?.passportNumber || "",
                passportIssueDate: t.traveller?.passportIssueDate ? new Date(t.traveller.passportIssueDate).toISOString().split('T')[0] : "",
                passportExpiryDate: t.traveller?.passportExpiryDate ? new Date(t.traveller.passportExpiryDate).toISOString().split('T')[0] : "",
                nationality: t.traveller?.nationality || "Indian",
                currentCity: t.traveller?.currentCity || "",
              }));

              setFormData(prev => ({
                ...prev,
                travellers: travellersWithIds,
              }));

              setCreatedTravellerIds(travellersWithIds.map(t => t.id));
            }

            // Check if payment was already completed for this application
            if (data.status && ["SUBMITTED", "PROCESSING", "APPROVED", "REJECTED", "COMPLETED"].includes(data.status)) {
              setPaymentCompleted(true);
            }
          }
        })
        .catch(err => {
          console.error("Error loading application:", err);
        });
    }
  }, [searchParams]);

  // Auto-draft loading disabled - drafts should not be loaded automatically
  useEffect(() => {
    const editId = searchParams?.get("edit");
    const applicationId = searchParams?.get("applicationId");

    // Skip localStorage if editing existing application
    if (editId || applicationId) {
      // Continue to auto-fill for logged-in users even when editing
    } else {
      // Auto-draft loading disabled - drafts should not be loaded automatically
      // const draft = getDraftFromLocalStorage();
      // if (draft && (draft.country === params.country && draft.visaType === params.type)) {
      //   // Ensure travellers have IDs when loading from localStorage
      //   const travellersWithIds: FormDataTraveller[] = (draft.travellers || []).map((t, idx) => ({
      //     ...t,
      //     id: (t as any).id || `traveller-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
      //   }));
      //   
      //   const { travellers: _, ...draftWithoutTravellers } = draft;
      //   setFormData((prev) => {
      //     // Only update if we don't already have travellers (to prevent overwriting user input)
      //     if (prev.travellers && prev.travellers.length > 0) {
      //       return prev;
      //     }
      //     return { 
      //       ...prev, 
      //       ...draftWithoutTravellers,
      //       travellers: travellersWithIds.length > 0 ? travellersWithIds : prev.travellers,
      //     };
      //   });
      //   if (draft.applicationId) {
      //     setDraftId(draft.applicationId);
      //   }
      //   if (draft.travellerIds) {
      //     setCreatedTravellerIds(draft.travellerIds);
      //   }
      // } else {
      // Initialize with at least one traveller only if we don't have any
      setFormData((prev) => {
        if (prev.travellers && prev.travellers.length > 0) {
          // Ensure all existing travellers have IDs
          return {
            ...prev,
            travellers: prev.travellers.map((t) => ({
              ...t,
              id: t.id || `traveller-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            })),
          };
        }
        // No travellers, initialize with one
        return {
          ...prev,
          travellers: [
            {
              id: `traveller-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              firstName: "",
              lastName: "",
              dateOfBirth: "",
              gender: "",
              passportNumber: "",
              passportIssueDate: "",
              passportExpiryDate: "",
              nationality: "Indian",
              currentCity: "",
            },
          ],
        };
      });
    }

    // Auto-fill for logged-in users
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        primaryContact: {
          ...prev.primaryContact!,
          name: session.user?.name || prev.primaryContact?.name || "",
          email: session.user?.email || prev.primaryContact?.email || "",
        },
      }));
    }
    // Only run on mount or when params/session change, NOT when travellerCount changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, params.country, params.type]);

  const handleStartFreshApplication = async () => {
    if (
      !confirm(
        "Start a fresh application? This will clear all entered data and reset the form to step 1."
      )
    ) {
      return;
    }

    // If user is logged in and has a visa ID, clear draft data on server
    if (session?.user?.id && visaInfo?.id) {
      try {
        const res = await fetch("/api/applications/start-fresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visaId: visaInfo.id }),
        });
        // Continue even if API call fails (non-blocking)
        if (!res.ok) {
          console.error("Failed to clear draft data on server");
        }
      } catch (error) {
        console.error("Failed to start fresh application", error);
      }
    }

    // Clear guest application data if exists
    if (guestApplicationId) {
      try {
        await fetch(`/api/guest-applications/${guestApplicationId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("Failed to clear guest application", error);
      }
      setGuestApplicationId(null);
    }

    // Clear local storage draft
    clearDraftFromLocalStorage();

    // Reset form to initial state and go to step 1
    resetFormToInitialState();
    setCurrentStep(1);
    setTermsAccepted(false);
    setAppliedPromoCode(null);
  };

  // Helper function to validate dates
  const validateDates = useCallback(() => {
    const errors: Record<string, string> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // Validate travel date
    if (formData.travelDate) {
      const travelDate = new Date(formData.travelDate);
      travelDate.setHours(0, 0, 0, 0);
      if (travelDate <= today) {
        errors.travelDate = "Travel date must be after today";
      }
    }

    // Validate traveller dates
    (formData.travellers || []).forEach((traveller, index) => {
      const prefix = `traveller-${index}`;

      // Date of Birth - must be in the past, not future
      if (traveller.dateOfBirth) {
        const dob = new Date(traveller.dateOfBirth);
        dob.setHours(0, 0, 0, 0);
        if (dob >= today) {
          errors[`${prefix}-dateOfBirth`] = "Date of birth cannot be today or in the future";
        }
        // Check if person is at least 1 year old (reasonable minimum)
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (dob > oneYearAgo) {
          errors[`${prefix}-dateOfBirth`] = "Date of birth must be at least 1 year ago";
        }
      }

      // Passport Issue Date - must be in the past, before expiry
      if (traveller.passportIssueDate) {
        const issueDate = new Date(traveller.passportIssueDate);
        issueDate.setHours(0, 0, 0, 0);
        if (issueDate >= today) {
          errors[`${prefix}-passportIssueDate`] = "Passport issue date cannot be today or in the future";
        }
        // Must be before expiry date
        if (traveller.passportExpiryDate) {
          const expiryDate = new Date(traveller.passportExpiryDate);
          expiryDate.setHours(0, 0, 0, 0);
          if (issueDate >= expiryDate) {
            errors[`${prefix}-passportIssueDate`] = "Passport issue date must be before expiry date";
          }
        }
      }

      // Passport Expiry Date - must be in the future
      if (traveller.passportExpiryDate) {
        const expiryDate = new Date(traveller.passportExpiryDate);
        expiryDate.setHours(0, 0, 0, 0);
        if (expiryDate <= today) {
          errors[`${prefix}-passportExpiryDate`] = "Passport expiry date must be in the future";
        }
        // Must be after issue date
        if (traveller.passportIssueDate) {
          const issueDate = new Date(traveller.passportIssueDate);
          issueDate.setHours(0, 0, 0, 0);
          if (expiryDate <= issueDate) {
            errors[`${prefix}-passportExpiryDate`] = "Passport expiry date must be after issue date";
          }
        }
        // Optional: Check if passport is valid for at least 6 months from travel date
        if (formData.travelDate) {
          const travelDate = new Date(formData.travelDate);
          travelDate.setHours(0, 0, 0, 0);
          const sixMonthsFromTravel = new Date(travelDate);
          sixMonthsFromTravel.setMonth(sixMonthsFromTravel.getMonth() + 6);
          if (expiryDate < sixMonthsFromTravel) {
            errors[`${prefix}-passportExpiryDate`] = "Passport must be valid for at least 6 months from travel date";
          }
        }
      }
    });

    setDateErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.travelDate, formData.travellers]);

  // Helper function to update a traveller field
  const updateTravellerField = useCallback((travellerId: string, field: keyof FormDataTraveller, value: string) => {
    setFormData((prev) => {
      const travellers = (prev.travellers || []).map((t) =>
        t.id === travellerId ? { ...t, [field]: value } : t
      );

      // Clear error for this field when user updates it
      const travellerIndex = travellers.findIndex(t => t.id === travellerId);
      if (travellerIndex >= 0) {
        const prefix = `traveller-${travellerIndex}`;
        const errorKey = `${prefix}-${field}`;
        setDateErrors(prevErrors => {
          const newErrors = { ...prevErrors };
          delete newErrors[errorKey];
          return newErrors;
        });
      }

      return {
        ...prev,
        travellers,
      };
    });
  }, []);

  // Helper function to remove a traveller
  const removeTraveller = useCallback((travellerId: string) => {
    setFormData((prev) => {
      const newTravellers = (prev.travellers || []).filter((t) => t.id !== travellerId);
      // Clean up documents associated with this traveller
      const newDocuments = { ...(prev.documents || {}) };
      Object.keys(newDocuments).forEach((key) => {
        const doc = newDocuments[key];
        if (doc && (doc as any).travellerId === travellerId) {
          delete newDocuments[key];
        }
      });
      return { ...prev, travellers: newTravellers, documents: newDocuments };
    });
  }, []);

  // Helper function to add a traveller
  const addTraveller = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      travellers: [
        ...(prev.travellers || []),
        {
          id: `traveller-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          gender: "",
          passportNumber: "",
          passportIssueDate: "",
          passportExpiryDate: "",
          nationality: "Indian",
          currentCity: "",
        },
      ],
    }));
  }, []);

  // Helper function to save guest application
  const saveGuestApplication = useCallback(async (step: number) => {
    if (!visaInfo || session?.user) return; // Skip if logged in (use regular draft save)

    try {
      // Extract pre-application data (step 1 data)
      const nationality = formData.travellers?.[0]?.nationality || formData.primaryContact?.email || undefined;
      const purposeOfTravel = formData.tripType || undefined;

      const guestData = {
        country: formData.country || params.country,
        visaType: formData.visaType || params.type,
        visaId: formData.visaId || visaInfo.id,
        selectedSubTypeId: formData.selectedSubTypeId,
        travelDate: formData.travelDate,
        tripType: formData.tripType,
        nationality,
        purposeOfTravel,
        stepCompleted: step,
        formData: {
          country: formData.country,
          visaType: formData.visaType,
          visaId: formData.visaId,
          selectedSubTypeId: formData.selectedSubTypeId,
          travelDate: formData.travelDate,
          tripType: formData.tripType,
          primaryContact: formData.primaryContact,
          travellers: formData.travellers?.map(({ id, ...rest }) => rest), // Remove client-side IDs
        },
      };

      const response = await fetch("/api/guest-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guestData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.guestApplicationId) {
          setGuestApplicationId(result.guestApplicationId);
        }
      }
    } catch (error) {
      console.error("Error saving guest application:", error);
      // Silently fail - don't interrupt user experience
    }
  }, [formData, visaInfo, params.country, params.type, session?.user]);

  // Auto-save draft to database when form data changes (debounced)
  useEffect(() => {
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Save guest application if not logged in
    if (!session?.user && currentStep >= 1 && visaInfo) {
      const timeoutId = setTimeout(() => {
        saveGuestApplication(currentStep);
      }, 2000); // Debounce by 2 seconds
      setAutoSaveTimeout(timeoutId);
      return () => clearTimeout(timeoutId);
    }

    // Save regular draft if logged in and have email
    if (session?.user && currentStep > 1 && formData.primaryContact?.email) {
      const timeoutId = setTimeout(async () => {
        try {
          const draftData = {
            country: formData.country,
            visaType: formData.visaType,
            visaId: formData.visaId,
            travelDate: formData.travelDate,
            tripType: formData.tripType,
            primaryContact: formData.primaryContact,
            travellers: formData.travellers?.map(t => ({
              firstName: t.firstName,
              lastName: t.lastName,
              dateOfBirth: t.dateOfBirth,
              gender: t.gender,
              passportNumber: t.passportNumber,
              passportIssueDate: t.passportIssueDate,
              passportExpiryDate: t.passportExpiryDate,
              nationality: t.nationality,
              currentCity: t.currentCity,
            })),
            draftId: draftId || undefined,
          };

          const response = await fetch("/api/applications/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draftData),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.draftId && !draftId) {
              setDraftId(result.draftId);
            }
          }
        } catch (error) {
          console.error("Error saving draft:", error);
          // Silently fail - don't interrupt user experience
        }
      }, 2000); // Debounce by 2 seconds to avoid too many API calls
      setAutoSaveTimeout(timeoutId);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, currentStep, draftId, session?.user, visaInfo, saveGuestApplication, autoSaveTimeout]);

  // Phone number validation helper
  const validatePhoneNumber = (phone: string): string | null => {
    if (!phone || phone.trim() === "") {
      return null; // Phone is optional, so empty is valid
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, "");

    // Check if it's a valid Indian mobile number (10 digits)
    if (digitsOnly.length === 10) {
      // Check if it starts with 6-9 (valid Indian mobile prefixes)
      if (/^[6-9]/.test(digitsOnly)) {
        return null; // Valid
      }
      return "Phone number must start with 6, 7, 8, or 9";
    }

    // Check if it's E.164 format (international)
    if (phone.startsWith("+")) {
      const e164Pattern = /^\+[1-9]\d{1,14}$/;
      if (e164Pattern.test(phone)) {
        return null; // Valid E.164 format
      }
      return "Invalid international phone format. Use E.164 format (e.g., +911234567890)";
    }

    // If it has digits but wrong length
    if (digitsOnly.length > 0 && digitsOnly.length < 10) {
      return "Phone number must be 10 digits";
    }

    if (digitsOnly.length > 10 && !phone.startsWith("+")) {
      return "Phone number must be 10 digits or use international format (+country code)";
    }

    return "Invalid phone number format";
  };

  // Sanitize phone input - only allow digits, +, spaces, and hyphens
  const sanitizePhoneInput = (value: string): string => {
    // Allow digits, +, spaces, and hyphens
    return value.replace(/[^\d+\s-]/g, "");
  };

  const nextStep = () => {
    // Clear any previous step error when the user tries to advance
    setStepError(null);
    setStepErrorAction(null);

    // Validation before proceeding
    if (currentStep === 1) {
      // Validate subtype selection if subtypes exist
      if (visaInfo?.subTypes && visaInfo.subTypes.length > 0 && !formData.selectedSubTypeId) {
        setStepError("Please select a visa subtype to continue.");
        return;
      }
    }

    if (currentStep === 2) {
      if (!formData.primaryContact?.name || !formData.primaryContact?.email) {
        alert("Please fill in all required contact information");
        return;
      }

      // Validate phone number if provided
      if (formData.primaryContact?.phone) {
        const phoneError = validatePhoneNumber(formData.primaryContact.phone);
        if (phoneError) {
          setPhoneErrors({ primaryContact: phoneError });
          return;
        }
        // Clear error if valid
        setPhoneErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.primaryContact;
          return newErrors;
        });
      }

      // Account Gate: Require login when moving to step 3 (Travellers - personal data)
      if (!session) {
        setShowAccountGate(true);
        return;
      }

      // Check email verification (hard block - cannot proceed without verification)
      if (emailVerified === false) {
        const verifyUrl = `/verify-email?email=${encodeURIComponent(session.user?.email || "")}&redirect=${encodeURIComponent(`/apply/visa/${params.country}/${params.type}?restored=true`)}`;
        setStepError("Your email is not verified. Please verify your email to continue with the application.");
        setStepErrorAction({ label: "Verify Email Now", href: verifyUrl });
        return;
      }

      // If email verification status is unknown, check it
      if (emailVerified === null && session?.user?.email) {
        setLoading(true);
        fetch("/api/auth/verify-email")
          .then(res => res.json())
          .then(data => {
            setLoading(false);
            if (!data.emailVerified) {
              setEmailVerified(false);
              const verifyUrl = `/verify-email?email=${encodeURIComponent(session.user?.email || "")}&redirect=${encodeURIComponent(`/apply/visa/${params.country}/${params.type}?restored=true`)}`;
              setStepError("Please verify your email before proceeding with the application.");
              setStepErrorAction({ label: "Verify Email Now", href: verifyUrl });
            } else {
              setEmailVerified(true);
              setCurrentStep(3);
            }
          })
          .catch(() => {
            setLoading(false);
            setStepError("Unable to check email verification status. Please try again.");
            setStepErrorAction(null);
          });
        return;
      }
    }

    if (currentStep === 3) {
      if (!formData.travellers || formData.travellers.length === 0) {
        setStepError("Please add at least one traveller to continue.");
        setStepErrorAction(null);
        return;
      }
      // Validate all travellers have required fields
      for (const traveller of formData.travellers) {
        if (!traveller.firstName || !traveller.lastName || !traveller.dateOfBirth ||
          !traveller.gender || !traveller.passportNumber || !traveller.passportIssueDate ||
          !traveller.passportExpiryDate || !traveller.nationality) {
          setStepError("Please fill in all required fields for every traveller before continuing.");
          setStepErrorAction(null);
          return;
        }

        // Validate all dates before proceeding
        if (!validateDates()) {
          setStepError("Please fix the date errors highlighted above before continuing.");
          setStepErrorAction(null);
          return;
        }
      }
    }

    // Document validation removed from step 4 (Review) - documents are now step 7 (after payment)

    if (currentStep < steps.length) {
      const nextStepNum = currentStep + 1;
      setCurrentStep(nextStepNum);

      // Save guest application when moving to next step
      if (!session?.user && visaInfo) {
        saveGuestApplication(nextStepNum);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDocumentUpload = (
    requirement: VisaRequirement,
    travellerId: string | undefined,
    file: File
  ) => {
    if (file.size > 20 * 1024 * 1024) {
      alert("File size must be less than 20MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG, and PDF files are allowed");
      return;
    }

    const reader = new FileReader();
    const key = getDocumentKey(requirement.id, travellerId);
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          [key]: {
            file,
            preview: reader.result as string,
            requirementId: requirement.id,
            travellerId,
          },
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (key: string) => {
    setFormData((prev) => {
      const newDocs = { ...(prev.documents || {}) };
      delete newDocs[key];
      return { ...prev, documents: newDocs };
    });
  };

  const handleConfirmAndPay = async () => {
    // Validate required fields
    if (!formData.primaryContact?.name || !formData.primaryContact?.email) {
      alert("Please fill in all required fields");
      return;
    }

    if (!formData.travellers || formData.travellers.length === 0) {
      alert("Please add at least one traveller");
      return;
    }

    // Validate all dates before proceeding
    if (!validateDates()) {
      alert("Please fix the date errors before proceeding to payment");
      // Go back to step 3 (travellers) to show date errors
      setCurrentStep(3);
      return;
    }

    // Validate phone number before submission
    if (formData.primaryContact?.phone) {
      const phoneError = validatePhoneNumber(formData.primaryContact.phone);
      if (phoneError) {
        setPhoneErrors({ primaryContact: phoneError });
        setCurrentStep(2); // Go back to contact step to show error
        alert(`Phone number validation failed: ${phoneError}`);
        return;
      }
    }

    // Check if user is logged in (required for step 4+)
    if (!session) {
      // Show account gate if not logged in
      setShowAccountGate(true);
      return;
    }

    const travellersLength =
      formData.travellers && formData.travellers.length > 0
        ? formData.travellers.length
        : 1;
    const totalAmount = (visaInfo?.priceInInr ?? 0) * travellersLength;

    setLoading(true);
    try {
      // Save application to server
      const response = await fetch("/api/applications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: formData.country,
          visaType: formData.visaType,
          visaId: visaInfo?.id,
          totalAmount,
          travelDate: formData.travelDate,
          tripType: formData.tripType,
          selectedSubTypeId: formData.selectedSubTypeId,
          primaryContact: formData.primaryContact,
          travellers: formData.travellers?.map(({ id, ...rest }) => rest) || [],
          promoCodeId: appliedPromoCode?.id,
          discountAmount: appliedPromoCode?.discountAmount || 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDraftId(data.applicationId);
        let travellerMap: string[] = [];
        if (Array.isArray(data.travellers)) {
          const sorted = [...data.travellers].sort(
            (a, b) => a.inputIndex - b.inputIndex
          );
          travellerMap = sorted.map((entry) => entry.travellerId);
          setCreatedTravellerIds(travellerMap);
        }
        setFormData((prev) => ({
          ...prev,
          applicationId: data.applicationId,
          travellerIds: travellerMap,
        }));

        // Upload documents
        if (formData.documents) {
          await uploadDocuments(data.applicationId, travellerMap);
        }

        // Clear draft - auto-draft saving is disabled
        clearDraftFromLocalStorage();
        // Auto-draft saving disabled - drafts should not be saved automatically
        // saveDraftToLocalStorage({
        //   country: formData.country,
        //   visaType: formData.visaType,
        //   visaId: formData.visaId || visaInfo?.id,
        //   applicationId: data.applicationId,
        //   travellerIds: travellerMap,
        //   documents: {},
        // });

        setCurrentStep(5);
      } else {
        const errorData = await response.json();
        let errorMessage = errorData.error || "Failed to save application. Please try again.";

        // Handle email verification error
        if (response.status === 403 && errorData.error === "Email verification required") {
          const shouldVerify = confirm(
            errorData.message || "Please verify your email before submitting the application.\n\nWould you like to verify your email now?"
          );
          if (shouldVerify && session?.user?.email) {
            router.push(`/verify-email?email=${encodeURIComponent(session.user.email)}&redirect=${encodeURIComponent(`/apply/visa/${params.country}/${params.type}`)}`);
          }
          setLoading(false);
          return;
        }

        // Handle validation errors with field-specific messages
        if (errorData.details && Array.isArray(errorData.details)) {
          const phoneError = errorData.details.find((d: any) => d.field === "primaryContact.phone");
          if (phoneError) {
            setPhoneErrors({ primaryContact: phoneError.message });
            setCurrentStep(2); // Go back to contact step
            errorMessage = phoneError.message;
          } else {
            // Show all validation errors
            const detailMessages = errorData.details.map((d: any) => d.message).join("\n");
            errorMessage = detailMessages || errorMessage;
          }
        }

        alert(errorMessage);
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const uploadDocuments = async (
    applicationId: string,
    travellerIdMap?: string[]
  ) => {
    if (!formData.documents) return;
    const failedDocs: string[] = [];

    const resolvedMap =
      travellerIdMap && travellerIdMap.length
        ? travellerIdMap
        : createdTravellerIds.length
          ? createdTravellerIds
          : formData.travellerIds || [];

    for (const doc of Object.values(formData.documents)) {
      if (!doc?.file || !doc.requirementId) continue;

      const uploadFormData = new FormData();
      uploadFormData.append("file", doc.file);
      uploadFormData.append("requirementId", doc.requirementId);

      const docTravellerId = (doc as any).travellerId;
      if (typeof docTravellerId === "string") {
        // Find the index of this traveller in the form data
        const travellerIndex = formData.travellers?.findIndex((t) => t.id === docTravellerId) ?? -1;
        if (travellerIndex >= 0 && travellerIndex < resolvedMap.length) {
          const travellerId = resolvedMap[travellerIndex];
          if (travellerId) {
            uploadFormData.append("travellerId", travellerId);
          } else {
            console.warn(
              "Skipping document upload: traveller mapping missing",
              travellerIndex
            );
            continue;
          }
        } else {
          console.warn(
            "Skipping document upload: traveller not found in form data",
            docTravellerId
          );
          continue;
        }
      } else if (typeof (doc as any).travellerIndex === "number") {
        // Legacy support: handle old documents that use travellerIndex
        const travellerIndex = (doc as any).travellerIndex;
        const travellerId = resolvedMap[travellerIndex];
        if (!travellerId) {
          console.warn(
            "Skipping document upload: traveller mapping missing",
            travellerIndex
          );
          continue;
        }
        uploadFormData.append("travellerId", travellerId);
      }

      uploadFormData.append("documentType", doc.requirementId);

      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(`/api/applications/${applicationId}/documents`, {
          method: "POST",
          body: uploadFormData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error("Error uploading document:", errorData.error || "Upload failed");
          failedDocs.push(doc.requirementId);
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.error("Document upload timed out:", doc.requirementId);
          failedDocs.push(doc.requirementId);
        } else {
          console.error("Error uploading document:", error);
          failedDocs.push(doc.requirementId);
        }
      }
    }
    if (failedDocs.length > 0) {
      setStepError(
        `${failedDocs.length} document${failedDocs.length > 1 ? "s" : ""} failed to upload. Please reupload them before finishing your application.`
      );
      setStepErrorAction(null);
    }
  };

  const handleVisaPayment = async () => {
    if (!draftId) {
      setStepError("Application reference not found. Please restart the payment step.");
      setStepErrorAction(null);
      return;
    }

    if (!session?.user?.email) {
      setStepError("Please log in to continue with payment.");
      setStepErrorAction(null);
      return;
    }

    const travellerCount =
      formData.travellers && formData.travellers.length > 0
        ? formData.travellers.length
        : 1;
    const baseTotalAmount = (visaInfo?.priceInInr ?? 0) * travellerCount;
    const discountAmountInPaise = appliedPromoCode?.discountAmount || 0;
    const discountAmountInRupees = discountAmountInPaise / 100;
    const totalAmount = Math.max(0, baseTotalAmount - discountAmountInRupees);

    // Check if this is E_VISA mode - skip payment gateway entirely
    const isEVisaMode = visaInfo?.visaMode === "E_VISA";
    const isVisaFreeEntry = visaInfo?.visaMode === "VISA_FREE_ENTRY";
    const shouldSkipPayment = isEVisaMode || isVisaFreeEntry || totalAmount <= 0;

    setLoading(true);
    try {
      // For E_VISA and VISA_FREE_ENTRY, create a free payment record and skip gateway
      if (shouldSkipPayment) {
        const response = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 0, // Force 0 amount for E_VISA and VISA_FREE_ENTRY
            applicationId: draftId,
            promoCodeId: appliedPromoCode?.id,
            discountAmount: discountAmountInPaise > 0 ? discountAmountInPaise : undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          // Handle already paid case - redirect to thank you page
          if (error.alreadyPaid && error.redirectUrl) {
            setLoading(false);
            setPaymentCompleted(true);
            router.push(error.redirectUrl);
            return;
          }
          throw new Error(error.error || "Unable to process application.");
        }

        const responseData = await response.json();

        // Move to documents step
        setLoading(false);
        setPaymentCompleted(true);
        setCurrentStep(7);
        return;
      }

      // Normal payment flow for other visa modes
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount, // Send amount in rupees (backend will convert to paise)
          applicationId: draftId,
          promoCodeId: appliedPromoCode?.id,
          discountAmount: discountAmountInPaise > 0 ? discountAmountInPaise : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Handle already paid case - redirect to thank you page
        if (error.alreadyPaid && error.redirectUrl) {
          setLoading(false);
          setPaymentCompleted(true);
          router.push(error.redirectUrl);
          return;
        }
        throw new Error(error.error || "Unable to initiate payment.");
      }

      const responseData = await response.json();

      // Handle free applications (amount <= 0)
      if (responseData.isFree || totalAmount <= 0) {
        setLoading(false);
        // Move to documents step instead of thank you page
        setPaymentCompleted(true);
        setCurrentStep(7);
        return;
      }

      // Normal payment flow - proceed with Razorpay
      const { orderId, keyId, amount, currency } = responseData;
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay SDK.");
      }

      const options = {
        key: keyId,
        amount,
        currency,
        name: "Travunited",
        description: `${visaInfo?.name || "Visa"} - Visa Application`,
        order_id: orderId,
        prefill: {
          name: formData.primaryContact?.name || session.user?.name || "",
          email: (formData.primaryContact?.email && !formData.primaryContact.email.includes("@user.travunited"))
            ? formData.primaryContact.email
            : (session.user?.email && !session.user.email.includes("@user.travunited"))
              ? session.user.email
              : formData.primaryContact?.email || "",
          contact: formData.primaryContact?.phone || "",
        },
        notes: {
          applicationId: draftId,
        },
        handler: async (response: any) => {
          try {
            console.log("Payment response:", response);

            // Verify payment on server
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                applicationId: draftId,
              }),
            });

            if (verifyResponse.ok) {
              // Redirect to Step 7 (Documents)
              setCurrentStep(7);
              setLoading(false);
            } else {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || "Payment verification failed");
            }
          } catch (error: any) {
            console.error("Payment verification error:", error);
            setLoading(false);
            alert(`Payment verification failed: ${error.message || "Please contact support"}`);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (response: any) => {
        console.error("Payment failed:", response);
        setLoading(false);
        const errorMessage = response.error?.description || response.error?.reason || "Payment failed. Please try again.";
        alert(errorMessage);
      });

      razorpay.open();
    } catch (error) {
      console.error(error);
      setLoading(false);
      alert("Unable to process payment. Please try again.");
    }
  };

  const handleFinishApplication = async () => {
    // Validate that required documents are uploaded
    const missingDocs: string[] = [];

    // Check application level requirements
    perApplicationRequirements.forEach((req) => {
      if (req.isRequired) {
        const key = getDocumentKey(req.id);
        if (!formData.documents?.[key]) {
          missingDocs.push(`${req.name} (Application)`);
        }
      }
    });

    // Check traveller level requirements
    if (formData.travellers) {
      formData.travellers.forEach((traveller) => {
        perTravellerRequirements.forEach((req) => {
          if (req.isRequired) {
            const key = getDocumentKey(req.id, traveller.id);
            if (!formData.documents?.[key]) {
              missingDocs.push(`${req.name} for ${traveller.firstName} ${traveller.lastName}`);
            }
          }
        });
      });
    }

    if (missingDocs.length > 0) {
      alert(`Please upload the following required documents:\n\n${missingDocs.slice(0, 5).join("\n")}${missingDocs.length > 5 ? "\n...and more" : ""}`);
      return;
    }

    // Get application ID from formData or draftId
    const applicationId = formData.applicationId || draftId;
    if (!applicationId) {
      alert("Application ID not found. Please restart the application process.");
      return;
    }

    setLoading(true);
    try {
      console.log("Finishing application...", { applicationId, documentCount: Object.keys(formData.documents || {}).length });

      // Upload documents if any exist (with timeout to prevent hanging)
      if (formData.documents && Object.keys(formData.documents).length > 0) {
        try {
          console.log("Uploading documents...");
          // Add timeout wrapper to prevent hanging
          const uploadPromise = uploadDocuments(applicationId, formData.travellerIds || createdTravellerIds);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Document upload timeout")), 60000) // 60 second max
          );

          await Promise.race([uploadPromise, timeoutPromise]);
          console.log("Documents uploaded successfully");
        } catch (uploadError) {
          console.error("Error uploading documents:", uploadError);
          // Continue even if document upload fails - don't block completion
          // Don't show alert as it might block the redirect
          console.warn("Some documents may not have been uploaded, but continuing with completion");
        }
      } else {
        console.log("No documents to upload");
      }

      // Submit application to change status from DOCUMENTS_PENDING to SUBMITTED
      try {
        console.log("Submitting application...");
        const submitResponse = await fetch(`/api/applications/${applicationId}/submit`, {
          method: "POST",
        });

        if (submitResponse.ok) {
          console.log("Application submitted successfully");
        } else {
          const errorData = await submitResponse.json().catch(() => ({ error: "Unknown error" }));
          console.warn("Failed to submit application:", errorData.error);
          // Continue anyway - the application exists and documents are uploaded
        }
      } catch (submitError) {
        console.error("Error submitting application:", submitError);
        // Continue anyway - don't block redirect
      }

      // Clear draft locally
      clearDraftFromLocalStorage();
      console.log("Draft cleared from localStorage");

      // Redirect to thank you page with fallback
      const redirectUrl = `/applications/thank-you?applicationId=${applicationId}`;
      console.log("Redirecting to:", redirectUrl);

      // Always redirect, even if submit failed
      setLoading(false); // Clear loading state before redirect

      try {
        router.push(redirectUrl);
        // Fallback: if router.push doesn't work, use window.location after a short delay
        setTimeout(() => {
          if (window.location.pathname !== redirectUrl.split('?')[0]) {
            console.log("Router push may have failed, using window.location fallback");
            window.location.href = redirectUrl;
          }
        }, 500);
      } catch (redirectError) {
        console.error("Router redirect failed, using window.location:", redirectError);
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error("Error finishing application:", error);
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : "An error occurred while completing your application.";
      alert(errorMessage);

      // Even on error, try to redirect to thank you page if we have an applicationId
      if (applicationId) {
        const redirectUrl = `/applications/thank-you?applicationId=${applicationId}`;
        console.log("Attempting redirect despite error:", redirectUrl);
        try {
          router.push(redirectUrl);
        } catch {
          window.location.href = redirectUrl;
        }
      }
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Visa Selection</h2>
            <div className="bg-neutral-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-2">{visaName}</h3>
              <p className="text-neutral-600 mb-2">
                Country: {visaInfo?.country.code || params.country.toUpperCase()}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Processing Time</p>
                  <p className="font-medium text-sm sm:text-base">{visaLoading ? "Fetching..." : visaProcessing}</p>
                </div>


                <div>
                  <p className="text-xs text-neutral-500 mb-1">Entry Type</p>
                  <p className="font-medium text-sm sm:text-base">
                    {visaLoading ? "..." : (visaInfo?.entryType && visaInfo.entryType !== "0" ? visaInfo.entryType : "—")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                <div className="text-2xl font-bold text-primary-600">
                  {visaLoading ? "—" : `₹${visaPrice.toLocaleString()}`}
                </div>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded whitespace-nowrap">
                  Taxes & charges included
                </span>
              </div>
            </div>
            <div className="space-y-4">
              {visaInfo?.subTypes && visaInfo.subTypes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Visa Subtype {visaInfo.visaSubTypeLabel ? `(${visaInfo.visaSubTypeLabel})` : ""} *
                  </label>
                  <select
                    value={formData.selectedSubTypeId || ""}
                    onChange={(e) => setFormData({ ...formData, selectedSubTypeId: e.target.value || undefined })}
                    required
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a subtype</option>
                    {visaInfo.subTypes.map((subtype) => (
                      <option key={subtype.id} value={subtype.id}>
                        {subtype.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 mt-1">
                    Please select the visa subtype that best matches your travel requirements.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Travel Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.travelDate || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, travelDate: e.target.value });
                    // Clear error when user updates
                    setDateErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.travelDate;
                      return newErrors;
                    });
                  }}
                  min={(() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return tomorrow.toISOString().split("T")[0];
                  })()}

                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${dateErrors.travelDate ? "border-red-500" : "border-neutral-300"
                    }`}
                />
                {dateErrors.travelDate && (
                  <p className="text-sm text-red-600 mt-1">{dateErrors.travelDate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Trip Type (Optional)
                </label>
                <select
                  value={formData.tripType || ""}
                  onChange={(e) => setFormData({ ...formData, tripType: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select trip type</option>
                  <option value="tourism">Tourism</option>
                  <option value="business">Business</option>
                  <option value="family">Family Visit</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Primary Contact Information</h2>
            <p className="text-neutral-600 mb-6">
              This person will be the main contact for this visa application.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.primaryContact?.name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryContact: { ...formData.primaryContact!, name: e.target.value },
                    })
                  }
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.primaryContact?.email || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryContact: { ...formData.primaryContact!, email: e.target.value },
                    })
                  }
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="john@example.com"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  This email may be used to create your account
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9\\+\\s-]*"
                  maxLength={15}
                  value={formData.primaryContact?.phone || ""}
                  onChange={(e) => {
                    const sanitized = sanitizePhoneInput(e.target.value);
                    setFormData({
                      ...formData,
                      primaryContact: { ...formData.primaryContact!, phone: sanitized },
                    });
                    // Clear error when user starts typing
                    if (phoneErrors.primaryContact) {
                      setPhoneErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.primaryContact;
                        return newErrors;
                      });
                    }
                  }}
                  onBlur={(e) => {
                    // Validate on blur
                    if (e.target.value) {
                      const error = validatePhoneNumber(e.target.value);
                      if (error) {
                        setPhoneErrors((prev) => ({ ...prev, primaryContact: error }));
                      } else {
                        setPhoneErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.primaryContact;
                          return newErrors;
                        });
                      }
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${phoneErrors.primaryContact
                    ? "border-red-500 focus:border-red-500"
                    : "border-neutral-300"
                    }`}
                  placeholder="10 digits (e.g., 9876543210) or +91 9876543210"
                />
                {phoneErrors.primaryContact && (
                  <p className="text-sm text-red-600 mt-1">{phoneErrors.primaryContact}</p>
                )}
                {!phoneErrors.primaryContact && formData.primaryContact?.phone && (
                  <p className="text-xs text-neutral-500 mt-1">
                    {formData.primaryContact.phone.replace(/\D/g, "").length === 10
                      ? "✓ Valid phone number"
                      : "Enter 10 digits for Indian mobile or use international format"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Address (Optional)
                </label>
                <textarea
                  value={formData.primaryContact?.address || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryContact: { ...formData.primaryContact!, address: e.target.value },
                    })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Your address"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Traveller Information</h2>
            <p className="text-neutral-600 mb-6">
              Add details for all travellers in this application. Information must match passport exactly.
            </p>
            <div className="space-y-6">
              {(formData.travellers || []).map((traveller, index) => (
                <div key={traveller.id} className="border border-neutral-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Traveller {index + 1}</h3>
                    {(formData.travellers || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTraveller(traveller.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        First Name (as per passport) *
                      </label>
                      <input
                        type="text"
                        required
                        value={traveller.firstName}
                        onChange={(e) => updateTravellerField(traveller.id, "firstName", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Last Name (as per passport) *
                      </label>
                      <input
                        type="text"
                        required
                        value={traveller.lastName}
                        onChange={(e) => updateTravellerField(traveller.id, "lastName", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        required
                        value={traveller.dateOfBirth}
                        onChange={(e) => updateTravellerField(traveller.id, "dateOfBirth", e.target.value)}
                        max={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]} // At least 1 year ago
                        className={`w-full px-4 py-2 border rounded-lg ${dateErrors[`traveller-${index}-dateOfBirth`] ? "border-red-500" : "border-neutral-300"
                          }`}
                      />
                      {dateErrors[`traveller-${index}-dateOfBirth`] && (
                        <p className="text-sm text-red-600 mt-1">{dateErrors[`traveller-${index}-dateOfBirth`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Gender *
                      </label>
                      <select
                        required
                        value={traveller.gender}
                        onChange={(e) => updateTravellerField(traveller.id, "gender", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Passport Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={traveller.passportNumber}
                        onChange={(e) => updateTravellerField(traveller.id, "passportNumber", e.target.value.toUpperCase())}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg uppercase"
                        maxLength={20}
                        placeholder="Enter passport number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Nationality *
                      </label>
                      <CountrySelect
                        value={traveller.nationality || ""}
                        onChange={(value) => updateTravellerField(traveller.id, "nationality", value)}
                        placeholder="Select nationality"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Passport Issue Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={traveller.passportIssueDate}
                        onChange={(e) => updateTravellerField(traveller.id, "passportIssueDate", e.target.value)}
                        max={new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]} // Yesterday (must be in past)
                        className={`w-full px-4 py-2 border rounded-lg ${dateErrors[`traveller-${index}-passportIssueDate`] ? "border-red-500" : "border-neutral-300"
                          }`}
                      />
                      {dateErrors[`traveller-${index}-passportIssueDate`] && (
                        <p className="text-sm text-red-600 mt-1">{dateErrors[`traveller-${index}-passportIssueDate`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Passport Expiry Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={traveller.passportExpiryDate}
                        onChange={(e) => updateTravellerField(traveller.id, "passportExpiryDate", e.target.value)}
                        min={traveller.passportIssueDate ? new Date(new Date(traveller.passportIssueDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]} // Must be after issue date, or today if no issue date
                        className={`w-full px-4 py-2 border rounded-lg ${dateErrors[`traveller-${index}-passportExpiryDate`] ? "border-red-500" : "border-neutral-300"
                          }`}
                      />
                      {dateErrors[`traveller-${index}-passportExpiryDate`] && (
                        <p className="text-sm text-red-600 mt-1">{dateErrors[`traveller-${index}-passportExpiryDate`]}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Current City (Optional)
                      </label>
                      <input
                        type="text"
                        value={traveller.currentCity || ""}
                        onChange={(e) => updateTravellerField(traveller.id, "currentCity", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                        placeholder="Mumbai"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addTraveller}
                className="w-full border-2 border-dashed border-neutral-300 rounded-lg py-4 text-neutral-600 hover:border-primary-600 hover:text-primary-600 transition-colors"
              >
                + Add Another Traveller
              </button>
            </div>
          </div>
        );

      case 4:
        const baseTotalAmount =
          visaPrice * ((formData.travellers || []).length || 1);
        const discountAmount = appliedPromoCode ? appliedPromoCode.discountAmount / 100 : 0; // Convert from paise to rupees
        const totalAmount = Math.max(0, baseTotalAmount - discountAmount);
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Review & Confirm</h2>
                <p className="text-neutral-500 mt-1">Please review all information carefully before proceeding to payment.</p>
              </div>
              <div className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium border border-primary-100 flex items-center gap-1.5">
                <Info size={14} />
                Step 5 of 7
              </div>
            </div>

            <div className="grid gap-6">
              {/* Visa Details Card */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden group hover:border-primary-300 transition-colors">
                <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                      <Globe size={18} />
                    </div>
                    <h3 className="font-semibold text-neutral-900">Visa Requirements</h3>
                  </div>
                  <span className="text-xs font-bold text-primary-600 uppercase tracking-wider bg-white px-2 py-1 rounded border border-primary-100">
                    {params.country.toUpperCase()}
                  </span>
                </div>
                <div className="p-5 grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Visa Type</div>
                    <div className="text-neutral-900 font-medium">{visaName}</div>
                  </div>
                  {formData.selectedSubTypeId && visaInfo?.subTypes && (
                    <div>
                      <div className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Subcategory</div>
                      <div className="text-neutral-900 font-medium">
                        {visaInfo.subTypes.find(st => st.id === formData.selectedSubTypeId)?.label || "N/A"}
                      </div>
                    </div>
                  )}
                  {formData.travelDate && (
                    <div>
                      <div className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                        <Calendar size={12} /> Travel Date
                      </div>
                      <div className="text-neutral-900 font-medium">{formatDate(formData.travelDate)}</div>
                    </div>
                  )}
                  {formData.tripType && (
                    <div>
                      <div className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                        <Briefcase size={12} /> Purpose
                      </div>
                      <div className="text-neutral-900 font-medium capitalize">{formData.tripType}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Primary Contact Card */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden group hover:border-primary-300 transition-colors">
                <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <User size={18} />
                    </div>
                    <h3 className="font-semibold text-neutral-900">Primary Contact</h3>
                  </div>
                </div>
                <div className="p-5 grid sm:grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs text-neutral-500 font-semibold mb-1">Full Name</div>
                    <div className="text-neutral-900 font-medium">{formData.primaryContact?.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-500 font-semibold mb-1">Email Address</div>
                    <div className="text-neutral-900 font-medium truncate">{formData.primaryContact?.email}</div>
                  </div>
                  {formData.primaryContact?.phone && (
                    <div>
                      <div className="text-xs text-neutral-500 font-semibold mb-1">Mobile Number</div>
                      <div className="text-neutral-900 font-medium">{formData.primaryContact.phone}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Travellers Card */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden group hover:border-primary-300 transition-colors">
                <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                      <Users size={18} />
                    </div>
                    <h3 className="font-semibold text-neutral-900">Travellers</h3>
                  </div>
                  <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-green-200">
                    {(formData.travellers || []).length} Traveller(s)
                  </span>
                </div>
                <div className="p-5">
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {(formData.travellers || []).map((t, i) => (
                      <div key={t.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 group-hover:bg-white transition-all">
                        <div className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-500">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-neutral-900 truncate">
                            {t.firstName} {t.lastName}
                          </div>
                          <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-tight">
                            {t.passportNumber}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Documents Summary Card */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <FileText size={18} />
                    </div>
                    <h3 className="font-semibold text-neutral-900">Supporting Documents</h3>
                  </div>
                </div>
                <div className="p-5">
                  {documentSummary.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {documentSummary.map((doc) => (
                        <div
                          key={doc.key}
                          className="flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-lg hover:border-primary-300 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-neutral-900 truncate">
                              {doc.requirement?.name || doc.fileName}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight flex items-center gap-1">
                              {doc.category || "General"} {doc.travellerLabel && <>• <span className="text-primary-600">{doc.travellerLabel}</span></>}
                            </div>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
                      <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                        <FileText size={20} />
                      </div>
                      <h4 className="text-sm font-semibold text-neutral-900 mb-1">No Documents Uploaded Yet</h4>
                      <p className="text-xs text-neutral-500">
                        Upload in Step 7 to accelerate your visa verification process.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing & Promo Code Section */}
              <div className="grid md:grid-cols-2 gap-6 mt-2">
                {/* Promo Code Card */}
                {session && (
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 h-full">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag size={18} className="text-primary-600" />
                      <h3 className="font-semibold text-neutral-900">Have a Promo Code?</h3>
                    </div>
                    <PromoCodeInput
                      onApply={async (code) => {
                        const baseAmount = visaPrice * ((formData.travellers || []).length || 1);
                        const baseAmountInPaise = Math.round(baseAmount * 100);
                        const response = await fetch("/api/promo-codes/validate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            code,
                            amount: baseAmountInPaise,
                            type: "visa",
                            visaId: visaInfo?.id,
                            countryId: visaInfo?.country?.id,
                          }),
                        });

                        const result = await response.json();

                        if (result.valid && result.promoCode) {
                          setAppliedPromoCode({
                            id: result.promoCode.id,
                            code: result.promoCode.code,
                            discountAmount: result.discountAmount || 0,
                            message: result.message,
                          });
                        }

                        return result;
                      }}
                      appliedCode={appliedPromoCode ? {
                        code: appliedPromoCode.code,
                        discountAmount: appliedPromoCode.discountAmount / 100,
                        message: appliedPromoCode.message,
                      } : null}
                      onRemove={() => setAppliedPromoCode(null)}
                    />
                  </div>
                )}

                {/* Final Price Card */}
                <div className="bg-primary-600 rounded-xl shadow-lg p-6 h-full text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CreditCard size={120} />
                  </div>

                  <h3 className="text-primary-200 font-bold uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
                    <CreditCard size={14} /> Payment Overview
                  </h3>

                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-primary-100">Application Fee ({(formData.travellers || []).length} × ₹{visaPrice.toLocaleString()})</span>
                      <span className="font-semibold">₹{baseTotalAmount.toLocaleString()}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm py-3 border-y border-primary-500/30">
                        <span className="text-primary-100">Promo Discount ({appliedPromoCode?.code})</span>
                        <span className="text-green-300 font-bold">-₹{discountAmount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-primary-100 text-sm font-medium">Grand Total</p>
                          <p className="text-[10px] text-primary-200 mt-0.5 italic">Includes GST & Processing fees</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black">₹{totalAmount.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              Terms & Conditions
            </h2>

            <div className="bg-neutral-50 rounded-lg p-6 max-h-96 overflow-y-auto border border-neutral-200">
              <div className="prose prose-sm max-w-none">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900">Application Terms & Conditions</h3>
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 underline"
                  >
                    View Full Terms
                  </Link>
                </div>

                <div className="space-y-4 text-neutral-700">
                  <div>
                    <h4 className="font-semibold mb-2">1. Application Process</h4>
                    <p className="text-sm">
                      By submitting this visa application, you acknowledge that all information provided is accurate and complete.
                      Any false or misleading information may result in visa rejection or legal consequences.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">2. Document Requirements</h4>
                    <p className="text-sm">
                      You are responsible for providing all required documents as per the visa requirements.
                      Incomplete or incorrect documents may delay processing or result in application rejection.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">3. Processing Time</h4>
                    <p className="text-sm">
                      Processing times are estimates and may vary based on embassy/consulate workload,
                      completeness of documents, and other factors beyond our control.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">4. Fees & Refunds</h4>
                    <p className="text-sm">
                      Application fees are non-refundable once the application is submitted to the embassy/consulate.
                      Service fees may be refundable in certain circumstances as per our refund policy.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">5. Visa Decision</h4>
                    <p className="text-sm">
                      The final visa decision rests solely with the embassy/consulate. We cannot guarantee visa approval
                      and are not responsible for visa rejections.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">6. Data Privacy</h4>
                    <p className="text-sm">
                      Your personal information will be used solely for visa processing purposes and shared with
                      relevant authorities as required. We maintain strict data protection measures.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">7. Travel Responsibility</h4>
                    <p className="text-sm">
                      You are responsible for ensuring your passport is valid, meeting entry requirements,
                      and complying with all immigration laws of the destination country.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-5 w-5 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-neutral-900">
                    I have read and agree to the Terms & Conditions
                  </span>
                  <p className="text-xs text-neutral-600 mt-1">
                    You must accept the terms and conditions to proceed with your visa application.
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Please read all terms carefully. By proceeding, you acknowledge that you understand
                and agree to be bound by these terms and conditions.
              </p>
            </div>
          </div>
        );

      case 6:
        const baseVisaTotalAmount = visaPrice * Math.max(formData.travellers?.length ?? 1, 1);
        const visaDiscountAmount = appliedPromoCode ? appliedPromoCode.discountAmount / 100 : 0; // Convert from paise to rupees
        const visaTotalAmount = Math.max(0, baseVisaTotalAmount - visaDiscountAmount);
        const isVisaFreeEntry = visaInfo?.visaMode === "VISA_FREE_ENTRY" || visaInfo?.visaMode === "E_VISA";
        const isFreeVisa = visaTotalAmount <= 0 || isVisaFreeEntry;

        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              {isFreeVisa ? "Signup/Login & Submit Application" : "Signup/Login & Payment"}
            </h2>

            {!session ? (
              <div className="bg-neutral-50 rounded-lg p-6 space-y-4">
                <p className="text-neutral-700">
                  Please create an account or login to {isFreeVisa ? "submit your application" : "complete your payment"}.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Link
                    href={`/signup?email=${encodeURIComponent(formData.primaryContact?.email || "")}`}
                    className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors text-center"
                  >
                    Create Account
                  </Link>
                  <button
                    onClick={() => signIn()}
                    className="border border-primary-600 text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors"
                  >
                    Login
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700">
                    Logged in as: {session.user?.email}
                  </p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-6">
                  {visaDiscountAmount > 0 && (
                    <div className="mb-4 pb-4 border-b border-neutral-200">
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-neutral-700">Subtotal</span>
                        <span className="text-neutral-900">₹{baseVisaTotalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-700">Discount ({appliedPromoCode?.code})</span>
                        <span className="text-green-700 font-medium">-₹{visaDiscountAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold text-primary-600">
                      {isFreeVisa ? "₹0" : `₹${visaTotalAmount.toLocaleString()}`}
                    </span>
                  </div>
                  {isFreeVisa ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <p className="text-green-700 font-medium">
                        {visaInfo?.visaMode === "VISA_FREE_ENTRY"
                          ? "This is a Visa-Free Entry destination — no payment required. Submit your application for record-keeping and travel preparation assistance."
                          : visaInfo?.visaMode === "E_VISA"
                            ? "This is an E-VISA with payment to be made at a later stage or in person — no online payment required. Submit your application to proceed."
                            : "This visa application is free — no payment required. Click Submit Application to complete your submission."
                        }
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-600 mb-6">
                      Secure payment via Razorpay. All major cards, UPI, and net banking accepted.
                    </p>
                  )}
                  {paymentCompleted ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-green-700 font-medium">
                          ✓ Payment has already been completed for this application.
                        </p>
                      </div>
                      <Link
                        href={`/applications/thank-you?applicationId=${draftId}`}
                        className="block w-full text-center bg-primary-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                      >
                        View Application Status
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={handleVisaPayment}
                      disabled={loading}
                      className="w-full bg-primary-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? "Processing..."
                        : isFreeVisa
                          ? "Submit & Continue to Documents"
                          : "Proceed to Payment"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Upload Documents</h2>
            <p className="text-neutral-600 mb-6">
              Please upload clear copies of the required documents below.
            </p>

            <div className="space-y-8">
              {/* Application Level Requirements */}
              {perApplicationRequirements.length > 0 && (
                <div className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
                  <h3 className="font-semibold text-lg mb-4 text-neutral-900 flex items-center gap-2">
                    <FileText size={20} className="text-primary-600" />
                    Application Documents
                  </h3>
                  <div className="space-y-4">
                    {perApplicationRequirements.map((req) => {
                      const key = getDocumentKey(req.id);
                      const currentDoc = formData.documents?.[key];

                      return (
                        <div key={req.id} className="bg-white p-4 rounded-lg border border-neutral-200">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{req.name}</span>
                                {req.isRequired && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                    Required
                                  </span>
                                )}
                              </div>
                              {req.description && (
                                <p className="text-sm text-neutral-500 mt-1">{req.description}</p>
                              )}
                            </div>
                            {currentDoc && (
                              <button
                                onClick={() => removeDocument(key)}
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {currentDoc ? (
                            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                              <CheckCircle size={20} className="text-green-600 mr-3 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-green-900 truncate">
                                  {currentDoc.file?.name || "Document uploaded"}
                                </p>
                                <p className="text-xs text-green-700">
                                  {(currentDoc.file?.size ? (currentDoc.file.size / 1024 / 1024).toFixed(2) : "0")} MB
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  setPreviewModal({
                                    url: currentDoc.preview || "",
                                    fileName: currentDoc.file?.name || req.name,
                                  })
                                }
                                className="ml-3 p-2 text-green-700 hover:bg-green-100 rounded-full"
                              >
                                <Eye size={18} />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <label className="block w-full cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".jpg,.jpeg,.png,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleDocumentUpload(req, undefined, file);
                                    e.target.value = ""; // Reset input
                                  }}
                                />
                                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center text-neutral-500 hover:border-primary-500 hover:text-primary-600 transition-colors">
                                  <Upload size={24} className="mb-2" />
                                  <span className="text-sm font-medium">Click to upload</span>
                                  <span className="text-xs text-neutral-400 mt-1">
                                    JPG, PNG, PDF (Max 20MB)
                                  </span>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Download Templates Section */}
              {templates.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="font-semibold text-lg mb-4 text-neutral-900 flex items-center gap-2">
                    <FileText size={20} className="text-primary-600" />
                    Download Templates
                  </h3>
                  <p className="text-sm text-neutral-600 mb-4">
                    Download sample document templates to help you prepare your application.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.map((template: any) => (
                      <div
                        key={template.id}
                        className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText size={16} className="text-primary-600" />
                              <h4 className="font-medium text-neutral-900 text-sm">{template.name}</h4>
                            </div>
                            {template.description && (
                              <p className="text-xs text-neutral-600 mt-1">{template.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                              <span>{template.fileName}</span>
                              {template.fileSize && (
                                <span>{(template.fileSize / 1024).toFixed(1)} KB</span>
                              )}
                            </div>
                          </div>
                          {template.downloadUrl && (
                            <a
                              href={template.downloadUrl}
                              download={template.fileName}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors flex-shrink-0"
                            >
                              <Download size={12} />
                              Download
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Traveller Level Requirements */}
              {(formData.travellers || []).map((traveller, index) => (
                <div key={traveller.id} className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
                  <h3 className="font-semibold text-lg mb-4 text-neutral-900 flex items-center gap-2">
                    <User size={20} className="text-primary-600" />
                    {traveller.firstName} {traveller.lastName}
                  </h3>

                  {perTravellerRequirements.length === 0 ? (
                    <p className="text-neutral-500 text-sm italic">No specific documents required for travellers.</p>
                  ) : (
                    <div className="space-y-4">
                      {perTravellerRequirements.map((req) => {
                        const key = getDocumentKey(req.id, traveller.id);
                        const currentDoc = formData.documents?.[key];

                        return (
                          <div key={`${traveller.id}-${req.id}`} className="bg-white p-4 rounded-lg border border-neutral-200">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{req.name}</span>
                                  {req.isRequired && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                      Required
                                    </span>
                                  )}
                                </div>
                                {req.description && (
                                  <p className="text-sm text-neutral-500 mt-1">{req.description}</p>
                                )}
                              </div>
                              {currentDoc && (
                                <button
                                  onClick={() => removeDocument(key)}
                                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            {currentDoc ? (
                              <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle size={20} className="text-green-600 mr-3 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-green-900 truncate">
                                    {currentDoc.file?.name || "Document uploaded"}
                                  </p>
                                  <p className="text-xs text-green-700">
                                    {(currentDoc.file?.size ? (currentDoc.file.size / 1024 / 1024).toFixed(2) : "0")} MB
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    setPreviewModal({
                                      url: currentDoc.preview || "",
                                      fileName: currentDoc.file?.name || req.name,
                                    })
                                  }
                                  className="ml-3 p-2 text-green-700 hover:bg-green-100 rounded-full"
                                >
                                  <Eye size={18} />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <label className="block w-full cursor-pointer">
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleDocumentUpload(req, traveller.id, file);
                                      e.target.value = ""; // Reset input
                                    }}
                                  />
                                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center text-neutral-500 hover:border-primary-500 hover:text-primary-600 transition-colors">
                                    <Upload size={24} className="mb-2" />
                                    <span className="text-sm font-medium">Click to upload</span>
                                    <span className="text-xs text-neutral-400 mt-1">
                                      JPG, PNG, PDF (Max 20MB)
                                    </span>
                                  </div>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Validate params early
  if (!params?.country || !params?.type) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-large p-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Invalid Visa Application</h1>
          <p className="text-neutral-600 mb-6">The visa application link is invalid. Please select a visa from the visa page.</p>
          <Link
            href="/visas"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Go to Visas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-2 text-sm mb-3">
            <Link href="/" className="text-neutral-500 hover:text-primary-600 transition-colors">
              Home
            </Link>
            <span className="text-neutral-300">/</span>
            <Link href="/visas" className="text-neutral-500 hover:text-primary-600 transition-colors">
              Visas
            </Link>
            <span className="text-neutral-300">/</span>
            <Link href={`/visas/${params.country}`} className="text-neutral-500 hover:text-primary-600 transition-colors">
              {visaInfo?.country?.name || params.country.toUpperCase()}
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-neutral-900 font-medium truncate max-w-[200px]">
              {visaName}
            </span>
          </nav>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={(e) => {
                e.preventDefault();
                router.back();
              }}
              className="text-primary-600 hover:text-primary-700 text-sm text-left"
              type="button"
            >
              ← Back to Visa Details
            </button>
            <button
              type="button"
              onClick={handleStartFreshApplication}
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              Start fresh application
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          {/* Always horizontal row */}
          <div className="flex items-start">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-start flex-1 min-w-0">
                  {/* Step: icon + label */}
                  <div className="flex flex-col items-center flex-shrink-0 w-10 sm:w-14">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isActive
                            ? "bg-primary-600 text-white"
                            : "bg-neutral-200 text-neutral-500"
                      }`}
                    >
                      {isCompleted ? <CheckCircle size={15} /> : <Icon size={15} />}
                    </div>
                    {/* Label: hidden on mobile unless active */}
                    <span
                      className={`mt-1 text-[9px] sm:text-[11px] font-medium text-center leading-tight px-0.5 ${
                        isActive
                          ? "text-primary-600"
                          : isCompleted
                            ? "text-green-600"
                            : "text-neutral-400"
                      } ${isActive || isCompleted ? "block" : "hidden sm:block"}`}
                    >
                      {step.name}
                    </span>
                  </div>

                  {/* Connector line (not after last step) */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-0.5 mt-4 sm:mt-5 mx-0.5 sm:mx-1 rounded-full transition-colors"
                      style={{ backgroundColor: isCompleted ? "#22c55e" : "#e5e7eb" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current step label on mobile (shows below the row) */}
          <p className="sm:hidden mt-3 text-xs text-center text-neutral-500">
            Step {currentStep} of {steps.length} — <span className="font-semibold text-primary-600">{steps[currentStep - 1]?.name}</span>
          </p>
        </div>

        {/* Inline step error banner */}
        {stepError && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="mt-0.5 shrink-0 text-red-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12A5 5 0 1 1 8 3a5 5 0 0 1 0 10zm-.75-7.25a.75.75 0 1 1 1.5 0v3a.75.75 0 0 1-1.5 0v-3zm.75 5.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z"/></svg>
            </span>
            <span className="flex-1">{stepError}</span>
            {stepErrorAction && (
              <a
                href={stepErrorAction.href}
                className="ml-2 shrink-0 rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                {stepErrorAction.label}
              </a>
            )}
            <button
              onClick={() => { setStepError(null); setStepErrorAction(null); }}
              className="ml-1 shrink-0 text-red-400 hover:text-red-600"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-medium p-5 sm:p-8 mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-3 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <ArrowLeft size={20} />
            <span>Previous</span>
          </button>
          {currentStep < 4 && (
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center space-x-2"
            >
              <span>Next</span>
              <ArrowRight size={20} />
            </button>
          )}
          {currentStep === 4 && (
            <button
              onClick={handleConfirmAndPay}
              disabled={loading}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>{loading ? "Saving..." : "Continue to Terms & Conditions"}</span>
              <ArrowRight size={20} />
            </button>
          )}
          {currentStep === 5 && (
            <button
              onClick={() => {
                if (!termsAccepted) {
                  setStepError("Please accept the Terms & Conditions to proceed.");
                  setStepErrorAction(null);
                  return;
                }
                setStepError(null);
                setStepErrorAction(null);
                setCurrentStep(6);
              }}
              disabled={!termsAccepted}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Continue to Payment</span>
              <ArrowRight size={20} />
            </button>
          )}
          {currentStep === 6 && (
            <button
              onClick={handleVisaPayment}
              disabled={loading}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>{loading ? "Processing..." : paymentCompleted ? "Next" : isFreeVisa ? "Submit Application" : "Proceed to Payment"}</span>
              <ArrowRight size={20} />
            </button>
          )}
          {currentStep === 7 && (
            <button
              onClick={handleFinishApplication}
              disabled={loading}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>{loading ? "Completing..." : "Finish Application"}</span>
              <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 cursor-pointer"
            onPointerDown={() => setPreviewModal(null)}
            onClick={() => setPreviewModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col cursor-auto"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900 truncate flex-1 mr-4">
                  {previewModal.fileName}
                </h3>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                  aria-label="Close preview"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-neutral-50">
                {previewModal.url.startsWith("data:image") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewModal.url}
                    alt="Document preview"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
                  />
                ) : previewModal.url.startsWith("data:application/pdf") || previewModal.url.includes("pdf") ? (
                  <object
                    data={previewModal.url}
                    type="application/pdf"
                    className="w-full h-[70vh] rounded-lg shadow-md border border-neutral-200"
                    aria-label="PDF preview"
                  >
                    <div className="text-center p-8 h-full flex flex-col items-center justify-center">
                      <FileText size={48} className="text-neutral-400 mx-auto mb-4" />
                      <p className="text-neutral-600 mb-4">PDF preview not available in this browser</p>
                      <a
                        href={previewModal.url}
                        download={previewModal.fileName}
                        className="text-primary-600 hover:text-primary-700 underline"
                      >
                        Download PDF
                      </a>
                    </div>
                  </object>
                ) : (
                  <div className="text-center p-8">
                    <FileText size={48} className="text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-600 mb-4">Preview not available for this file type</p>
                    <a
                      href={previewModal.url}
                      download={previewModal.fileName}
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      Download file
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Gate Modal */}
      <UnifiedAuthModal
        isOpen={showAccountGate}
        onClose={() => setShowAccountGate(false)}
        onSuccess={async () => {
          setShowAccountGate(false);
          setIsGuestMode(false);

          // Refresh session to get updated user data
          router.refresh();

          // Merge guest application after login
          try {
            const mergeResponse = await fetch("/api/guest-applications/merge", {
              method: "POST",
            });
            if (mergeResponse.ok) {
              const mergeData = await mergeResponse.json();
              if (mergeData.formData) {
                // Restore merged data
                const restoredFormData = mergeData.formData;
                setFormData(prev => ({
                  ...prev,
                  ...restoredFormData,
                  // Ensure travellers have IDs
                  travellers: restoredFormData.travellers?.map((t: any, idx: number) => ({
                    ...t,
                    id: t.id || `traveller-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
                  })) || prev.travellers,
                }));

                // Navigate to last completed step or current step if it's ahead
                if (mergeData.lastStepCompleted && mergeData.lastStepCompleted >= currentStep) {
                  setCurrentStep(mergeData.lastStepCompleted);
                }
              }
            }
          } catch (error) {
            console.error("Error merging guest application:", error);
          }

          // Continue to next step if we're at step 2
          if (currentStep === 2 && currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
          }
        }}
        defaultEmail={formData.primaryContact?.email}
        redirectUrl={`/apply/visa/${params.country}/${params.type}`}
        title="Continue Your Application"
        subtitle="Login or create an account to save your visa application"
      />
    </div>
  );
}
