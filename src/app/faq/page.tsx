import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FAQClient } from "./FAQClient";

export const metadata: Metadata = {
  title: "Frequently Asked Questions – Travunited Visa & Holiday Help",
  description:
    "Find answers to common questions about visa processing times, required documents, tour customizations, and more. Your comprehensive travel guide by Travunited.",
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title: "Frequently Asked Questions – Travunited",
    description: "Find answers to common questions about our visa services and tour packages.",
    url: "https://travunited.in/faq",
    siteName: "Travunited",
    images: [{ url: "https://travunited.in/og-default.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Frequently Asked Questions – Travunited",
    description: "Find answers to common questions about our visa services.",
    images: ["https://travunited.in/og-default.png"],
  },
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How long does it take to process a visa application?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Processing times vary depending on the destination and visa type. Typically, tourist visas take 5-15 business days, while business visas may take 10-20 business days. We'll provide you with an estimated timeline when you submit your application.",
      },
    },
    {
      "@type": "Question",
      name: "What documents do I need for a visa application?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Required documents vary by destination and visa type. Generally, you'll need a valid passport, passport-sized photographs, completed application form, travel itinerary, proof of accommodation, financial statements, and travel insurance. We'll provide a complete checklist specific to your application.",
      },
    },
    {
      "@type": "Question",
      name: "Can I apply for a visa if my passport is expiring soon?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most countries require your passport to be valid for at least 6 months beyond your intended stay. If your passport is expiring soon, we recommend renewing it before applying for a visa.",
      },
    },
    {
      "@type": "Question",
      name: "Do you offer travel insurance?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, we can help you arrange travel insurance as part of your visa application or tour package. Travel insurance is often required for visa applications and provides coverage for medical emergencies, trip cancellations, and other travel-related issues.",
      },
    },
    {
      "@type": "Question",
      name: "Can I track my visa application status?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, you can track your application status through your Travunited dashboard. We also send regular updates via email and SMS at each stage of the process.",
      },
    },
    {
      "@type": "Question",
      name: "Are your tour packages customizable?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, we offer customizable tour packages. You can modify itineraries, add or remove activities, and adjust accommodation preferences. Contact our travel consultants to discuss your requirements.",
      },
    },
  ],
};

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
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
          <FAQClient />

          <div className="mt-12 bg-primary-50 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Still Have Questions?</h2>
            <p className="text-neutral-700 mb-6">
              Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                Contact Us
              </Link>
              <Link
                href="/help"
                className="bg-white text-primary-600 border-2 border-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                Visit Help Center
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
