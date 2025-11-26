"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Users, Plus, X, CheckCircle, AlertCircle } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { formatDate } from "@/lib/dateFormat";

type TravellerForm = {
  uid: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  passportIssuingCountry: string;
  email: string;
  phone: string;
};

interface Tour {
  id: string;
  name: string;
  price: number;
  basePriceInInr?: number | null;
  advancePercentage?: number | null;
  allowAdvance?: boolean | null;
}

const generateUID = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function ManualBookingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>("");
  const [travelDate, setTravelDate] = useState<string>("");
  const [travellers, setTravellers] = useState<TravellerForm[]>([
    {
      uid: generateUID(),
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      nationality: "",
      passportNumber: "",
      passportExpiry: "",
      passportIssuingCountry: "",
      email: "",
      phone: "",
    },
  ]);
  const [primaryContact, setPrimaryContact] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [preferences, setPreferences] = useState({
    foodPreference: "",
    foodPreferenceNotes: "",
    languagePreference: "",
    languagePreferenceOther: "",
    driverPreference: "",
    specialRequests: "",
  });
  const [paymentMode, setPaymentMode] = useState<"pay_later" | "offline">("pay_later");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const isAdmin = session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        router.push("/dashboard");
      }
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const response = await fetch("/api/admin/content/tours");
        if (response.ok) {
          const data = await response.json();
          setTours(data.filter((tour: any) => tour.isActive && tour.status === "active"));
        }
      } catch (error) {
        console.error("Error fetching tours:", error);
      }
    };
    fetchTours();
  }, []);

  const addTraveller = () => {
    setTravellers([
      ...travellers,
      {
        uid: generateUID(),
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        nationality: "",
        passportNumber: "",
        passportExpiry: "",
        passportIssuingCountry: "",
        email: "",
        phone: "",
      },
    ]);
  };

  const removeTraveller = (uid: string) => {
    if (travellers.length > 1) {
      setTravellers(travellers.filter((t) => t.uid !== uid));
    }
  };

  const updateTraveller = (uid: string, field: keyof TravellerForm, value: string) => {
    setTravellers(
      travellers.map((t) => (t.uid === uid ? { ...t, [field]: value } : t))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!selectedTourId) {
      setError("Please select a tour");
      return;
    }
    if (!travelDate) {
      setError("Please select a travel date");
      return;
    }
    if (!primaryContact.name || !primaryContact.email) {
      setError("Primary contact name and email are required");
      return;
    }
    if (travellers.some((t) => !t.firstName || !t.lastName)) {
      setError("All travellers must have first and last name");
      return;
    }

    setLoading(true);
    try {
      const selectedTour = tours.find((t) => t.id === selectedTourId);
      if (!selectedTour) {
        throw new Error("Selected tour not found");
      }

      const basePrice = selectedTour.basePriceInInr || selectedTour.price || 0;
      const totalAmount = basePrice * travellers.length;

      const response = await fetch("/api/admin/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: selectedTourId,
          tourName: selectedTour.name,
          travelDate,
          numberOfAdults: travellers.length,
          numberOfChildren: 0,
          paymentType: "full",
          tourPrice: basePrice,
          primaryContact,
          travellers: travellers.map((t) => ({
            firstName: t.firstName,
            lastName: t.lastName,
            dateOfBirth: t.dateOfBirth || null,
            gender: t.gender || null,
            nationality: t.nationality || null,
            passportNumber: t.passportNumber || null,
            passportExpiry: t.passportExpiry || null,
            passportIssuingCountry: t.passportIssuingCountry || null,
          })),
          preferences,
          policyAccepted: true,
          paymentMode, // "pay_later" or "offline"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create booking");
      }

      const booking = await response.json();
      setSuccess(`Booking created successfully! Booking ID: ${booking.id}`);
      
      // Redirect to booking detail page after 2 seconds
      setTimeout(() => {
        router.push(`/admin/bookings/${booking.id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          Back to Bookings
        </Link>

        <h1 className="text-3xl font-bold text-neutral-900 mb-8">Create Manual Booking</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tour Selection */}
          <div className="bg-white rounded-lg shadow-medium p-6 border border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900 mb-4">Tour Selection</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Select Tour *
                </label>
                <select
                  value={selectedTourId}
                  onChange={(e) => setSelectedTourId(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">-- Select a tour --</option>
                  {tours.map((tour) => (
                    <option key={tour.id} value={tour.id}>
                      {tour.name} - ₹{(tour.basePriceInInr || tour.price || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Travel Date *
                </label>
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Primary Contact */}
          <div className="bg-white rounded-lg shadow-medium p-6 border border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900 mb-4">Primary Contact</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={primaryContact.name}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, name: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={primaryContact.email}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, email: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={primaryContact.phone}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Travellers */}
          <div className="bg-white rounded-lg shadow-medium p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-neutral-900">Travellers</h2>
              <button
                type="button"
                onClick={addTraveller}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
              >
                <Plus size={16} />
                Add Traveller
              </button>
            </div>
            <div className="space-y-4">
              {travellers.map((traveller, index) => (
                <div key={traveller.uid} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-900">Traveller {index + 1}</h3>
                    {travellers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTraveller(traveller.uid)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={traveller.firstName}
                        onChange={(e) => updateTraveller(traveller.uid, "firstName", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={traveller.lastName}
                        onChange={(e) => updateTraveller(traveller.uid, "lastName", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={traveller.dateOfBirth}
                        onChange={(e) => updateTraveller(traveller.uid, "dateOfBirth", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Gender
                      </label>
                      <select
                        value={traveller.gender}
                        onChange={(e) => updateTraveller(traveller.uid, "gender", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Nationality
                      </label>
                      <input
                        type="text"
                        value={traveller.nationality}
                        onChange={(e) => updateTraveller(traveller.uid, "nationality", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Passport Number
                      </label>
                      <input
                        type="text"
                        value={traveller.passportNumber}
                        onChange={(e) => updateTraveller(traveller.uid, "passportNumber", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Passport Expiry
                      </label>
                      <input
                        type="date"
                        value={traveller.passportExpiry}
                        onChange={(e) => updateTraveller(traveller.uid, "passportExpiry", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Passport Issuing Country
                      </label>
                      <input
                        type="text"
                        value={traveller.passportIssuingCountry}
                        onChange={(e) => updateTraveller(traveller.uid, "passportIssuingCountry", e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-lg shadow-medium p-6 border border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900 mb-4">Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Food Preference
                </label>
                <input
                  type="text"
                  value={preferences.foodPreference}
                  onChange={(e) => setPreferences({ ...preferences, foodPreference: e.target.value })}
                  placeholder="e.g., Vegetarian, Non-vegetarian, Jain"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Language Preference
                </label>
                <input
                  type="text"
                  value={preferences.languagePreference}
                  onChange={(e) => setPreferences({ ...preferences, languagePreference: e.target.value })}
                  placeholder="e.g., English, Hindi"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Special Requests
                </label>
                <textarea
                  value={preferences.specialRequests}
                  onChange={(e) => setPreferences({ ...preferences, specialRequests: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Mode */}
          <div className="bg-white rounded-lg shadow-medium p-6 border border-neutral-200">
            <h2 className="text-xl font-bold text-neutral-900 mb-4">Payment Mode</h2>
            <div className="space-y-3">
              <label className="flex items-start p-4 border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-primary-600">
                <input
                  type="radio"
                  name="paymentMode"
                  value="pay_later"
                  checked={paymentMode === "pay_later"}
                  onChange={(e) => setPaymentMode("pay_later")}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-neutral-900">Pay Later Link</div>
                  <div className="text-sm text-neutral-600">
                    Customer will receive a payment link via email
                  </div>
                </div>
              </label>
              <label className="flex items-start p-4 border-2 border-neutral-200 rounded-lg cursor-pointer hover:border-primary-600">
                <input
                  type="radio"
                  name="paymentMode"
                  value="offline"
                  checked={paymentMode === "offline"}
                  onChange={(e) => setPaymentMode("offline")}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium text-neutral-900">Offline Payment</div>
                  <div className="text-sm text-neutral-600">
                    Mark as paid offline (no payment link sent)
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Link
              href="/admin/bookings"
              className="px-6 py-3 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Booking"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

