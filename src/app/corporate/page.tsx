import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { CorporateForm } from "./CorporateForm";

export const metadata: Metadata = {
  title: "Corporate Travel & Visa Solutions – Travunited",
  description:
    "Empower your business with Travunited's corporate travel management. Bulk visa processing, dedicated account managers, and tailored solutions for organizations.",
  alternates: {
    canonical: "/corporate",
  },
  openGraph: {
    title: "Corporate Travel & Visa Solutions – Travunited",
    description: "Empower your business with our corporate travel management and bulk visa processing.",
    url: "https://travunited.in/corporate",
    siteName: "Travunited",
    images: [{ url: "https://travunited.in/og-default.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Corporate Travel Solutions – Travunited",
    description: "Empower your business with our corporate travel management.",
    images: ["https://travunited.in/og-default.png"],
  },
};

export default function CorporatePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center justify-center mb-4">
              <Building2 size={48} className="text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
              Corporate Travel Solutions
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto text-center">
              Streamlined visa services and travel management for your organization
            </p>
          </div>
        </div>
      </div>

      <CorporateForm />
    </div>
  );
}
