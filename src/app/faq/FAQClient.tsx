"use client";

import { useState, useId } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

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

export function FAQClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const headingId = useId();

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4" role="region" aria-labelledby={`${headingId}-heading`}>
      <h2 id={`${headingId}-heading`} className="sr-only">Frequently Asked Questions</h2>
      {faqs.map((faq, index) => {
        const panelId = `${headingId}-panel-${index}`;
        const buttonId = `${headingId}-button-${index}`;
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="border border-neutral-200 rounded-lg overflow-hidden bg-white"
          >
            <h3 className="sr-only">{faq.question}</h3>
            <button
              id={buttonId}
              onClick={() => toggleFAQ(index)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-neutral-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
            >
              <span className="font-semibold text-neutral-900 pr-4">
                {faq.question}
              </span>
              {isOpen ? (
                <ChevronUp className="text-primary-600 flex-shrink-0" size={20} aria-hidden="true" />
              ) : (
                <ChevronDown className="text-neutral-400 flex-shrink-0" aria-hidden="true" size={20} />
              )}
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`px-6 py-4 bg-neutral-50 border-t border-neutral-200 ${isOpen ? 'block' : 'hidden'}`}
            >
              <p className="text-neutral-700 leading-relaxed">{faq.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
