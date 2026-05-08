import type { Metadata } from "next";
import { Suspense } from "react";
import { HelpClient } from "./HelpClient";

export const metadata: Metadata = {
  title: "Help Center & Support – Travunited Customer Service",
  description:
    "Get help with your visa application, holiday booking, or travel documents. Browse our FAQs or contact our dedicated support team for assistance.",
  alternates: {
    canonical: "/help",
  },
  openGraph: {
    title: "Help Center & Support – Travunited",
    description: "Find answers to common questions or get in touch with our support team.",
    url: "https://travunited.in/help",
    siteName: "Travunited",
    images: [{ url: "https://travunited.in/og-default.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Help Center – Travunited",
    description: "Get help with your visa application or holiday booking.",
    images: ["https://travunited.in/og-default.png"],
  },
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Help & Support
            </h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Find answers to common questions or get in touch with our support team
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Suspense fallback={<div className="text-center py-20 text-neutral-500">Loading help center...</div>}>
          <HelpClient />
        </Suspense>
      </div>
    </div>
  );
}
