import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";


interface RouteParams {
  country: string;
  slug: string;
}

export async function GET(
  _request: Request,
  { params }: { params: RouteParams }
) {
  const countryCode = params.country.toUpperCase();
  // Decode URL-encoded slug
  const slug = decodeURIComponent(params.slug);

  try {
    const visa = await prisma.visa.findFirst({
      where: {
        slug,
        country: {
          code: countryCode,
        },
        isActive: true,
      },
      include: {
        country: true,
        requirements: {
          orderBy: { sortOrder: "asc" },
        },
        faqs: {
          orderBy: { sortOrder: "asc" },
        },
        subTypes: {
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
      stayDurationDays: visa.stayDurationDays,
      validity: visa.validity,
      validityDays: visa.validityDays,
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
        id: visa.country.id,
        name: visa.country.name,
        code: visa.country.code,
        flagUrl: visa.country.flagUrl,
      },
      requirements: visa.requirements,
      faqs: visa.faqs,
      subTypes: visa.subTypes,
    });
  } catch (error) {
    console.error("[VisaDetailAPI] Fetch failed", error);
    return NextResponse.json(
      { error: "Failed to fetch visa" },
      { status: 500 }
    );
  }
}

