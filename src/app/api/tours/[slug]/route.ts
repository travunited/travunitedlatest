import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMediaProxyUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const tour = await prisma.tour.findFirst({
      where: {
        slug: params.slug,
        isActive: true,
        status: "active",
      },
      include: {
        country: true,
        days: { orderBy: { dayIndex: "asc" } },
      },
    });

    if (!tour) {
      return NextResponse.json(
        { error: "Tour not found" },
        { status: 404 }
      );
    }

    // Parse JSON fields for client
    const parseJsonField = (value: string | null): any => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };

    return NextResponse.json({
      ...tour,
      images: parseJsonField(tour.images) || parseJsonField(tour.galleryImageUrls) || [],
      citiesCovered: parseJsonField(tour.citiesCovered) || [],
      highlights: parseJsonField(tour.highlights) || [],
      themes: parseJsonField(tour.themes) || [],
      bestFor: parseJsonField(tour.bestFor) || [],
      regionTags: parseJsonField(tour.regionTags) || [],
      availableDates: parseJsonField(tour.availableDates) || [],
      hotelCategories: parseJsonField(tour.hotelCategories) || [],
      customizationOptions: parseJsonField(tour.customizationOptions) || {},
      seasonalPricing: parseJsonField(tour.seasonalPricing) || {},
      inclusions: parseJsonField(tour.inclusions) || [],
      exclusions: parseJsonField(tour.exclusions) || [],
      imageUrl: getMediaProxyUrl(tour.imageUrl),
      heroImageUrl: getMediaProxyUrl(tour.heroImageUrl),
      featuredImage: getMediaProxyUrl(tour.featuredImage),
    });
  } catch (error) {
    console.error("Error fetching tour:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


