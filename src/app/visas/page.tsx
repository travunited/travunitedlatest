import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Visa Services for 50+ Countries – Travunited",
  description:
    "Browse visa options for 50+ countries including UAE, UK, USA, Schengen, Thailand and more. Fast processing, expert guidance, and competitive prices for Indian travellers.",
  openGraph: {
    title: "Visa Services for 50+ Countries – Travunited",
    description:
      "Browse visa options for 50+ countries. Fast processing and expert guidance for Indian travellers.",
    url: "https://travunited.in/visas",
    siteName: "Travunited",
    images: [{ url: "https://travunited.in/og-default.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Visa Services for 50+ Countries – Travunited",
    description: "Browse visa options for 50+ countries. Fast processing and expert guidance.",
    images: ["https://travunited.in/og-default.png"],
  },
};
import VisasGridClient from "./VisasGridClient";
import { getMediaProxyUrl } from "@/lib/media";
import { getCountryFlagUrl } from "@/lib/flags";

export const revalidate = 3600;

export default async function VisasPage() {
  const countries = await prisma.country.findMany({
    where: {
      isActive: true,
      Visa: {
        some: {
          isActive: true,
        },
      },
    },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { Visa: true },
      },
      Visa: {
        where: { isActive: true },
        select: { slug: true, heroImageUrl: true },
      },
    },
  });

  const formatted = countries.map((country) => ({
    id: country.code.toLowerCase(),
    code: country.code,
    name: country.name,
    region: country.region || "",
    flagUrl: getCountryFlagUrl(country.flagUrl, country.code, 160),
    heroImage:
      getMediaProxyUrl((country as any).Visa[0]?.heroImageUrl) ||
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&q=80",
    visaCount: (country as any)._count.Visa,
  }));

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Visa Services
          </h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Apply for visas to destinations worldwide with expert guidance and support
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-16 text-center text-neutral-500">Loading visas…</div>}>
        <VisasGridClient countries={formatted} />
      </Suspense>
    </div>
  );
}
