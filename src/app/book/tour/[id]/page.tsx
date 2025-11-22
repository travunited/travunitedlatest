"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle, Calendar, User, CreditCard, Users } from "lucide-react";
import Link from "next/link";
import { loadRazorpayScript } from "@/lib/razorpay-client";
import { formatDate } from "@/lib/dateFormat";

const steps = [
  { id: 1, name: "Select Tour & Date", icon: Calendar },
  { id: 2, name: "Primary Contact", icon: User },
  { id: 3, name: "Travellers", icon: Users },
  { id: 4, name: "Review", icon: CheckCircle },
  { id: 5, name: "Payment", icon: CreditCard },
];

export default function TourBookingPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [tour, setTour] = useState<any>(null);
  const [tourLoading, setTourLoading] = useState(true);
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, boolean>>({});
  const [selectedHotelCategory, setSelectedHotelCategory] = useState<string>("");

  const [formData, setFormData] = useState({
    travelDate: "",
    numberOfAdults: 1,
    numberOfChildren: 0,
    primaryContact: {
      name: "",
      email: "",
      phone: "",
    },
    travellers: [] as Array<{
      firstName: string;
      lastName: string;
      age: string;
      gender?: string;
    }>,
    paymentType: "full" as "full" | "advance",
  });

  // Fetch tour data
  useEffect(() => {
    const fetchTour = async () => {
      try {
        const response = await fetch(`/api/tours/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setTour(data);
          // Set default hotel category if available
          if (data.hotelCategories && data.hotelCategories.length > 0) {
            setSelectedHotelCategory(data.hotelCategories[0]);
          }
        } else {
          router.push("/tours");
        }
      } catch (error) {
        console.error("Failed to load tour:", error);
        router.push("/tours");
      } finally {
        setTourLoading(false);
      }
    };
    fetchTour();
  }, [params.id, router]);

  // Calculate pricing with seasonal pricing and customizations
  const calculatePrice = () => {
    if (!tour) return { baseAmount: 0, finalAmount: 0, advanceAmount: 0, remainingAmount: 0 };

    const travellerCount = formData.numberOfAdults + formData.numberOfChildren;
    const normalizedTravellerCount = Math.max(travellerCount, 1);

    // Get base price (check seasonal pricing first)
    let basePrice = tour.basePriceInInr ?? tour.price ?? 0;
    if (formData.travelDate && tour.seasonalPricing) {
      const travelDate = new Date(formData.travelDate);
      for (const [seasonName, seasonData] of Object.entries(tour.seasonalPricing as Record<string, any>)) {
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

    // Add customization options
    let customizationTotal = 0;
    if (tour.customizationOptions) {
      for (const [key, value] of Object.entries(tour.customizationOptions as Record<string, any>)) {
        if (selectedCustomizations[key] && value.price) {
          if (value.type === "per_person") {
            customizationTotal += value.price * normalizedTravellerCount;
          } else {
            customizationTotal += value.price;
          }
        }
      }
    }

    const finalAmount = baseAmount + customizationTotal;
    const advancePercentage = tour.advancePercentage ?? 0;
    const advanceAmount = formData.paymentType === "advance" && tour.allowAdvance
      ? Math.round(finalAmount * (advancePercentage / 100))
      : finalAmount;
    const remainingAmount = Math.max(finalAmount - advanceAmount, 0);

    return { baseAmount, finalAmount, advanceAmount, remainingAmount };
  };

  const { baseAmount, finalAmount, advanceAmount, remainingAmount } = calculatePrice();

  const travellerCount = formData.numberOfAdults + formData.numberOfChildren;
  const travellersLength = formData.travellers.length;
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
      const newTravellers = Array.from({ length: totalTravellers - currentCount }, () => ({
        firstName: "",
        lastName: "",
        age: "",
        gender: "",
      }));
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
  }, [travellerCount, travellersLength]);

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
    // Validation
    if (currentStep === 1) {
      const error = validateStep1();
      if (error) {
        alert(error);
        return;
      }
    }
    
    if (currentStep === 2) {
      if (!formData.primaryContact.name || !formData.primaryContact.email) {
        alert("Please fill in all required contact information");
        return;
      }
    }
    
    if (currentStep === 3) {
      if (formData.travellers.length === 0) {
        alert("Please add traveller information");
        return;
      }
      for (const traveller of formData.travellers) {
        if (!traveller.firstName || !traveller.lastName || !traveller.age) {
          alert("Please fill in all required fields for all travellers");
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

  const handleConfirmAndPay = async () => {
    // Validate required fields
    if (!formData.travelDate) {
      alert("Please select a travel date");
      return;
    }

    if (!formData.primaryContact.name || !formData.primaryContact.email) {
      alert("Please fill in all required contact information");
      return;
    }

    if (formData.travellers.length === 0) {
      alert("Please add at least one traveller");
      return;
    }

    // Validate all travellers have required fields
    const invalidTraveller = formData.travellers.find(
      (t) => !t.firstName || !t.lastName || !t.age
    );
    if (invalidTraveller) {
      alert("Please fill in all required fields for all travellers");
      return;
    }

    // Check if user is logged in
    if (!session) {
      router.push(`/signup?email=${encodeURIComponent(formData.primaryContact.email || "")}&redirect=/book/tour/${params.id}`);
      return;
    }

    setLoading(true);
    try {
      // Create booking
      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: tour.id,
          tourName: tour.name,
          tourPrice: finalAmount, // Final amount includes customizations
          advancePercentage: tour.advancePercentage,
          travelDate: formData.travelDate,
          numberOfAdults: formData.numberOfAdults,
          numberOfChildren: formData.numberOfChildren,
          primaryContact: formData.primaryContact,
          travellers: formData.travellers,
          paymentType: formData.paymentType,
          customizations: selectedCustomizations,
          hotelCategory: selectedHotelCategory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBookingId(data.bookingId);
        setCurrentStep(5);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.details?.[0]?.message || "Failed to create booking. Please try again.";
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!bookingId) {
      alert("Booking ID not found. Please go back and try again.");
      return;
    }

    if (!session) {
      alert("Please login to proceed with payment");
      router.push(`/login?redirect=/book/tour/${params.id}`);
      return;
    }

    setLoading(true);
    try {
      const amount = formData.paymentType === "full"
        ? finalAmount
        : advanceAmount;

      if (amount <= 0) {
        throw new Error("Invalid payment amount");
      }

      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amount), // Ensure amount is rounded
          bookingId,
          paymentType: formData.paymentType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Unable to initiate payment.");
      }

      const { orderId, keyId, amount: orderAmount, currency } = await response.json();
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Failed to load Razorpay SDK.");
      }

      const options = {
        key: keyId,
        amount: orderAmount,
        currency,
        name: "Travunited",
        description: `${tour.name}`,
        order_id: orderId,
        prefill: {
          name: formData.primaryContact.name,
          email: formData.primaryContact.email,
          contact: formData.primaryContact.phone || "",
        },
        notes: {
          bookingId,
          paymentType: formData.paymentType,
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
                bookingId,
              }),
            });

            if (verifyResponse.ok) {
              setLoading(false);
              router.push(`/bookings/thank-you?bookingId=${bookingId}`);
            } else {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || "Payment verification failed");
            }
          } catch (error: any) {
            console.error("Payment verification error:", error);
            setLoading(false);
            alert(error?.message || "Payment verification failed. Please contact support if payment was deducted.");
            setLoading(false);
            alert(`Payment verification failed: ${error.message || "Please contact support"}`);
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
                        const isPastDeadline = tour.bookingDeadline && date <= new Date(tour.bookingDeadline);
                        const isDisabled = isPast || isPastDeadline;

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => !isDisabled && setFormData({ ...formData, travelDate: dateStr })}
                            className={`p-3 border rounded-lg text-sm text-left transition-colors ${
                              isSelected
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
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.numberOfAdults}
                    onChange={(e) => setFormData({ ...formData, numberOfAdults: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  {tour.minimumTravelers && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Minimum: {tour.minimumTravelers} traveler(s)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Number of Children
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.numberOfChildren}
                    onChange={(e) => setFormData({ ...formData, numberOfChildren: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  {tour.maximumTravelers && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Maximum: {tour.maximumTravelers} traveler(s)
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
                        className={`px-4 py-2 border rounded-lg text-sm transition-colors ${
                          selectedHotelCategory === category
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

              {/* Customization Options */}
              {tour.customizationOptions && Object.keys(tour.customizationOptions).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Customization Options
                  </label>
                  <div className="space-y-2">
                    {Object.entries(tour.customizationOptions as Record<string, any>).map(([key, value]: [string, any]) => (
                      <label
                        key={key}
                        className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCustomizations[key] || false}
                          onChange={(e) =>
                            setSelectedCustomizations({
                              ...selectedCustomizations,
                              [key]: e.target.checked,
                            })
                          }
                          className="mt-1 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-neutral-900">{key}</div>
                          {typeof value === "object" && value.description && (
                            <div className="text-sm text-neutral-600">{value.description}</div>
                          )}
                          {typeof value === "object" && value.price && (
                            <div className="text-sm text-primary-600 mt-1">
                              +₹{value.price.toLocaleString()}
                              {value.type === "per_person" && " per person"}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
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
                  {Object.keys(selectedCustomizations).some(key => selectedCustomizations[key]) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-700">Customizations:</span>
                      <span className="font-medium">
                        +₹{(finalAmount - baseAmount).toLocaleString()}
                      </span>
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Traveller Information</h2>
            <p className="text-neutral-600 mb-6">
              Add details for all travellers. Passport details are not required for tour bookings.
            </p>
            <div className="space-y-4">
              {formData.travellers.map((traveller, index) => (
                <div key={index} className="border border-neutral-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Traveller {index + 1}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={traveller.firstName}
                        onChange={(e) => {
                          const newTravellers = [...formData.travellers];
                          newTravellers[index].firstName = e.target.value;
                          setFormData({ ...formData, travellers: newTravellers });
                        }}
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
                        onChange={(e) => {
                          const newTravellers = [...formData.travellers];
                          newTravellers[index].lastName = e.target.value;
                          setFormData({ ...formData, travellers: newTravellers });
                        }}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Age *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        required
                        value={traveller.age}
                        onChange={(e) => {
                          const newTravellers = [...formData.travellers];
                          newTravellers[index].age = e.target.value;
                          setFormData({ ...formData, travellers: newTravellers });
                        }}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Gender (Optional)
                      </label>
                      <select
                        value={traveller.gender || ""}
                        onChange={(e) => {
                          const newTravellers = [...formData.travellers];
                          newTravellers[index].gender = e.target.value;
                          setFormData({ ...formData, travellers: newTravellers });
                        }}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
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

            <div className="space-y-4">
              {/* Tour Details */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Tour Details</h3>
                <p>{tour.name}</p>
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
                    {i + 1}. {t.firstName} {t.lastName} (Age: {t.age})
                  </p>
                ))}
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
                        Pay {tour.advancePercentage ?? 0}% now, remaining before departure
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
            </div>
          </div>
        );

      case 5:
        const paymentFinalAmount = formData.paymentType === "full" ? baseAmount : advanceAmount;
        
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
                <div className="bg-neutral-50 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">
                      {formData.paymentType === "full" ? "Total Amount" : "Advance Amount"}
                    </span>
                    <span className="text-2xl font-bold text-primary-600">
                      ₹{paymentFinalAmount.toLocaleString()}
                    </span>
                  </div>
                  {formData.paymentType === "advance" && (
                    <p className="text-sm text-neutral-600 mb-4">
                      Remaining balance of ₹{Math.max(baseAmount - paymentFinalAmount, 0).toLocaleString()} due before departure.
                    </p>
                  )}
                  <p className="text-sm text-neutral-600 mb-6">
                    Secure payment via Razorpay. All major cards, UPI, and net banking accepted.
                  </p>
                  <button
                    onClick={handlePayment}
                    disabled={loading || !bookingId}
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
            href={`/tours/${params.id}`}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            ← Back to Tour Details
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
              <span>{loading ? "Saving..." : "Confirm & Continue to Payment"}</span>
              <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
