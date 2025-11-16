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

// Mock tour data - in production, fetch from API
const tourData: Record<string, any> = {
  "dubai-premium": {
    name: "Dubai 5N6D Premium Escape",
    price: 45999,
    advancePercentage: 30,
  },
  "europe-grand": {
    name: "European Grand Tour",
    price: 189999,
    advancePercentage: 30,
  },
  "thailand-tropical": {
    name: "Thailand Tropical Paradise",
    price: 34999,
    advancePercentage: 30,
  },
  "singapore-city": {
    name: "Singapore City Explorer",
    price: 42999,
    advancePercentage: 30,
  },
};

export default function TourBookingPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  
  const tour = tourData[params.id] || {
    name: "Tour Package",
    price: 50000,
    advancePercentage: 30,
  };

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

  const travellerCount = formData.numberOfAdults + formData.numberOfChildren;
  const travellersLength = formData.travellers.length;
  const normalizedTravellerCount = Math.max(travellerCount, 1);
  const baseAmount = tour.price * normalizedTravellerCount;
  const advancePercentage = tour.advancePercentage ?? 0;
  const advanceAmount = Math.round(baseAmount * (advancePercentage / 100));
  const remainingAmount = Math.max(baseAmount - advanceAmount, 0);
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

  const nextStep = () => {
    // Validation
    if (currentStep === 1) {
      if (!formData.travelDate) {
        alert("Please select a travel date");
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
          tourId: params.id,
          tourName: tour.name,
          tourPrice: tour.price,
          advancePercentage: tour.advancePercentage,
          travelDate: formData.travelDate,
          numberOfAdults: formData.numberOfAdults,
          numberOfChildren: formData.numberOfChildren,
          primaryContact: formData.primaryContact,
          travellers: formData.travellers,
          paymentType: formData.paymentType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBookingId(data.bookingId);
        setCurrentStep(5);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to create booking. Please try again.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!bookingId) return;

    setLoading(true);
    try {
      const totalTravellers = formData.numberOfAdults + formData.numberOfChildren;
      const baseAmount = tour.price * totalTravellers;
      const amount = formData.paymentType === "full"
        ? baseAmount
        : Math.round(baseAmount * (tour.advancePercentage / 100));

      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
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
        handler: () => {
          setLoading(false);
          router.push(`/bookings/thank-you?bookingId=${bookingId}`);
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", () => {
        setLoading(false);
        alert("Payment failed. Please try again.");
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
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Select Tour & Travel Date</h2>
            <div className="bg-neutral-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-lg mb-2">{tour.name}</h3>
              <p className="text-neutral-600 mb-4">Starting from ₹{tour.price.toLocaleString()} per person</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Select Travel Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.travelDate}
                  onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
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
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  Total travellers: {travellerCount}{" "}
                  (₹{(tour.price * normalizedTravellerCount).toLocaleString()} total)
                </p>
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
                        Pay {advancePercentage}% now, remaining before departure
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
        const finalAmount = formData.paymentType === "full" ? baseAmount : advanceAmount;
        
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
                      ₹{finalAmount.toLocaleString()}
                    </span>
                  </div>
                  {formData.paymentType === "advance" && (
                    <p className="text-sm text-neutral-600 mb-4">
                      Remaining balance of ₹{Math.max(baseAmount - finalAmount, 0).toLocaleString()} due before departure.
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
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
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
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-medium p-8 mb-6">
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
        <div className="flex justify-between">
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
