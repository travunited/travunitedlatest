"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Calendar,
  User,
  CreditCard,
  Users,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Plus,
  Minus,
  X,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { loadRazorpayScript } from "@/lib/razorpay-client";
import { formatDate } from "@/lib/dateFormat";
import TermsAndPolicy from "@/components/ui/TermsAndPolicy";
import { PromoCodeInput } from "@/components/promo-code/PromoCodeInput";

const steps = [
  { id: 1, name: "Select Tour & Date", icon: Calendar },
  { id: 2, name: "Primary Contact", icon: User },
  { id: 3, name: "Travellers", icon: Users },
  { id: 4, name: "Review", icon: CheckCircle },
  { id: 5, name: "Payment", icon: CreditCard },
];

const generateUID = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type TravellerForm = {
  uid: string;
  firstName: string;
  lastName: string;
  age: string;
  dateOfBirth: string;
  gender?: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  passportIssuingCountry: string;
  passportFileKey?: string | null;
  passportFileName?: string | null;
  panNumber?: string; // PAN for Indian travellers
  aadharFileKey?: string | null; // Aadhaar file for Indian travellers
  aadharFileName?: string | null;
};

type AddOnSelectionState = Record<string, { selected: boolean; quantity: number }>;
type PreferencesForm = {
  foodPreference: string;
  foodPreferenceNotes: string;
  languagePreference: string;
  languagePreferenceOther: string;
  driverPreference: string;
  specialRequests: string;
};

interface TourAddOn {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  pricingType: string;
  isRequired: boolean;
  isActive: boolean;
}

interface Tour {
  id: string;
  name: string;
  slug?: string | null;
  basePriceInInr?: number | null;
  price?: number;
  originalPrice?: number | null;
  requiresPassport?: boolean;
  tourType?: string | null;
  packageType?: string | null;
  addOns?: TourAddOn[] | null;
  hotelCategories?: string[] | null;
  advancePercentage?: number | null;
  allowAdvance?: boolean | null;
  seasonalPricing?: Record<string, { from?: string; to?: string; price?: number }> | null;
  bookingDeadline?: string | Date | null;
  availableDates?: string[] | null;
  minimumTravelers?: number | null;
  maximumTravelers?: number | null;
  updatedAt?: string | Date | null;
  bookingPolicies?: string | null;
  countryId?: string | null;
  cancellationTerms?: string | null;
  childAgeLimit?: number | null;
}

