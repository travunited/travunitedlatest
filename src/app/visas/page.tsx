import { prisma } from "@/lib/prisma";
import VisasGridClient from "./VisasGridClient";
import { getMediaProxyUrl } from "@/lib/media";
import { getCountryFlagUrl } from "@/lib/flags";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VisasPage() {
  const countries = await prisma.country.findMany({
    where: {
      isActive: true,
      visas: {
        some: {
          isActive: true,
        },
      },
    },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { visas: true },
      },
      visas: {
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
      getMediaProxyUrl(country.visas[0]?.heroImageUrl) ||
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&q=80",
    visaCount: country._count.visas,
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

      <VisasGridClient countries={formatted} />
    </div>
  );
}
