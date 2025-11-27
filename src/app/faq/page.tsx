"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How long does it take to process a visa application?",
    answer: "Processing times vary depending on the destination and visa type. Typically, tourist visas take 5-15 business days, while business visas may take 10-20 business days. We'll provide you with an estimated timeline when you submit your application.",
  },
  {
    question: "What documents do I need for a visa application?",
    answer: "Required documents vary by destination and visa type. Generally, you'll need a valid passport, passport-sized photographs, completed application form, travel itinerary, proof of accommodation, financial statements, and travel insurance. We'll provide a complete checklist specific to your application.",
  },
  {
    question: "Can I apply for a visa if my passport is expiring soon?",
    answer: "Most countries require your passport to be valid for at least 6 months beyond your intended stay. If your passport is expiring soon, we recommend renewing it before applying for a visa.",
  },
  {
    question: "What happens if my visa application is rejected?",
    answer: "If your visa is rejected, our service fees are non-refundable as we've already processed your application. However, government fees may be refundable according to the embassy's policy. We'll help you understand the rejection reason and can assist with reapplying if applicable.",
  },
  {
    question: "Do you offer travel insurance?",
    answer: "Yes, we can help you arrange travel insurance as part of your visa application or tour package. Travel insurance is often required for visa applications and provides coverage for medical emergencies, trip cancellations, and other travel-related issues.",
  },
  {
    question: "Can I track my visa application status?",
    answer: "Yes, you can track your application status through your Travunited dashboard. We also send regular updates via email and SMS at each stage of the process.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept credit cards, debit cards, UPI, net banking, and bank transfers. All payments are processed securely through our payment gateway.",
  },
  {
    question: "Are your tour packages customizable?",
    answer: "Yes, we offer customizable tour packages. You can modify itineraries, add or remove activities, and adjust accommodation preferences. Contact our travel consultants to discuss your requirements.",
  },
  {
    question: "Do you provide airport pickup and drop services?",
    answer: "Yes, we can arrange airport transfers as part of your tour package or as a standalone service. This can be added during booking or requested separately.",
  },
  {
    question: "What is your cancellation policy?",
    answer: "Cancellation policies vary by service type. For visa applications, service fees are non-refundable once processing begins. For tour packages, refunds depend on cancellation timing. Please refer to our Refund Policy for detailed information.",
  },
  {
    question: "Do you offer corporate travel services?",
    answer: "Yes, we provide comprehensive corporate travel solutions including group bookings, corporate visa processing, and customized travel packages for businesses. Contact our corporate team for more information.",
  },
  {
    question: "How can I contact customer support?",
    answer: "You can reach us via phone at +91 63603 92398, email at support@travunited.com, or through the contact form on our website. We're available Monday-Friday, 10:00 AM-6:30 PM IST, and Saturday, 10 AM-4 PM IST.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-white/80 hover:text-white mb-8 text-sm"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Find answers to common questions about our visa services and tour packages
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-neutral-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors"
              >
                <span className="font-semibold text-neutral-900 pr-4">
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className="text-primary-600 flex-shrink-0" size={20} />
                ) : (
                  <ChevronDown className="text-neutral-400 flex-shrink-0" size={20} />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200">
                  <p className="text-neutral-700 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 bg-primary-50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Still Have Questions?</h2>
          <p className="text-neutral-700 mb-6">
            Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/help"
              className="bg-white text-primary-600 border-2 border-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors"
            >
              Visit Help Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