export default function TourBookingPage({ params }: { params: { id: string[] } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [tourLoading, setTourLoading] = useState(true);
  const [addOnSelections, setAddOnSelections] = useState<AddOnSelectionState>({});
  const [passportUploadStatus, setPassportUploadStatus] = useState<Record<string, { uploading: boolean; error: string | null }>>({});
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [bookingCreationError, setBookingCreationError] = useState<string | null>(null);
  const [selectedHotelCategory, setSelectedHotelCategory] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [refundPolicy, setRefundPolicy] = useState<{ key: string; title: string; content: string; version: string } | null>(null);
  const [termsPolicy, setTermsPolicy] = useState<{ key: string; title: string; content: string; version: string } | null>(null);
  const [policyVersion, setPolicyVersion] = useState<string | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState<{
    id: string;
    code: string;
    discountAmount: number;
    message?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    travelDate: "",
    numberOfAdults: 1,
    numberOfChildren: 0,
    primaryContact: {
      name: "",
      email: "",
      phone: "",
    },
    preferences: {
      foodPreference: "",
      foodPreferenceNotes: "",
      languagePreference: "",
      languagePreferenceOther: "",
      driverPreference: "",
      specialRequests: "",
    },
    policyAccepted: false,
    travellers: [] as TravellerForm[],
    paymentType: "full" as "full" | "advance",
    isCustomisedPackage: false,
    customRequestNotes: "",
    customBasePrice: "",
    customAddOnsPrice: "",
    customDiscount: "",
  });

  const createTravellerEntry = useCallback((): TravellerForm => ({
    uid: generateUID(),
    firstName: "",
    lastName: "",
    age: "",
    dateOfBirth: "",
    gender: "",
    nationality: "",
    passportNumber: "",
    passportExpiry: "",
    passportIssuingCountry: "",
    passportFileKey: null,
    passportFileName: null,
    panNumber: "",
    aadharFileKey: null,
    aadharFileName: null,
  }), []);

  const updateTraveller = (index: number, field: keyof TravellerForm, value: string | null) => {
    setFormData((prev) => {
      const travellers = [...prev.travellers];
      const updatedTraveller = { ...travellers[index], [field]: value ?? "" };

      // Auto-calculate age from DOB or vice versa, and detect child/adult/infant
      if (field === "dateOfBirth" && value) {
        const dob = new Date(value);
        const today = new Date();
        // Calculate age more precisely to handle infants (months)
        const ageInYears = (today.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
        // For infants, show fractional age (e.g., 0.5 for 6 months)
        if (ageInYears < 1) {
          updatedTraveller.age = ageInYears.toFixed(2);
        } else {
          updatedTraveller.age = Math.floor(ageInYears).toString();
        }
      } else if (field === "age" && value) {
        const age = parseFloat(value) || 0;
        if (age >= 0 && !updatedTraveller.dateOfBirth) {
          // Estimate DOB from age (approximate)
          const today = new Date();
          const estimatedDOB = new Date(today.getFullYear() - Math.floor(age), today.getMonth() - Math.round((age % 1) * 12), today.getDate());
          updatedTraveller.dateOfBirth = estimatedDOB.toISOString().split("T")[0];
        }
      }

      travellers[index] = updatedTraveller;
      return { ...prev, travellers };
    });
  };

  // Helper to get traveller type badge
  const getTravellerTypeBadge = (traveller: TravellerForm) => {
    if (!traveller.dateOfBirth && !traveller.age) return null;
    // Calculate age more precisely to handle infants (months)
    const age = traveller.dateOfBirth
      ? (new Date().getTime() - new Date(traveller.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)
      : parseFloat(traveller.age) || 0;
    const childAgeLimit = tour?.childAgeLimit || 12;

    // Infants are under 1 year old (including 5-6 month old babies)
    if (age < 1) {
      return { label: "Infant", color: "bg-purple-100 text-purple-800" };
    } else if (age < childAgeLimit) {
      return { label: "Child (under 12)", color: "bg-blue-100 text-blue-800" };
    }
    return null;
  };

  const updatePreference = (field: keyof PreferencesForm, value: string) => {
    setFormData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: value,
      },
    }));
  };

  const toggleAddOnSelection = (addOnId: string, selected: boolean) => {
    setAddOnSelections((prev) => {
      const next = { ...prev };
      if (!selected) {
        delete next[addOnId];
      } else {
        next[addOnId] = {
          selected: true,
          quantity: Math.max(1, next[addOnId]?.quantity || 1),
        };
      }
      return next;
    });
  };

  const updateAddOnQuantity = (addOnId: string, quantity: number) => {
    setAddOnSelections((prev) => ({
      ...prev,
      [addOnId]: {
        selected: true,
        quantity: Math.max(1, quantity),
      },
    }));
  };

  // Fetch tour data
  useEffect(() => {
    const fetchTour = async () => {
      try {
        // Join the path segments and encode for URL
        const slug = Array.isArray(params.id) ? params.id.join('/') : params.id;
        const encodedSlug = encodeURIComponent(slug);

        const response = await fetch(`/api/tours/${encodedSlug}`);
        if (response.ok) {
          const data = await response.json();
          setTour(data);
          // Set default hotel category if available
          if (data.hotelCategories && data.hotelCategories.length > 0) {
            setSelectedHotelCategory(data.hotelCategories[0]);
          }
        } else {
          router.push("/holidays");
        }
      } catch (error) {
        console.error("Failed to load tour:", error);
        router.push("/holidays");
      } finally {
        setTourLoading(false);
      }
    };
    fetchTour();
  }, [params.id, router]);

  // Fetch refund & cancellation policy and terms & conditions
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        // Fetch both policies in parallel
        const [refundResponse, termsResponse] = await Promise.all([
          fetch("/api/policies/refund_cancellation"),
          fetch("/api/policies/terms_conditions").catch(() => null), // Terms policy might not exist yet
        ]);

        if (refundResponse.ok) {
          const refundData = await refundResponse.json();
          setRefundPolicy(refundData);
          // Use refund policy version as primary (this is what the API validates)
          setPolicyVersion(refundData.version);
        }

        if (termsResponse && termsResponse.ok) {
          const termsData = await termsResponse.json();
          setTermsPolicy(termsData);
        } else {
          // Fallback: fetch static terms content if database doesn't have it
          try {
            const fallbackResponse = await fetch("/api/policies/terms-content");
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              setTermsPolicy(fallbackData);
            }
          } catch (fallbackError) {
            console.error("Failed to load fallback terms content:", fallbackError);
          }
        }
      } catch (error) {
        console.error("Failed to load policies:", error);
      }
    };
    fetchPolicies();
  }, []);

  const requiresPassport = useMemo(() => {
    if (!tour) return false;
    return tour.requiresPassport || (tour.tourType?.toLowerCase() === "international");
  }, [tour]);

  const travellerCount = formData.numberOfAdults + formData.numberOfChildren;
  const travellersLength = formData.travellers.length;

  const handlePassportFileChange = async (travellerIndex: number, file: File | null) => {
    if (!file) return;
    const traveller = formData.travellers[travellerIndex];
    if (!traveller) return;
    const travellerKey = traveller.uid;
    setPassportUploadStatus((prev) => ({
      ...prev,
      [travellerKey]: { uploading: true, error: null },
    }));
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append(
        "travellerName",
        `${traveller.firstName} ${traveller.lastName}`.trim() || `traveller-${travellerIndex + 1}`
      );
      const response = await fetch("/api/bookings/passport-upload", {
        method: "POST",
        body: uploadForm,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to upload passport copy.");
      }
      const result = await response.json();
      updateTraveller(travellerIndex, "passportFileKey", result.key);
      updateTraveller(travellerIndex, "passportFileName", file.name);
      setPassportUploadStatus((prev) => ({
        ...prev,
        [travellerKey]: { uploading: false, error: null },
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload passport copy.";
      setPassportUploadStatus((prev) => ({
        ...prev,
        [travellerKey]: { uploading: false, error: message },
      }));
      setValidationError(message);
      setTimeout(() => setValidationError(null), 5000);
    }
  };

  const handleAadharFileChange = async (travellerIndex: number, file: File | null) => {
    if (!file) return;
    const traveller = formData.travellers[travellerIndex];
    if (!traveller) return;
    const travellerKey = traveller.uid;
    setPassportUploadStatus((prev) => ({
      ...prev,
      [travellerKey]: { uploading: true, error: null },
    }));
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append(
        "travellerName",
        `${traveller.firstName} ${traveller.lastName}`.trim() || `traveller-${travellerIndex + 1}`
      );
      uploadForm.append("documentType", "aadhaar");
      const response = await fetch("/api/bookings/passport-upload", {
        method: "POST",
        body: uploadForm,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to upload Aadhaar document.");
      }
      const result = await response.json();
      updateTraveller(travellerIndex, "aadharFileKey", result.key);
      updateTraveller(travellerIndex, "aadharFileName", file.name);
      setPassportUploadStatus((prev) => ({
        ...prev,
        [travellerKey]: { uploading: false, error: null },
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload Aadhaar document.";
      setPassportUploadStatus((prev) => ({
        ...prev,
        [travellerKey]: { uploading: false, error: message },
      }));
      setValidationError(message);
      setTimeout(() => setValidationError(null), 5000);
    }
  };

  const getPassportExpiryError = useCallback(
    (traveller: TravellerForm) => {
      if (!traveller.passportExpiry) {
        return requiresPassport ? "Passport expiry date is required." : null;
      }
      const expiryDate = new Date(traveller.passportExpiry);
      expiryDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate <= today) {
        return "Passport already expired.";
      }
      if (requiresPassport && formData.travelDate) {
        const travelDate = new Date(formData.travelDate);
        travelDate.setHours(0, 0, 0, 0);
        const minValid = new Date(travelDate);
        minValid.setMonth(minValid.getMonth() + 6);
        if (expiryDate < minValid) {
          return "Passport must be valid for at least 6 months from your travel date.";
        }
      }
      return null;
    },
    [formData.travelDate, requiresPassport]
  );

  const getSelectedAddOnDetails = useCallback(
    (normalizedTravellerCount?: number) => {
      if (!tour?.addOns || tour.addOns.length === 0) return [];
      const travellerTotal = normalizedTravellerCount ?? Math.max(travellerCount, 1);
      return tour.addOns
        .filter((addOn) => addOn.isRequired || addOnSelections[addOn.id]?.selected)
        .map((addOn) => {
          const isPerPerson = addOn.pricingType === "PER_PERSON";
          const state = addOnSelections[addOn.id];
          const quantity = isPerPerson
            ? travellerTotal
            : addOn.isRequired
              ? 1
              : Math.max(1, state?.quantity || 1);
          const unitPrice = addOn.price || 0;
          return {
            id: addOn.id,
            name: addOn.name,
            description: addOn.description,
            pricingType: addOn.pricingType,
            isRequired: addOn.isRequired,
            quantity,
            unitPrice,
            totalPrice: unitPrice * quantity,
          };
        });
    },
    [tour?.addOns, addOnSelections, travellerCount]
  );

  // Calculate pricing with seasonal pricing and add-ons
  const calculatePrice = () => {
    if (!tour) {
      return {
        baseAmount: 0,
        addOnTotal: 0,
        finalAmount: 0,
        advanceAmount: 0,
        remainingAmount: 0,
        subtotal: 0,
        discountAmount: 0,
      };
    }

    const travellerCount = formData.numberOfAdults + formData.numberOfChildren;
    const normalizedTravellerCount = Math.max(travellerCount, 1);

    // Get base price (check seasonal pricing first)
    let basePrice = tour.basePriceInInr ?? tour.price ?? 0;
    if (formData.travelDate && tour.seasonalPricing) {
      const travelDate = new Date(formData.travelDate);
      for (const [seasonName, seasonData] of Object.entries(tour.seasonalPricing || {})) {
        if (seasonData.from && seasonData.to) {
          const fromDate = new Date(seasonData.from);
          const toDate = new Date(seasonData.to);
          if (travelDate >= fromDate && travelDate <= toDate && seasonData.price) {
            basePrice = seasonData.price;
            break;
          }
        }
      }
    }

    // Calculate base amount
    let baseAmount = basePrice * normalizedTravellerCount;

    const selectedAddOnDetails = getSelectedAddOnDetails(normalizedTravellerCount);
    const addOnTotal = selectedAddOnDetails.reduce((sum, detail) => sum + detail.totalPrice, 0);

    // Calculate subtotal before discount
    const subtotal = baseAmount + addOnTotal;

    // Apply promo code discount if applicable
    const discountAmount = appliedPromoCode ? appliedPromoCode.discountAmount / 100 : 0; // Convert from paise to rupees
    const finalAmount = Math.max(0, subtotal - discountAmount);

    const advancePercentage = tour.advancePercentage ?? 0;
    const advanceAmount = formData.paymentType === "advance" && tour.allowAdvance
      ? Math.round(finalAmount * (advancePercentage / 100))
      : finalAmount;
    const remainingAmount = Math.max(finalAmount - advanceAmount, 0);
    return { baseAmount, addOnTotal, finalAmount, advanceAmount, remainingAmount, subtotal, discountAmount };
  };

  const { baseAmount, addOnTotal, finalAmount, advanceAmount, remainingAmount, subtotal, discountAmount } = calculatePrice();
  const selectedAddOnDetails = useMemo(
    () => getSelectedAddOnDetails(),
    [getSelectedAddOnDetails]
  );
  // Auto-fill for logged-in users
  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        primaryContact: {
          ...prev.primaryContact,
          name: session.user?.name || prev.primaryContact.name,
          email: session.user?.email || prev.primaryContact.email,
        },
      }));
    }
  }, [session]);

  // Initialize travellers based on count
  useEffect(() => {
    const totalTravellers = travellerCount;
    const currentCount = travellersLength;

    if (totalTravellers > currentCount) {
      // Add new travellers
      const newTravellers = Array.from({ length: totalTravellers - currentCount }, () => createTravellerEntry());
      setFormData((prev) => ({
        ...prev,
        travellers: [...prev.travellers, ...newTravellers],
      }));
    } else if (totalTravellers < currentCount) {
      // Remove excess travellers
      setFormData((prev) => ({
        ...prev,
        travellers: prev.travellers.slice(0, totalTravellers),
      }));
    }
  }, [travellerCount, travellersLength, createTravellerEntry]);

  // Validate availability and constraints
  const validateStep1 = (): string | null => {
    if (!tour) return "Tour not loaded";

    if (!formData.travelDate) {
      return "Please select a travel date";
    }

    const travelDate = new Date(formData.travelDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if date is in the past
    if (travelDate < today) {
      return "Travel date cannot be in the past";
    }

    // Check booking deadline
    if (tour.bookingDeadline) {
      const deadline = new Date(tour.bookingDeadline);
      if (travelDate <= deadline) {
        return `Booking deadline is ${deadline.toLocaleDateString()}. Please select a date after the deadline.`;
      }
    }

    // Check available dates for fixed departure
    if (tour.packageType === "fixed_departure" && tour.availableDates && tour.availableDates.length > 0) {
      const dateStr = travelDate.toISOString().split("T")[0];
      const isAvailable = tour.availableDates.some((date: string) => {
        const availableDate = new Date(date);
        return availableDate.toISOString().split("T")[0] === dateStr;
      });
      if (!isAvailable) {
        return "Selected date is not available. Please choose from available dates.";
      }
    }

    // Validate traveler count
    const totalTravelers = formData.numberOfAdults + formData.numberOfChildren;
    if (tour.minimumTravelers && totalTravelers < tour.minimumTravelers) {
      return `Minimum ${tour.minimumTravelers} traveler(s) required for this tour`;
    }
    if (tour.maximumTravelers && totalTravelers > tour.maximumTravelers) {
      return `Maximum ${tour.maximumTravelers} traveler(s) allowed for this tour`;
    }

    return null;
  };

  const nextStep = () => {
    setValidationError(null);
    // Validation
    if (currentStep === 1) {
      const error = validateStep1();
      if (error) {
        setValidationError(error);
        setTimeout(() => setValidationError(null), 5000);
        return;
      }
    }

    if (currentStep === 2) {
      if (!formData.primaryContact.name || !formData.primaryContact.email) {
        setValidationError("Please fill in all required contact information");
        setTimeout(() => setValidationError(null), 5000);
        return;
      }
    }

    if (currentStep === 3) {
      if (formData.travellers.length === 0) {
        setValidationError("Please add traveller information");
        setTimeout(() => setValidationError(null), 5000);
        return;
      }
      for (let index = 0; index < formData.travellers.length; index += 1) {
        const traveller = formData.travellers[index];
        if (!traveller.firstName || !traveller.lastName) {
          setValidationError(`Traveller ${index + 1}: Please fill in first and last name.`);
          setTimeout(() => setValidationError(null), 5000);
          return;
        }
        if (!traveller.dateOfBirth) {
          setValidationError(`Traveller ${index + 1}: Date of birth is required.`);
          setTimeout(() => setValidationError(null), 5000);
          return;
        }
        // Validate DOB: must be in the past and at least 1 year old
        const dob = new Date(traveller.dateOfBirth);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dob.setHours(0, 0, 0, 0);
        if (dob >= today) {
          setValidationError(`Traveller ${index + 1}: Date of birth cannot be today or in the future.`);
          setTimeout(() => setValidationError(null), 5000);
          return;
        }
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (dob > oneYearAgo) {
          setValidationError(`Traveller ${index + 1}: Date of birth must be at least 1 year ago.`);
          setTimeout(() => setValidationError(null), 5000);
          return;
        }
        if (requiresPassport) {
          if (!traveller.nationality) {
            setValidationError(`Traveller ${index + 1}: Nationality is required.`);
            setTimeout(() => setValidationError(null), 5000);
            return;
          }
          if (!traveller.passportNumber) {
            setValidationError(`Traveller ${index + 1}: Passport number is required.`);
            setTimeout(() => setValidationError(null), 5000);
            return;
          }
          if (!traveller.passportIssuingCountry) {
            setValidationError(`Traveller ${index + 1}: Passport issuing country is required.`);
            setTimeout(() => setValidationError(null), 5000);
            return;
          }
          if (!traveller.passportFileKey) {
            setValidationError(`Traveller ${index + 1}: Please upload a passport copy.`);
            setTimeout(() => setValidationError(null), 5000);
            return;
          }
        }
        const expiryIssue = getPassportExpiryError(traveller);
        if (expiryIssue) {
          setValidationError(`Traveller ${index + 1}: ${expiryIssue}`);
          setTimeout(() => setValidationError(null), 5000);
          return;
        }
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirmAndPay = async (): Promise<string | null> => {
    setValidationError(null);
    if (bookingId) return bookingId;
    if (!tour) return null;

    if (!formData.travelDate) {
      setValidationError("Please select a travel date");
      setTimeout(() => setValidationError(null), 5000);
      return null;
    }

    if (!formData.primaryContact.name || !formData.primaryContact.email) {
      setValidationError("Please fill in all required contact information");
      setTimeout(() => setValidationError(null), 5000);
      return null;
    }

    if (formData.travellers.length === 0) {
      setValidationError("Please add at least one traveller");
      setTimeout(() => setValidationError(null), 5000);
      return null;
    }

    for (let index = 0; index < formData.travellers.length; index += 1) {
      const traveller = formData.travellers[index];
      if (!traveller.firstName || !traveller.lastName) {
        setValidationError(`Traveller ${index + 1}: Please provide full name.`);
        setTimeout(() => setValidationError(null), 5000);
        return null;
      }
      if (!traveller.dateOfBirth) {
        setValidationError(`Traveller ${index + 1}: Date of birth is required.`);
        setTimeout(() => setValidationError(null), 5000);
        return null;
      }
      // Validate DOB: must be in the past and at least 1 year old
      const dob = new Date(traveller.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dob.setHours(0, 0, 0, 0);
      if (dob >= today) {
        setValidationError(`Traveller ${index + 1}: Date of birth cannot be today or in the future.`);
        setTimeout(() => setValidationError(null), 5000);
        return null;
      }
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (dob > oneYearAgo) {
        setValidationError(`Traveller ${index + 1}: Date of birth must be at least 1 year ago.`);
        setTimeout(() => setValidationError(null), 5000);
        return null;
      }
      if (requiresPassport) {
        if (!traveller.nationality || !traveller.passportNumber || !traveller.passportIssuingCountry) {
          setValidationError(`Traveller ${index + 1}: Complete passport details are required.`);
          setTimeout(() => setValidationError(null), 5000);
          return null;
        }
        if (!traveller.passportFileKey) {
          setValidationError(`Traveller ${index + 1}: Please upload the passport copy.`);
          setTimeout(() => setValidationError(null), 5000);
          return null;
        }
      }
      const expiryIssue = getPassportExpiryError(traveller);
      if (expiryIssue) {
        setValidationError(`Traveller ${index + 1}: ${expiryIssue}`);
        setTimeout(() => setValidationError(null), 5000);
        return null;
      }
    }

    if (!session) {
      const slug = Array.isArray(params.id) ? params.id.join('/') : params.id;
      const encodedSlug = encodeURIComponent(slug);
      router.push(
        `/signup?email=${encodeURIComponent(formData.primaryContact.email || "")}&redirect=/book/holiday/${encodedSlug}`
      );
      return null;
    }

    if (!formData.policyAccepted) {
      setPolicyError("Please review and accept our Terms & Conditions and Refund & Cancellation Policy to proceed with booking.");
      return null;
    }

    setLoading(true);
    setBookingCreationError(null);
    try {
      const selectedAddOnsPayload =
        tour.addOns
          ?.filter((addOn) => !addOn.isRequired && addOnSelections[addOn.id]?.selected)
          .map((addOn) => ({
            addOnId: addOn.id,
            quantity:
              addOn.pricingType === "PER_PERSON"
                ? Math.max(travellerCount, 1)
                : Math.max(1, addOnSelections[addOn.id]?.quantity || 1),
          })) ?? [];

      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: tour.id,
          tourName: tour.name,
          tourPrice: finalAmount,
          promoCodeId: appliedPromoCode?.id,
          discountAmount: appliedPromoCode ? Math.round(appliedPromoCode.discountAmount) : 0,
          advancePercentage: tour.advancePercentage ?? null,
          travelDate: formData.travelDate,
          numberOfAdults: formData.numberOfAdults,
          numberOfChildren: formData.numberOfChildren ?? 0,
          paymentType: formData.paymentType,
          primaryContact: {
            name: formData.primaryContact.name,
            email: formData.primaryContact.email,
            phone: formData.primaryContact.phone || null,
          },
          travellers: formData.travellers.map((t) => ({
            firstName: t.firstName,
            lastName: t.lastName,
            age: t.age || "",
            dateOfBirth: t.dateOfBirth,
            gender: t.gender || null,
            nationality: t.nationality || null,
            passportNumber: t.passportNumber || null,
            passportExpiry: t.passportExpiry || null,
            passportIssuingCountry: t.passportIssuingCountry || null,
            passportFileKey: t.passportFileKey || null,
            passportFileName: t.passportFileName || null,
            panNumber: t.panNumber || null,
            aadharFileKey: t.aadharFileKey || null,
          })),
          selectedAddOns: selectedAddOnsPayload,
          preferences: formData.preferences,
          policyAccepted: formData.policyAccepted,
          policyVersion: policyVersion || null,
          hotelCategory: selectedHotelCategory || null,
          customisations: formData.isCustomisedPackage ? {
            isCustomisedPackage: true,
            customRequestNotes: formData.customRequestNotes,
            customBasePrice: formData.customBasePrice ? parseFloat(formData.customBasePrice) : null,
            customAddOnsPrice: formData.customAddOnsPrice ? parseFloat(formData.customAddOnsPrice) : null,
            customDiscount: formData.customDiscount ? parseFloat(formData.customDiscount) : null,
          } : null,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create booking. Please try again.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          if (errorData.details && Array.isArray(errorData.details)) {
            const detailMessages = errorData.details.map(
              (detail: { field?: string; message?: string }) =>
                detail.message || detail.field || "Invalid input"
            );
            errorMessage = `${errorMessage}\n${detailMessages.join("\n")}`;
          }
        } catch {
          const text = await response.text().catch(() => "");
          if (text) errorMessage = text;
        }
        setBookingCreationError(errorMessage);
        return null;
      }

      const data = await response.json();
      setBookingId(data.bookingId);
      return data.bookingId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred while creating the booking.";
      setBookingCreationError(message);
      console.error("Error creating booking:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!formData.policyAccepted) {
      setPolicyError("Please review and accept our Terms & Conditions and Refund & Cancellation Policy to proceed with booking.");
      return;
    }

    if (!session) {
      alert("Please login to proceed with payment");
      const slug = Array.isArray(params.id) ? params.id.join('/') : params.id;
      const encodedSlug = encodeURIComponent(slug);
      router.push(`/login?redirect=/book/holiday/${encodedSlug}`);
      return;
    }

    setPolicyError(null);

    const ensuredBookingId = bookingId || (await handleConfirmAndPay());
    if (!ensuredBookingId) {
      return;
    }

    setLoading(true);
    try {
      const amount = formData.paymentType === "full" ? finalAmount : advanceAmount;
      const discountAmountInPaise = appliedPromoCode?.discountAmount || 0;
      const amountInPaise = Math.round(amount * 100);

      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInPaise,
          bookingId: ensuredBookingId,
          paymentType: formData.paymentType,
          promoCodeId: appliedPromoCode?.id,
          discountAmount: discountAmountInPaise > 0 ? discountAmountInPaise : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Unable to initiate payment.");
      }

      const responseData = await response.json();

      // Handle free bookings (amount <= 0)
      if (responseData.isFree || amount <= 0) {
        setLoading(false);
        router.push(`/bookings/thank-you?bookingId=${ensuredBookingId}`);
        return;
      }

      // Normal payment flow - proceed with Razorpay
      const { orderId, keyId, amount: orderAmount, currency } = responseData;
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay SDK.");
      }

      const options = {
        key: keyId,
        amount: orderAmount,
        currency,
        name: "Travunited",
        description: `${tour?.name || "Tour booking"}`,
        order_id: orderId,
        prefill: {
          name: formData.primaryContact.name,
          email: formData.primaryContact.email,
          contact: formData.primaryContact.phone || "",
        },
        notes: {
          bookingId: ensuredBookingId,
          paymentType: formData.paymentType,
        },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: ensuredBookingId,
              }),
            });

            if (verifyResponse.ok) {
              setLoading(false);
              router.push(`/bookings/thank-you?bookingId=${ensuredBookingId}`);
            } else {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || "Payment verification failed");
            }
          } catch (error: unknown) {
            console.error("Payment verification error:", error);
            setLoading(false);
            setValidationError(error instanceof Error ? error.message : "Payment verification failed. Please contact support if payment was deducted.");
            setTimeout(() => setValidationError(null), 5000);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            console.log("Payment modal dismissed");
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (response: { error: { code: string; description: string; source: string; step: string; reason: string; metadata: { order_id: string; payment_id: string } } }) => {
        console.error("Payment failed:", response);
        setLoading(false);
        const errorMessage =
          response.error?.description || response.error?.reason || "Payment failed. Please try again.";
        setValidationError(errorMessage);
        setTimeout(() => setValidationError(null), 5000);
      });

      razorpay.open();
    } catch (error) {
      console.error(error);
      setLoading(false);
      setValidationError(error instanceof Error ? error.message : "Unable to process payment. Please try again.");
      setTimeout(() => setValidationError(null), 5000);
    }
  };

  const handleProceedToPaymentStep = () => {
    setPolicyError(null);
    setCurrentStep(5);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        if (!tour) {
          return (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
              <p className="mt-4 text-neutral-600">Loading tour details...</p>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Select Tour & Travel Date</h2>
            <div className="bg-neutral-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-lg mb-2">{tour.name}</h3>
              <p className="text-neutral-600 mb-4">
                Starting from ₹{(tour.basePriceInInr ?? tour.price ?? 0).toLocaleString()} per person
                {tour.originalPrice && tour.originalPrice > (tour.basePriceInInr ?? tour.price ?? 0) && (
                  <span className="ml-2 text-neutral-500 line-through">
                    ₹{tour.originalPrice.toLocaleString()}
                  </span>
                )}
              </p>
            </div>
            <div className="space-y-4">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Select Travel Date *
                </label>
                {tour.packageType === "fixed_departure" && tour.availableDates && tour.availableDates.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {tour.availableDates.map((dateStr: string) => {
                        const date = new Date(dateStr);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isPast = date < today;
                        const isSelected = formData.travelDate === dateStr;
                        const isPastDeadline = tour.bookingDeadline ? date <= new Date(tour.bookingDeadline) : false;
                        const isDisabled = isPast || isPastDeadline;

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => !isDisabled && setFormData({ ...formData, travelDate: dateStr })}
                            className={`p-3 border rounded-lg text-sm text-left transition-colors ${isSelected
                                ? "bg-primary-600 text-white border-primary-600"
                                : isDisabled
                                  ? "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed"
                                  : "bg-white text-neutral-700 border-neutral-300 hover:border-primary-500"
                              }`}
                          >
                            <div className="font-medium">
                              {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                            <div className="text-xs opacity-75">
                              {date.toLocaleDateString("en-US", { year: "numeric" })}
                            </div>
                            {isPast && <div className="text-xs mt-1">Past</div>}
                            {isPastDeadline && <div className="text-xs mt-1">Closed</div>}
                          </button>
                        );
                      })}
                    </div>
                    {tour.bookingDeadline && (
                      <p className="text-xs text-neutral-500 mt-2">
                        Booking closes {new Date(tour.bookingDeadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <input
                    type="date"
                    required
                    value={formData.travelDate}
                    onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                )}
              </div>

              {/* Travelers */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Number of Adults *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => {
                          const next = Math.max(1, prev.numberOfAdults - 1);
                          return { ...prev, numberOfAdults: next };
                        })
                      }
                      className="p-3 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                      aria-label="Decrease adults"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.numberOfAdults}
                      onChange={(e) => setFormData({ ...formData, numberOfAdults: parseInt(e.target.value) || 1 })}
                      className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-center"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => {
                          const maxAdults = tour?.maximumTravelers
                            ? Math.max(1, tour.maximumTravelers - prev.numberOfChildren)
                            : undefined;
                          const next = prev.numberOfAdults + 1;
                          const capped = maxAdults ? Math.min(next, maxAdults) : next;
                          return { ...prev, numberOfAdults: capped };
                        })
                      }
                      className="p-3 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                      aria-label="Increase adults"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500 mt-1">
                    {tour.minimumTravelers && (
                      <span>Minimum: {tour.minimumTravelers} traveler(s)</span>
                    )}
                    {tour.maximumTravelers && (
                      <span>Max: {tour.maximumTravelers} traveler(s)</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Number of Children
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => {
                          const next = Math.max(0, prev.numberOfChildren - 1);
                          return { ...prev, numberOfChildren: next };
                        })
                      }
                      className="p-3 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                      aria-label="Decrease children"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={formData.numberOfChildren}
                      onChange={(e) => setFormData({ ...formData, numberOfChildren: parseInt(e.target.value) || 0 })}
                      className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-center"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => {
                          const maxChildren = tour?.maximumTravelers
                            ? Math.max(0, tour.maximumTravelers - prev.numberOfAdults)
                            : undefined;
                          const next = prev.numberOfChildren + 1;
                          const capped = maxChildren ? Math.min(next, maxChildren) : next;
                          return { ...prev, numberOfChildren: capped };
                        })
                      }
                      className="p-3 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                      aria-label="Increase children"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {tour.maximumTravelers && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Maximum combined travelers: {tour.maximumTravelers}
                    </p>
                  )}
                </div>
              </div>

              {/* Hotel Categories */}
              {tour.hotelCategories && tour.hotelCategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Hotel Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tour.hotelCategories.map((category: string) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedHotelCategory(category)}
                        className={`px-4 py-2 border rounded-lg text-sm transition-colors ${selectedHotelCategory === category
                            ? "bg-primary-600 text-white border-primary-600"
                            : "bg-white text-neutral-700 border-neutral-300 hover:border-primary-500"
                          }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-ons & Customization */}
              {tour.addOns && tour.addOns.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Customise this package
                      </label>
                      <p className="text-sm text-neutral-600">
                        Choose from optional upgrades and add-ons. Required items are pre-selected.
                      </p>
                    </div>
                    <ShieldCheck size={18} className="text-primary-600" />
                  </div>
                  <div className="space-y-3">
                    {tour.addOns.map((addOn) => {
                      const isPerPerson = addOn.pricingType === "PER_PERSON";
                      const state = addOnSelections[addOn.id];
                      const isSelected = addOn.isRequired || state?.selected;
                      const quantity = isPerPerson
                        ? travellerCount || 1
                        : state?.quantity || 1;
                      return (
                        <div
                          key={addOn.id}
                          className="border border-neutral-200 rounded-lg p-4 bg-white shadow-sm"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="font-semibold text-neutral-900">{addOn.name}</p>
                              {addOn.description && (
                                <p className="text-sm text-neutral-600 mt-1">{addOn.description}</p>
                              )}
                              <p className="text-sm text-primary-600 mt-2">
                                ₹{(addOn.price || 0).toLocaleString()}{" "}
                                {isPerPerson ? "per traveller" : "per booking"}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {addOn.isRequired ? (
                                <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
                                  Required
                                </span>
                              ) : (
                                <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => toggleAddOnSelection(addOn.id, e.target.checked)}
                                    className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  Add
                                </label>
                              )}
                              {!isPerPerson && isSelected && (
                                <div className="flex items-center border border-neutral-300 rounded-lg">
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-neutral-600 hover:text-neutral-900"
                                    onClick={() => updateAddOnQuantity(addOn.id, Math.max(1, quantity - 1))}
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="px-3 text-sm font-medium text-neutral-900">{quantity}</span>
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-neutral-600 hover:text-neutral-900"
                                    onClick={() => updateAddOnQuantity(addOn.id, quantity + 1)}
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-700">Total travellers:</span>
                    <span className="font-medium">{travellerCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-700">Base price:</span>
                    <span className="font-medium">₹{baseAmount.toLocaleString()}</span>
                  </div>
                  {addOnTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-700">Add-ons:</span>
                      <span className="font-medium">+₹{addOnTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-blue-300 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-neutral-900">Total Amount:</span>
                      <span className="font-bold text-lg text-primary-600">
                        ₹{finalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Primary Contact Information</h2>
            <p className="text-neutral-600 mb-6">
              This person will be the main contact for this booking.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.primaryContact.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryContact: { ...formData.primaryContact, name: e.target.value },
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
                  value={formData.primaryContact.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryContact: { ...formData.primaryContact, email: e.target.value },
                    })
                  }
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.primaryContact.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryContact: { ...formData.primaryContact, phone: e.target.value },
                    })
                  }
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="+91 1234567890"
                />
              </div>
            </div>
            <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Preferences (Optional)</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Share dietary, language, or driver preferences so we can personalize your trip.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Food Preference
                  </label>
                  <select
                    value={formData.preferences.foodPreference}
                    onChange={(e) => updatePreference("foodPreference", e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                  >
                    <option value="">No preference</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="non-vegetarian">Non-vegetarian</option>
                    <option value="jain">Jain</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Food Notes
                  </label>
                  <input
                    type="text"
                    value={formData.preferences.foodPreferenceNotes}
                    onChange={(e) => updatePreference("foodPreferenceNotes", e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                    placeholder="Allergies, spice level, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Language Preference
                  </label>
                  <select
                    value={formData.preferences.languagePreference}
                    onChange={(e) => updatePreference("languagePreference", e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                  >
                    <option value="">No preference</option>
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                    <option value="kannada">Kannada</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {formData.preferences.languagePreference === "other" && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Preferred Language
                    </label>
                    <input
                      type="text"
                      value={formData.preferences.languagePreferenceOther}
                      onChange={(e) => updatePreference("languagePreferenceOther", e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                      placeholder="Specify language"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Driver Preference
                  </label>
                  <input
                    type="text"
                    value={formData.preferences.driverPreference}
                    onChange={(e) => updatePreference("driverPreference", e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                    placeholder="Driver who speaks..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Any other requests
                  </label>
                  <textarea
                    value={formData.preferences.specialRequests}
                    onChange={(e) => updatePreference("specialRequests", e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                    rows={3}
                    placeholder="Share any other notes or requirements."
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Traveller Information</h2>
            <p className="text-neutral-600 mb-6">
              Provide traveller details exactly as they appear on the passport.
              {requiresPassport
                ? " Passport fields and document uploads are required for this tour."
                : " Passport details are optional for this tour but recommended for faster processing."}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Infants (under 1 year, including 5-6 month old babies) and children (under {tour?.childAgeLimit || 12} years) are welcome to travel with their parents. Age is automatically calculated from date of birth.
              </p>
            </div>
            <div className="space-y-4">
              {formData.travellers.map((traveller, index) => {
                const travellerKey = traveller.uid || `traveller-${index}`;
                const expiryIssue = getPassportExpiryError(traveller);
                const uploadState = passportUploadStatus[travellerKey];
                return (
                  <div key={travellerKey} className="border border-neutral-200 rounded-lg p-4 space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-neutral-900">Traveller {index + 1}</h3>
                        {getTravellerTypeBadge(traveller) && (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTravellerTypeBadge(traveller)?.color}`}>
                            {getTravellerTypeBadge(traveller)?.label}
                          </span>
                        )}
                      </div>
                      {requiresPassport && (
                        <span className="text-xs font-medium text-primary-600 flex items-center gap-1">
                          <ShieldCheck size={14} />
                          Passport mandatory
                        </span>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={traveller.firstName}
                          onChange={(e) => updateTraveller(index, "firstName", e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={traveller.lastName}
                          onChange={(e) => updateTraveller(index, "lastName", e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          value={traveller.dateOfBirth}
                          onChange={(e) => updateTraveller(index, "dateOfBirth", e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Age (optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={traveller.age}
                          onChange={(e) => updateTraveller(index, "age", e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                          placeholder="Enter age in years (e.g., 0.5 for 6 months)"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          For infants, enter fractional age (e.g., 0.5 for 6 months, 0.4 for 5 months)
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                          Gender
                        </label>
                        <select
                          value={traveller.gender || ""}
                          onChange={(e) => updateTraveller(index, "gender", e.target.value)}
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
                          Nationality {requiresPassport && "*"}
                        </label>
                        <input
                          type="text"
                          value={traveller.nationality}
                          onChange={(e) => updateTraveller(index, "nationality", e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                          placeholder="Indian"
                        />
                      </div>
                    </div>

                    {(() => {
                      const isIndian = (traveller.nationality || "").toLowerCase().trim() === "india" ||
                        (traveller.nationality || "").toLowerCase().trim() === "indian";
                      const showPassport = requiresPassport || !isIndian;
                      // Show Indian docs (PAN/Aadhaar) for all Indian travellers, regardless of tour type
                      const showIndianDocs = isIndian;

                      return (
                        <div className="space-y-4">
                          {/* Passport section - show if tour requires passport OR traveller is not Indian */}
                          {showPassport && (
                            <div className="border border-dashed border-neutral-200 rounded-lg p-4 bg-neutral-50">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h4 className="font-medium text-neutral-900">Passport details</h4>
                                  <p className="text-sm text-neutral-600">
                                    {requiresPassport
                                      ? "All fields below are required for international tours."
                                      : isIndian
                                        ? "Passport required for non-Indian travellers."
                                        : "Passport details are required for non-Indian travellers."}
                                  </p>
                                </div>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Passport Number {requiresPassport && "*"}
                                  </label>
                                  <input
                                    type="text"
                                    value={traveller.passportNumber}
                                    onChange={(e) => updateTraveller(index, "passportNumber", e.target.value.toUpperCase())}
                                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg uppercase"
                                    maxLength={20}
                                    placeholder="Enter passport number"
                                    required={requiresPassport || !isIndian}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Issuing Country {requiresPassport && "*"}
                                  </label>
                                  <input
                                    type="text"
                                    value={traveller.passportIssuingCountry}
                                    onChange={(e) => updateTraveller(index, "passportIssuingCountry", e.target.value)}
                                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                                    placeholder="India"
                                    required={requiresPassport || !isIndian}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Passport Expiry {requiresPassport && "*"}
                                  </label>
                                  <input
                                    type="date"
                                    value={traveller.passportExpiry}
                                    onChange={(e) => updateTraveller(index, "passportExpiry", e.target.value)}
                                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                                    required={requiresPassport || !isIndian}
                                  />
                                  {expiryIssue && (
                                    <p className="text-sm text-red-600 mt-1">{expiryIssue}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Passport Copy {requiresPassport && "*"}
                                  </label>
                                  <input
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={(e) => handlePassportFileChange(index, e.target.files?.[0] || null)}
                                    className="w-full text-sm text-neutral-600"
                                    required={requiresPassport || !isIndian}
                                  />
                                  <div className="text-xs mt-1 text-neutral-500">
                                    Accepted: PDF, JPG, PNG up to 10MB
                                  </div>
                                  {uploadState?.uploading && (
                                    <p className="text-sm text-primary-600 mt-1 flex items-center gap-1">
                                      <Upload size={14} className="animate-spin" />
                                      Uploading...
                                    </p>
                                  )}
                                  {traveller.passportFileName && !uploadState?.uploading && (
                                    <p className="text-sm text-green-600 mt-1">
                                      Uploaded: {traveller.passportFileName}
                                    </p>
                                  )}
                                  {uploadState?.error && (
                                    <p className="text-sm text-red-600 mt-1">{uploadState.error}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Indian ID Documents section - show for all Indian travellers */}
                          {showIndianDocs && (
                            <div className="border border-dashed border-neutral-200 rounded-lg p-4 bg-neutral-50">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h4 className="font-medium text-neutral-900">Indian ID Documents</h4>
                                  <p className="text-sm text-neutral-600">
                                    {requiresPassport
                                      ? "PAN and Aadhaar are recommended for Indian travellers (in addition to passport)."
                                      : "PAN and Aadhaar are required for Indian travellers on domestic tours."}
                                  </p>
                                </div>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    PAN Number *
                                  </label>
                                  <input
                                    type="text"
                                    value={traveller.panNumber || ""}
                                    onChange={(e) => updateTraveller(index, "panNumber", e.target.value.toUpperCase())}
                                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg uppercase"
                                    maxLength={10}
                                    placeholder="ABCDE1234F"
                                    required
                                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                                  />
                                  <div className="text-xs mt-1 text-neutral-500">
                                    Format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Aadhaar Document *
                                  </label>
                                  <input
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={(e) => handleAadharFileChange(index, e.target.files?.[0] || null)}
                                    className="w-full text-sm text-neutral-600"
                                    required
                                  />
                                  <div className="text-xs mt-1 text-neutral-500">
                                    Accepted: PDF, JPG, PNG up to 10MB
                                  </div>
                                  {uploadState?.uploading && (
                                    <p className="text-sm text-primary-600 mt-1 flex items-center gap-1">
                                      <Upload size={14} className="animate-spin" />
                                      Uploading...
                                    </p>
                                  )}
                                  {traveller.aadharFileName && !uploadState?.uploading && (
                                    <p className="text-sm text-green-600 mt-1">
                                      Uploaded: {traveller.aadharFileName}
                                    </p>
                                  )}
                                  {uploadState?.error && (
                                    <p className="text-sm text-red-600 mt-1">{uploadState.error}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Review & Confirm</h2>
            <p className="text-neutral-600 mb-6">
              Please review all information carefully. You can go back to edit any section.
            </p>
            {bookingCreationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {bookingCreationError}
              </div>
            )}

            <div className="space-y-4">
              {/* Tour Details */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Tour Details</h3>
                <p>{tour?.name || "Tour"}</p>
                <p className="text-sm text-neutral-600">
                  Travel Date: {formatDate(formData.travelDate)}
                </p>
                <p className="text-sm text-neutral-600">
                  Travellers: {travellerCount} ({formData.numberOfAdults} adults, {formData.numberOfChildren} children)
                </p>
              </div>

              {/* Primary Contact */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Primary Contact</h3>
                <p>{formData.primaryContact.name}</p>
                <p className="text-sm text-neutral-600">{formData.primaryContact.email}</p>
                {formData.primaryContact.phone && (
                  <p className="text-sm text-neutral-600">{formData.primaryContact.phone}</p>
                )}
              </div>

              {/* Travellers */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Travellers</h3>
                {formData.travellers.map((t, i) => (
                  <p key={i} className="text-sm">
                    {i + 1}. {t.firstName} {t.lastName} {t.age && `(Age: ${t.age})`}
                  </p>
                ))}
              </div>

              {/* Selected Add-ons */}
              {selectedAddOnDetails.length > 0 && (
                <div className="bg-neutral-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Add-ons & Upgrades</h3>
                  <ul className="space-y-1 text-sm text-neutral-700">
                    {selectedAddOnDetails.map((item) => (
                      <li key={item.id} className="flex justify-between">
                        <span>
                          {item.name}
                          {item.quantity > 1 && ` × ${item.quantity}`}
                          {item.isRequired && <span className="ml-2 text-xs text-primary-600">(Required)</span>}
                        </span>
                        <span className="font-medium">₹{item.totalPrice.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preferences */}
              {Object.values(formData.preferences).some((value) => Boolean(value)) && (
                <div className="bg-neutral-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Preferences</h3>
                  <div className="text-sm text-neutral-700 space-y-1">
                    {formData.preferences.foodPreference && (
                      <p>Food: {formData.preferences.foodPreference}</p>
                    )}
                    {formData.preferences.foodPreferenceNotes && (
                      <p>Food notes: {formData.preferences.foodPreferenceNotes}</p>
                    )}
                    {formData.preferences.languagePreference && (
                      <p>
                        Language:{" "}
                        {formData.preferences.languagePreference === "other"
                          ? formData.preferences.languagePreferenceOther || "Other"
                          : formData.preferences.languagePreference}
                      </p>
                    )}
                    {formData.preferences.driverPreference && (
                      <p>Driver: {formData.preferences.driverPreference}</p>
                    )}
                    {formData.preferences.specialRequests && (
                      <p>Other requests: {formData.preferences.specialRequests}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Promo Code */}
              {session && (
                <div className="bg-white rounded-lg p-4 border border-neutral-200">
                  <PromoCodeInput
                    onApply={async (code) => {
                      // Recalculate to get current subtotal
                      const { subtotal: currentSubtotal } = calculatePrice();
                      // Use subtotal (before discount) for validation
                      const baseAmountInPaise = Math.round(currentSubtotal * 100);
                      const response = await fetch("/api/promo-codes/validate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          code,
                          amount: baseAmountInPaise,
                          type: "tour",
                          tourId: tour?.id,
                          countryId: tour?.countryId || undefined,
                        }),
                      });

                      const result = await response.json();

                      if (result.valid && result.promoCode) {
                        setAppliedPromoCode({
                          id: result.promoCode.id,
                          code: result.promoCode.code,
                          discountAmount: result.discountAmount || 0, // Already in paise
                          message: result.message,
                        });
                      }

                      return result;
                    }}
                    appliedCode={appliedPromoCode ? {
                      code: appliedPromoCode.code,
                      discountAmount: appliedPromoCode.discountAmount / 100, // Convert to rupees for display
                      message: appliedPromoCode.message,
                    } : null}
                    onRemove={() => setAppliedPromoCode(null)}
                  />
                </div>
              )}

              {/* Price Summary */}
              <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                {discountAmount > 0 && appliedPromoCode && (
                  <div className="mb-3 pb-3 border-b border-primary-200">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-neutral-700">Base Price</span>
                      <span className="text-neutral-900">₹{baseAmount.toLocaleString()}</span>
                    </div>
                    {addOnTotal > 0 && (
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-neutral-700">Add-ons</span>
                        <span className="text-neutral-900">₹{addOnTotal.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-neutral-700">Subtotal</span>
                      <span className="text-neutral-900">₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-700">Discount ({appliedPromoCode.code})</span>
                      <span className="text-green-700 font-medium">-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-neutral-900">Total Amount</span>
                  <span className="text-2xl font-bold text-primary-600">
                    ₹{finalAmount.toLocaleString()}
                  </span>
                </div>
                {addOnTotal > 0 && discountAmount === 0 && (
                  <div className="text-xs text-neutral-600 mt-1">
                    Base: ₹{baseAmount.toLocaleString()} + Add-ons: ₹{addOnTotal.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Payment Option */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold mb-4">Payment Option</h3>
                <div className="space-y-3">
                  <label className="flex items-start p-4 border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-primary-600 transition-colors">
                    <input
                      type="radio"
                      name="paymentType"
                      value="full"
                      checked={formData.paymentType === "full"}
                      onChange={(e) => setFormData({ ...formData, paymentType: "full" })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900">Full Payment</div>
                      <div className="text-sm text-neutral-600">Pay the complete amount now</div>
                      <div className="text-lg font-bold text-primary-600 mt-1">
                        ₹{baseAmount.toLocaleString()}
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start p-4 border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-primary-600 transition-colors">
                    <input
                      type="radio"
                      name="paymentType"
                      value="advance"
                      checked={formData.paymentType === "advance"}
                      onChange={(e) => setFormData({ ...formData, paymentType: "advance" })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900">Advance Payment</div>
                      <div className="text-sm text-neutral-600">
                        Pay {tour?.advancePercentage ?? 0}% now, remaining before departure
                      </div>
                      <div className="text-lg font-bold text-primary-600 mt-1">
                        ₹{advanceAmount.toLocaleString()} now
                      </div>
                      <div className="text-sm text-neutral-600 mt-1">
                        Remaining: ₹{remainingAmount.toLocaleString()}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Policy Reminder */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Refund & Cancellation Policy</h3>
                <p className="text-sm text-neutral-700 whitespace-pre-line max-h-32 overflow-y-auto">
                  {tour?.bookingPolicies
                    ? tour.bookingPolicies
                    : "Please review the tour's refund & cancellation policy on the previous step."}
                </p>
                <p className="text-xs text-neutral-500 mt-2">
                  You will need to accept the policy before completing your payment.
                </p>
              </div>
            </div>
          </div>
        );

      case 5:
        const paymentFinalAmount = formData.paymentType === "full" ? finalAmount : advanceAmount;
        const isFreeBooking = paymentFinalAmount <= 0;

        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              {isFreeBooking ? "Signup/Login & Confirm Booking" : "Signup/Login & Payment"}
            </h2>

            {!session ? (
              <div className="bg-neutral-50 rounded-lg p-6 space-y-4">
                <p className="text-neutral-700">
                  Please create an account or login to {isFreeBooking ? "complete your booking" : "complete your payment"}.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Link
                    href={`/signup?email=${encodeURIComponent(formData.primaryContact.email || "")}`}
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
                {bookingCreationError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {bookingCreationError}
                  </div>
                )}
                <div className="bg-neutral-50 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">
                      {formData.paymentType === "full" ? "Total Amount" : "Advance Amount"}
                    </span>
                    <span className="text-2xl font-bold text-primary-600">
                      {isFreeBooking ? "₹0" : `₹${paymentFinalAmount.toLocaleString()}`}
                    </span>
                  </div>
                  {isFreeBooking ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <p className="text-green-700 font-medium">
                        This package is free to book — no payment required. Click Confirm Booking to complete your reservation.
                      </p>
                    </div>
                  ) : (
                    <>
                      {formData.paymentType === "advance" && (
                        <p className="text-sm text-neutral-600 mb-4">
                          Remaining balance of ₹{Math.max(finalAmount - paymentFinalAmount, 0).toLocaleString()} due before departure.
                        </p>
                      )}
                      <p className="text-sm text-neutral-600 mb-6">
                        Secure payment via Razorpay. All major cards, UPI, and net banking accepted.
                      </p>
                    </>
                  )}
                  <div className="border border-neutral-200 rounded-lg p-4 bg-white mb-6">
                    <TermsAndPolicy
                      termsPolicyHtml={termsPolicy?.content}
                      termsPolicyUrl={!termsPolicy?.content ? "/terms" : undefined}
                      refundPolicyHtml={refundPolicy?.content}
                      refundPolicyUrl={!refundPolicy?.content ? "/refund" : undefined}
                      termsPolicyVersion={termsPolicy?.version}
                      refundPolicyVersion={refundPolicy?.version}
                      required={true}
                      value={formData.policyAccepted}
                      onChange={(accepted) => {
                        setFormData((prev) => ({ ...prev, policyAccepted: accepted }));
                        setPolicyError(null);
                      }}
                      error={policyError || undefined}
                    />
                  </div>
                  <button
                    onClick={handlePayment}
                    disabled={loading || !formData.policyAccepted}
                    className="w-full bg-primary-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? "Processing..."
                      : isFreeBooking
                        ? "Confirm Booking"
                        : "Proceed to Payment"}
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
            href={`/holidays/${Array.isArray(params.id) ? params.id.join('/') : params.id}`}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            ← Back to Holiday Details
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Messages */}
        {(validationError || bookingCreationError) && (
          <div className="mb-6 rounded-lg p-4 flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700">
            <AlertCircle size={20} className="flex-shrink-0" />
            <span className="text-sm font-medium flex-1">{validationError || bookingCreationError}</span>
            <button
              onClick={() => {
                setValidationError(null);
                setBookingCreationError(null);
              }}
              className="text-current opacity-70 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

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
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted
                          ? "bg-green-500 text-white"
                          : isActive
                            ? "bg-primary-600 text-white"
                            : "bg-neutral-200 text-neutral-600"
                        }`}
                    >
                      {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium text-center ${isActive ? "text-primary-600" : "text-neutral-600"
                        }`}
                    >
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${isCompleted ? "bg-green-500" : "bg-neutral-200"
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
              onClick={handleProceedToPaymentStep}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Continue to Payment</span>
              <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

