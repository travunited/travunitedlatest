import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";


interface RouteParams {
  country: string;
  slug: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<RouteParams> | RouteParams }
) {
  // Handle both sync and async params (Next.js 15+ uses async params)
  const resolvedParams = await Promise.resolve(params);
  const countryCode = resolvedParams.country.toUpperCase();
  // Decode URL-encoded slug
  const slug = decodeURIComponent(resolvedParams.slug);

  try {
    const visa = await prisma.visa.findFirst({
      where: {
        slug,
        OR: [
          { Country: { code: countryCode } },
          { Country: { name: { equals: resolvedParams.country, mode: "insensitive" } } }
        ],
        isActive: true,
      },
      include: {
        Country: true,
        VisaDocumentRequirement: {
          orderBy: { sortOrder: "asc" },
        },
        VisaFaq: {
          orderBy: { sortOrder: "asc" },
        },
        VisaSubType: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!visa) {
      return NextResponse.json(
        { error: "Visa not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: visa.id,
      slug: visa.slug,
      name: visa.name,
      subtitle: visa.subtitle,
      category: visa.category,
      priceInInr: visa.priceInInr,
      processingTime: visa.processingTime,
      stayDuration: visa.stayDuration,
      validity: visa.validity,
      entryType: visa.entryType,
      entryTypeLegacy: visa.entryTypeLegacy,
      visaMode: visa.visaMode,
      stayType: visa.stayType,
      visaSubTypeLabel: visa.visaSubTypeLabel,
      overview: visa.overview,
      eligibility: visa.eligibility,
      importantNotes: visa.importantNotes,
      rejectionReasons: visa.rejectionReasons,
      whyTravunited: visa.whyTravunited,
      statistics: visa.statistics,
      heroImageUrl: visa.heroImageUrl,
      currency: visa.currency,
      country: {
        id: (visa as any).Country.id,
        name: (visa as any).Country.name,
        code: (visa as any).Country.code,
        flagUrl: (visa as any).Country.flagUrl,
      },
      requirements: (visa as any).VisaDocumentRequirement,
      faqs: (visa as any).VisaFaq,
      subTypes: (visa as any).VisaSubType,
    });
  } catch (error) {
    console.error("[VisaDetailAPI] Fetch failed", error);
    return NextResponse.json(
      { error: "Failed to fetch visa" },
      { status: 500 }
    );
  }
}

