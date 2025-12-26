"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { HelpCircle, Mail, Phone, MessageCircle, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from "lucide-react";

const faqCategories = {
  visas: [
    {
      q: "How long does visa processing take?",
      a: "Processing times vary by country and visa type. Typically, tourist visas take 3-15 business days, while business visas may take 5-20 business days. You can check the specific processing time for each visa on its detail page.",
    },
    {
      q: "What documents do I need for a visa application?",
      a: "Required documents vary by country and visa type. Generally, you'll need a valid passport, passport-size photographs, flight tickets, hotel bookings, bank statements, and travel insurance. Check the specific visa detail page for the complete list.",
    },
    {
      q: "Can I apply for multiple visas at once?",
      a: "Yes, you can apply for multiple visas simultaneously. Each application is processed independently, and you can track the status of each one in your dashboard.",
    },
    {
      q: "What if my visa application is rejected?",
      a: "If your visa is rejected, we'll provide you with the rejection reason. You can reapply after addressing the issues. Note that visa fees are generally non-refundable, but we can assist you with a new application.",
    },
  ],
  tours: [
    {
      q: "What is included in the tour package price?",
      a: "Tour packages typically include accommodation, breakfast, airport transfers, guided tours, and activities as specified in the itinerary. Check the 'Inclusions & Exclusions' tab on each tour detail page for complete information.",
    },
    {
      q: "Can I customize a tour package?",
      a: "Yes, we offer customization options for most tour packages. Contact our support team to discuss your requirements, and we'll create a personalized itinerary for you.",
    },
    {
      q: "What is the cancellation policy?",
      a: "Cancellation policies vary by tour package and timing. Generally, cancellations made 30+ days before departure receive a full refund (minus processing fees). Check the specific tour's terms and conditions for details.",
    },
    {
      q: "Do I need travel insurance?",
      a: "While not always mandatory, we highly recommend purchasing comprehensive travel insurance to protect against trip cancellations, medical emergencies, and other unforeseen circumstances.",
    },
  ],
  documents: [
    {
      q: "What file formats are accepted for document upload?",
      a: "We accept PDF, JPG, JPEG, and PNG formats. Maximum file size is 10MB per document. Ensure documents are clear and legible.",
    },
    {
      q: "How do I upload documents?",
      a: "During the application process, you'll be prompted to upload required documents. Simply click 'Choose File' and select the document from your device. You can upload multiple documents as needed.",
    },
    {
      q: "What if my document is rejected?",
      a: "If a document is rejected, you'll receive a notification with the reason. You can upload a corrected version through your dashboard. Our support team is available to assist if you need clarification.",
    },
  ],
  payments: [
    {
      q: "What payment methods do you accept?",
      a: "We accept all major credit cards, debit cards, UPI, net banking, and digital wallets through our secure Razorpay payment gateway.",
    },
    {
      q: "Is my payment information secure?",
      a: "Yes, all payments are processed through Razorpay, a PCI-DSS compliant payment gateway. We never store your card details on our servers.",
    },
    {
      q: "When will I be charged?",
      a: "For visa applications, payment is required at the time of submission. For tour bookings, you can choose between full payment or advance payment (with balance due before departure).",
    },
    {
      q: "Can I get a refund?",
      a: "Refund policies vary by service type. Visa fees are generally non-refundable once processing begins. Tour cancellations follow the cancellation policy outlined in your booking confirmation.",
    },
  ],
};

