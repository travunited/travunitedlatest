"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle, User, FileText, CreditCard, Calendar, Upload, X, Eye } from "lucide-react";
import Link from "next/link";
import { saveDraftToLocalStorage, getDraftFromLocalStorage, clearDraftFromLocalStorage, VisaDraft } from "@/lib/localStorage";
import { loadRazorpayScript } from "@/lib/razorpay-client";
import { useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/dateFormat";

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
  stayDuration: string;
  validity: string;
  entryType: string;
  overview: string;
  country: {
    id: string;
    code: string;
    name: string;
    flagUrl?: string | null;
  };
  requirements: VisaRequirement[];
}

const steps = [
  { id: 1, name: "Select Visa", icon: CheckCircle },
  { id: 2, name: "Primary Contact", icon: User },
  { id: 3, name: "Travellers", icon: User },
  { id: 4, name: "Documents", icon: FileText },
  { id: 5, name: "Review", icon: CheckCircle },
  { id: 6, name: "Payment", icon: CreditCard },
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

  const [formData, setFormData] = useState<FormData>({
    country: params.country,
    visaType: params.type,
    visaId: undefined,
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

  // Memoize travellerCount to prevent unnecessary recalculations
  const travellerCount = useMemo(() => formData.travellers?.length ?? 0, [formData.travellers?.length]);

  const perTravellerRequirements = useMemo(
    () =>
      visaInfo?.requirements.filter(
        (req) => req.scope === "PER_TRAVELLER"
      ) ?? [],
    [visaInfo]
  );

  const perApplicationRequirements = useMemo(
    () =>
      visaInfo?.requirements.filter(
        (req) => req.scope === "PER_APPLICATION"
      ) ?? [],
    [visaInfo]
  );

  const getDocumentKey = (requirementId: string, travellerId?: string) =>
    travellerId
      ? `${requirementId}:traveller-${travellerId}`
      : `${requirementId}:application`;

  const visaName = visaInfo?.name || `${params.country.toUpperCase()} Visa`;
  const visaPrice = visaInfo?.priceInInr ?? 0;
  const visaProcessing = visaInfo?.processingTime || "Processing time shared after review";

  const requirementMap = useMemo(() => {
    const map = new Map<string, VisaRequirement>();
    visaInfo?.requirements.forEach((req) => map.set(req.id, req));
    return map;
  }, [visaInfo]);

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
    async function loadVisa() {
      setVisaLoading(true);
      try {
        const response = await fetch(
          `/api/visas/${params.country}/${params.type}`
        );
        if (!response.ok) {
          throw new Error("Visa not found");
        }
        const data: VisaDetailsResponse = await response.json();
        if (!isMounted) return;
        setVisaInfo(data);
        setFormData((prev) => ({
          ...prev,
          country: data.country.code.toLowerCase(),
          visaType: data.slug,
          visaId: data.id,
        }));
      } catch (error) {
        console.error("Failed to load visa", error);
        if (isMounted) {
          router.push("/visas");
        }
      } finally {
        if (isMounted) {
          setVisaLoading(false);
        }
      }
    }
    loadVisa();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.country, params.type, router]);

  // Load existing application data if editing
  useEffect(() => {
    const editId = searchParams.get("edit");
    const applicationId = searchParams.get("applicationId");
    
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
          }
        })
        .catch(err => {
          console.error("Error loading application:", err);
        });
    }
  }, [searchParams]);

  // Load draft from localStorage on mount - only run once on mount or when params change
  useEffect(() => {
    const editId = searchParams.get("edit");
    const applicationId = searchParams.get("applicationId");
    
    // Skip localStorage if editing existing application
    if (editId || applicationId) {
      return;
    }
    
    const draft = getDraftFromLocalStorage();
    if (draft && (draft.country === params.country && draft.visaType === params.type)) {
      // Ensure travellers have IDs when loading from localStorage
      const travellersWithIds: FormDataTraveller[] = (draft.travellers || []).map((t, idx) => ({
        ...t,
        id: (t as any).id || `traveller-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
      }));
      
      const { travellers: _, ...draftWithoutTravellers } = draft;
      setFormData((prev) => {
        // Only update if we don't already have travellers (to prevent overwriting user input)
        if (prev.travellers && prev.travellers.length > 0) {
          return prev;
        }
        return { 
          ...prev, 
          ...draftWithoutTravellers,
          travellers: travellersWithIds.length > 0 ? travellersWithIds : prev.travellers,
        };
      });
      if (draft.applicationId) {
        setDraftId(draft.applicationId);
      }
      if (draft.travellerIds) {
        setCreatedTravellerIds(draft.travellerIds);
      }
    } else {
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
      if (travelDate < today) {
        errors.travelDate = "Travel date cannot be in the past";
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

  // Auto-save to localStorage on form changes - debounced to prevent excessive saves
  useEffect(() => {
    if (currentStep > 1) {
      const timeoutId = setTimeout(() => {
        saveDraftToLocalStorage(formData);
      }, 300); // Debounce by 300ms
      return () => clearTimeout(timeoutId);
    }
  }, [formData, currentStep]);

  const nextStep = () => {
    // Validation before proceeding
    if (currentStep === 2) {
      if (!formData.primaryContact?.name || !formData.primaryContact?.email) {
        alert("Please fill in all required contact information");
        return;
      }
    }
    
    if (currentStep === 3) {
      if (!formData.travellers || formData.travellers.length === 0) {
        alert("Please add at least one traveller");
        return;
      }
      // Validate all travellers have required fields
      for (const traveller of formData.travellers) {
        if (!traveller.firstName || !traveller.lastName || !traveller.dateOfBirth || 
            !traveller.gender || !traveller.passportNumber || !traveller.passportIssueDate || 
            !traveller.passportExpiryDate || !traveller.nationality) {
          alert("Please fill in all required fields for all travellers");
          return;
        }
      
      // Validate all dates before proceeding
      if (!validateDates()) {
        alert("Please fix the date errors before proceeding");
        return;
      }
      }
    }
    
    if (currentStep === 4 && visaInfo) {
      const missingDocs: string[] = [];

      perTravellerRequirements.forEach((req) => {
        (formData.travellers || []).forEach((traveller, index) => {
          const key = getDocumentKey(req.id, traveller.id);
          if (req.isRequired && !formData.documents?.[key]?.file) {
            missingDocs.push(`${req.name} for traveller ${index + 1}`);
          }
        });
      });

      perApplicationRequirements.forEach((req) => {
        const key = getDocumentKey(req.id);
        if (req.isRequired && !formData.documents?.[key]?.file) {
          missingDocs.push(req.name);
        }
      });

      if (missingDocs.length > 0) {
        alert(
          `Please upload the following required documents:\n- ${missingDocs.join(
            "\n- "
          )}`
        );
        return;
      }
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      saveDraftToLocalStorage(formData);
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

    // Check if user is logged in
    if (!session) {
      // Redirect to signup/login
      router.push(`/signup?email=${encodeURIComponent(formData.primaryContact.email || "")}&redirect=/apply/visa/${params.country}/${params.type}`);
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
          primaryContact: formData.primaryContact,
          travellers: formData.travellers?.map(({ id, ...rest }) => rest) || [],
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
        
        // Clear draft but keep application linkage for future uploads
        clearDraftFromLocalStorage();
        saveDraftToLocalStorage({
          country: formData.country,
          visaType: formData.visaType,
          visaId: formData.visaId || visaInfo?.id,
          applicationId: data.applicationId,
          travellerIds: travellerMap,
          documents: {},
        });
        
        setCurrentStep(6);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to save application. Please try again.");
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
        await fetch(`/api/applications/${applicationId}/documents`, {
          method: "POST",
          body: uploadFormData,
        });
      } catch (error) {
        console.error("Error uploading document:", error);
      }
    }
  };

  const handleVisaPayment = async () => {
    if (!draftId) {
      alert("Application reference not found. Please restart the payment step.");
      return;
    }

    if (!session?.user?.email) {
      alert("Please login to continue.");
      return;
    }

    const travellerCount =
      formData.travellers && formData.travellers.length > 0
        ? formData.travellers.length
        : 1;
    const totalAmount = (visaInfo?.priceInInr ?? 0) * travellerCount;

    setLoading(true);
    try {
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          applicationId: draftId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Unable to initiate payment.");
      }

      const { orderId, keyId, amount, currency } = await response.json();
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
          email: session.user?.email || formData.primaryContact?.email || "",
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
              setLoading(false);
              router.push(`/applications/thank-you?applicationId=${draftId}`);
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
              <p className="text-neutral-600 mb-4">
                Processing: {visaLoading ? "Fetching..." : visaProcessing}
              </p>
              <div className="text-2xl font-bold text-primary-600">
                {visaLoading ? "—" : `₹${visaPrice.toLocaleString()}`}
              </div>
            </div>
            <div className="space-y-4">
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
                  min={new Date().toISOString().split("T")[0]}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                    dateErrors.travelDate ? "border-red-500" : "border-neutral-300"
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
                  value={formData.primaryContact?.phone || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryContact: { ...formData.primaryContact!, phone: e.target.value },
                    })
                  }
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="+91 1234567890"
                />
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
                        className={`w-full px-4 py-2 border rounded-lg ${
                          dateErrors[`traveller-${index}-dateOfBirth`] ? "border-red-500" : "border-neutral-300"
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
                        onChange={(e) => updateTravellerField(traveller.id, "passportNumber", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Nationality *
                      </label>
                      <input
                        type="text"
                        required
                        value={traveller.nationality || "Indian"}
                        onChange={(e) => updateTravellerField(traveller.id, "nationality", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                        placeholder="Indian"
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
                        className={`w-full px-4 py-2 border rounded-lg ${
                          dateErrors[`traveller-${index}-passportIssueDate`] ? "border-red-500" : "border-neutral-300"
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
                        className={`w-full px-4 py-2 border rounded-lg ${
                          dateErrors[`traveller-${index}-passportExpiryDate`] ? "border-red-500" : "border-neutral-300"
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
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              Upload Documents
            </h2>
            <p className="text-neutral-600 mb-6">
              Upload all required documents. Accepted formats: JPG, PNG, PDF (max
              20MB per file).
            </p>

            {!visaInfo && (
              <div className="text-sm text-neutral-500">
                Loading document requirements...
              </div>
            )}

            {visaInfo && (
              <>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-neutral-900">
                    Per-Traveller Documents
                  </h3>
                  {perTravellerRequirements.length === 0 && (
                    <p className="text-sm text-neutral-500">
                      No per-traveller documents required for this visa.
                    </p>
                  )}
                  {(formData.travellers || []).map((traveller, travellerIndex) => (
                    <div
                      key={traveller.id}
                      className="border border-neutral-200 rounded-lg p-4 space-y-3"
                    >
                      <h4 className="font-medium">
                        Traveller {travellerIndex + 1}:{" "}
                        {traveller.firstName || traveller.lastName
                          ? `${traveller.firstName} ${traveller.lastName}`.trim()
                          : "Details pending"}
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        {perTravellerRequirements.map((requirement) => {
                          const key = getDocumentKey(
                            requirement.id,
                            traveller.id
                          );
                          const doc = formData.documents?.[key];
                          return (
                            <div key={key} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-neutral-700">
                                  {requirement.name}
                                </label>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    requirement.isRequired
                                      ? "bg-red-100 text-red-700"
                                      : "bg-neutral-100 text-neutral-600"
                                  }`}
                                >
                                  {requirement.isRequired ? "Required" : "Optional"}
                                </span>
                              </div>
                              {requirement.description && (
                                <p className="text-xs text-neutral-500">
                                  {requirement.description}
                                </p>
                              )}
                              {doc?.file ? (
                                <div className="border border-neutral-300 rounded-lg p-3 flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <FileText size={20} className="text-primary-600" />
                                    <span className="text-sm text-neutral-700">
                                      {doc.file.name}
                                    </span>
                                  </div>
                                  <div className="flex space-x-2">
                                    {doc.preview && (
                                      <button
                                        type="button"
                                        onClick={() => window.open(doc.preview, "_blank")}
                                        className="p-1 text-primary-600 hover:text-primary-700"
                                      >
                                        <Eye size={16} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => removeDocument(key)}
                                      className="p-1 text-red-600 hover:text-red-700"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-primary-600 transition-colors">
                                  <Upload size={24} className="text-neutral-400 mb-2" />
                                  <span className="text-sm text-neutral-600">
                                    Click to upload
                                  </span>
                                  <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file)
                                        handleDocumentUpload(
                                          requirement,
                                          traveller.id,
                                          file
                                        );
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 mt-6">
                  <h3 className="font-semibold text-lg text-neutral-900">
                    Per-Application Documents
                  </h3>
                  {perApplicationRequirements.length === 0 && (
                    <p className="text-sm text-neutral-500">
                      No application-level documents required for this visa.
                    </p>
                  )}
                  {perApplicationRequirements.map((requirement) => {
                    const key = getDocumentKey(requirement.id);
                    const doc = formData.documents?.[key];
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-neutral-700">
                            {requirement.name}
                          </label>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              requirement.isRequired
                                ? "bg-red-100 text-red-700"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {requirement.isRequired ? "Required" : "Optional"}
                          </span>
                        </div>
                        {requirement.description && (
                          <p className="text-xs text-neutral-500">
                            {requirement.description}
                          </p>
                        )}
                        {doc?.file ? (
                          <div className="border border-neutral-300 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText size={20} className="text-primary-600" />
                              <span className="text-sm text-neutral-700">
                                {doc.file.name}
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              {doc.preview && (
                                <button
                                  type="button"
                                  onClick={() => window.open(doc.preview, "_blank")}
                                  className="p-1 text-primary-600 hover:text-primary-700"
                                >
                                  <Eye size={16} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeDocument(key)}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-primary-600 transition-colors">
                            <Upload size={24} className="text-neutral-400 mb-2" />
                            <span className="text-sm text-neutral-600">
                              Click to upload
                            </span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocumentUpload(requirement, undefined, file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );

      case 5:
        const totalAmount =
          visaPrice * ((formData.travellers || []).length || 1);
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Review & Confirm</h2>
            <p className="text-neutral-600 mb-6">
              Please review all information carefully. You can go back to edit any section.
            </p>

            <div className="space-y-4">
              {/* Visa Details */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Visa Details</h3>
                <p>{visaName}</p>
                <p className="text-sm text-neutral-600">{params.country.toUpperCase()}</p>
                {formData.travelDate && (
                  <p className="text-sm text-neutral-600">Travel Date: {formatDate(formData.travelDate)}</p>
                )}
              </div>

              {/* Primary Contact */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Primary Contact</h3>
                <p>{formData.primaryContact?.name}</p>
                <p className="text-sm text-neutral-600">{formData.primaryContact?.email}</p>
                {formData.primaryContact?.phone && (
                  <p className="text-sm text-neutral-600">{formData.primaryContact.phone}</p>
                )}
              </div>

              {/* Travellers */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Travellers</h3>
                <p className="text-sm text-neutral-600 mb-2">
                  {(formData.travellers || []).length} traveller(s)
                </p>
                {(formData.travellers || []).map((t, i) => (
                  <p key={t.id} className="text-sm">
                    {i + 1}. {t.firstName} {t.lastName}
                  </p>
                ))}
              </div>

              {/* Documents */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Documents</h3>
                {documentSummary.length > 0 ? (
                  <div className="space-y-2">
                    {documentSummary.map((doc) => (
                      <div
                        key={doc.key}
                        className="bg-white border border-neutral-200 rounded-lg px-3 py-2"
                      >
                        <div className="font-medium text-sm">
                          {doc.requirement?.name || doc.fileName}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {doc.category || "Supporting document"}
                          {doc.travellerLabel ? ` • ${doc.travellerLabel}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600">
                    Upload requirement documents in Step 4 to speed up verification.
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-neutral-900">Total Amount</span>
                  <span className="text-2xl font-bold text-primary-600">
                    ₹{totalAmount.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-1">Tax included</p>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Signup/Login & Payment</h2>
            
            {!session ? (
              <div className="bg-neutral-50 rounded-lg p-6 space-y-4">
                <p className="text-neutral-700">
                  Please create an account or login to complete your payment.
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
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold text-primary-600">
                      ₹{(
                        visaPrice *
                        Math.max(formData.travellers?.length ?? 1, 1)
                      ).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 mb-6">
                    Secure payment via Razorpay. All major cards, UPI, and net banking accepted.
                  </p>
                  <button
                    onClick={handleVisaPayment}
                    disabled={loading}
                    className="w-full bg-primary-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Processing..." : "Proceed to Payment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/visas/${params.country}/${params.type}`}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            ← Back to Visa Details
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-wrap gap-4 sm:gap-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center flex-1 min-w-[160px]">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isActive
                          ? "bg-primary-600 text-white"
                          : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium text-center ${
                        isActive ? "text-primary-600" : "text-neutral-600"
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        isCompleted ? "bg-green-500" : "bg-neutral-200"
                    } hidden sm:block`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
          {currentStep < 5 && (
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center space-x-2"
            >
              <span>Next</span>
              <ArrowRight size={20} />
            </button>
          )}
          {currentStep === 5 && (
            <button
              onClick={handleConfirmAndPay}
              disabled={loading}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>{loading ? "Saving..." : "Confirm & Continue to Payment"}</span>
              <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
