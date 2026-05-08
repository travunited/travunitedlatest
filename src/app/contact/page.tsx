import type { Metadata } from "next";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us – Travunited Global Travel & Visa Concierge",
  description:
    "Get in touch with Travunited for visa assistance, holiday packages, or corporate travel. Visit our offices in Karnataka and Dubai, or contact us via phone, WhatsApp, or email.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Us – Travunited Global Travel & Visa Concierge",
    description: "Reach out to the Travunited team for any visa or travel requirement.",
    url: "https://travunited.in/contact",
    siteName: "Travunited",
    images: [{ url: "https://travunited.in/og-default.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us – Travunited",
    description: "Reach out to the Travunited team for any visa or travel requirement.",
    images: ["https://travunited.in/og-default.png"],
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
              Contact Us
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto text-center">
              Travunited of India Pvt Ltd Making Global Travel and Visa Services Simple,
              Fast, and Transparent.
            </p>
          </div>
        </div>
      </div>

      <ContactForm />
    </div>
  );
}