function HelpPageContent() {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<keyof typeof faqCategories>("visas");
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Pre-fill form from query parameters
  useEffect(() => {
    if (formRef.current && searchParams) {
      const subject = searchParams?.get("subject");
      const message = searchParams?.get("message");

      if (subject) {
        const subjectInput = formRef.current.querySelector<HTMLInputElement>('input[name="subject"]');
        if (subjectInput) {
          subjectInput.value = subject;
        }
      }

      if (message) {
        const messageInput = formRef.current.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
        if (messageInput) {
          messageInput.value = message;
        }
      }

      // Scroll to contact form if query params are present
      if (subject || message) {
        const contactSection = document.getElementById("contact-form-section");
        if (contactSection) {
          setTimeout(() => {
            contactSection.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
      }
    }
  }, [searchParams]);

  const toggleFaq = (category: string, index: number) => {
    const key = `${category}-${index}`;
    setOpenFaqs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Help & Support
            </h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Find answers to common questions or get in touch with our support team
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-50 rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Categories</h2>
              <div className="space-y-2">
                {Object.keys(faqCategories).map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category as keyof typeof faqCategories)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeCategory === category
                        ? "bg-primary-600 text-white"
                        : "text-neutral-700 hover:bg-neutral-200"
                      }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Contact Support</h3>
                <div className="space-y-3">
                  <a
                    href="mailto:info@travunited.com"
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white transition-colors"
                  >
                    <Mail size={20} className="text-primary-600" />
                    <div>
                      <div className="font-medium text-neutral-900">Email</div>
                      <div className="text-sm text-neutral-600">info@travunited.com</div>
                    </div>
                  </a>
                  <a
                    href="tel:+916360392398"
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white transition-colors"
                  >
                    <Phone size={20} className="text-primary-600" />
                    <div>
                      <div className="font-medium text-neutral-900">Phone</div>
                      <div className="text-sm text-neutral-600">+91 63603 92398</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                Frequently Asked Questions
              </h2>
              <p className="text-neutral-600">
                {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} related questions
              </p>
            </div>

            <div className="space-y-4">
              {faqCategories[activeCategory].map((faq, index) => {
                const key = `${activeCategory}-${index}`;
                const isOpen = openFaqs[key];

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border border-neutral-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFaq(activeCategory, index)}
                      className="w-full flex items-center justify-between p-6 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <span className="font-semibold text-neutral-900 pr-4">{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp size={20} className="text-neutral-600 flex-shrink-0" />
                      ) : (
                        <ChevronDown size={20} className="text-neutral-600 flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 pb-6 text-neutral-700"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Contact Form */}
            <div className="mt-12 bg-neutral-50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                Still have questions?
              </h3>
              <p className="text-neutral-600 mb-6">
                Can&rsquo;t find what you&rsquo;re looking for? Send us a message and we&rsquo;ll get back to you as soon as possible.
              </p>
              <form
                id="contact-form-section"
                ref={formRef}
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmitError("");
                  setSubmitting(true);

                  const formData = new FormData(e.currentTarget);
                  const name = formData.get("name") as string;
                  const email = formData.get("email") as string;
                  const phone = formData.get("phone") as string;
                  const subject = formData.get("subject") as string;
                  const message = formData.get("message") as string;

                  try {
                    const response = await fetch("/api/help/contact", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        name,
                        email,
                        phone: phone || undefined,
                        subject,
                        message,
                      }),
                    });

                    const result = await response.json();

                    if (response.ok && result.ok) {
                      setSubmitSuccess(true);
                      setSubmitError("");
                      // Reset form safely using ref
                      if (formRef.current) {
                        formRef.current.reset();
                      }
                      // Hide success message after 5 seconds
                      setTimeout(() => {
                        setSubmitSuccess(false);
                      }, 5000);
                    } else {
                      // Display the backend error message
                      setSubmitError(result.error || "Failed to send message. Please try again.");
                    }
                  } catch (error) {
                    console.error("Error submitting form:", error);
                    // Show specific error if available
                    if (error instanceof Error) {
                      setSubmitError(error.message || "Unable to send message right now. Please try again in a few minutes.");
                    } else {
                      setSubmitError("Unable to send message right now. Please try again in a few minutes.");
                    }
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Your Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="+91 63603 92398"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Tell us more about your question..."
                  />
                </div>
                {submitSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
                    <CheckCircle className="text-green-600 mt-0.5" size={20} />
                    <div>
                      <p className="text-green-800 font-medium">Thank you! Your message has been sent.</p>
                      <p className="text-green-700 text-sm mt-1">We&rsquo;ll get back to you soon.</p>
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
                    <AlertCircle className="text-red-600 mt-0.5" size={20} />
                    <p className="text-red-800 text-sm">{submitError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Help & Support
            </h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Find answers to common questions or get in touch with our support team
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center text-neutral-600">Loading...</div>
        </div>
      </div>
    }>
      <HelpPageContent />
    </Suspense>
  );
}
