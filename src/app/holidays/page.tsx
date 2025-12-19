import { prisma } from "@/lib/prisma";
import { getMediaProxyUrl } from "@/lib/media";
import HolidaysGridClient from "./HolidaysGridClient";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: { destination?: string; date?: string };
}) {
  const where: Prisma.TourWhereInput = {
    isActive: true,
    status: "active",
  };

  // Filter by destination if provided
  if (searchParams?.destination) {
    const destination = searchParams.destination;
    where.OR = [
      { destinationCountry: { contains: destination, mode: "insensitive" } },
      { destinationState: { contains: destination, mode: "insensitive" } },
      { primaryDestination: { contains: destination, mode: "insensitive" } },
      { name: { contains: destination, mode: "insensitive" } },
    ];
  }

  let tours: Prisma.TourGetPayload<{ include: { country: true } }>[] = [];
  try {
    tours = await prisma.tour.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        country: true,
      },
    });
  } catch (error) {
    console.error("Error fetching tours:", error);
    // Continue with empty array
  }

  const formatted = [...tours]
    .sort((a, b) => {
      if (a.isFeatured === b.isFeatured) {
        return 0;
      }
      return a.isFeatured ? -1 : 1;
    })
    .map((tour) => {
      // Format duration
      const durationParts: string[] = [];
      if (tour.durationDays) durationParts.push(`${tour.durationDays} day${tour.durationDays !== 1 ? "s" : ""}`);
      if (tour.durationNights) durationParts.push(`${tour.durationNights} night${tour.durationNights !== 1 ? "s" : ""}`);
      const durationDisplay = durationParts.length > 0 ? durationParts.join(" / ") : tour.duration || "5 days";

      // Format destination
      const destinationParts: string[] = [];
      if (tour.primaryDestination) destinationParts.push(tour.primaryDestination);
      if (tour.destinationState) destinationParts.push(tour.destinationState);
      if (tour.destinationCountry) destinationParts.push(tour.destinationCountry);
      const destinationDisplay = destinationParts.length > 0 ? destinationParts.join(", ") : tour.destination || "";

      // Parse JSON fields
      const themes = tour.themes ? (() => {
        try {
          const parsed = JSON.parse(tour.themes);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })() : [];

      const bestFor = tour.bestFor ? (() => {
        try {
          const parsed = JSON.parse(tour.bestFor);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })() : [];

      return {
        id: tour.id,
        slug: tour.slug,
        name: tour.name,
        destination: destinationDisplay,
        primaryDestination: tour.primaryDestination,
        destinationCountry: tour.destinationCountry,
        destinationState: tour.destinationState,
        duration: durationDisplay,
        durationDays: tour.durationDays,
        durationNights: tour.durationNights,
        price: tour.basePriceInInr ?? tour.price ?? 0,
        originalPrice: tour.originalPrice,
        currency: tour.currency || "INR",
        countryName: tour.country?.name || tour.destinationCountry || "Global",
        countryCode: tour.country?.code || "GLOBAL",
        isFeatured: tour.isFeatured,
        allowAdvance: tour.allowAdvance,
        tourType: tour.tourType,
        tourSubType: tour.tourSubType,
        region: tour.region,
        themes: themes,
        bestFor: bestFor,
        difficultyLevel: tour.difficultyLevel,
        groupSizeMin: tour.groupSizeMin,
        groupSizeMax: tour.groupSizeMax,
        packageType: tour.packageType,
        image:
          getMediaProxyUrl(tour.featuredImage) ||
          getMediaProxyUrl(tour.heroImageUrl) ||
          getMediaProxyUrl(tour.imageUrl) ||
          "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&q=80",
      };
    });

  // Extract filters
  const countryFilters = Array.from(
    new Map(
      tours
        .filter((tour) => tour.country?.code || tour.destinationCountry)
        .map((tour) => {
          const code = tour.country?.code || tour.destinationCountry?.substring(0, 3).toUpperCase() || "GLOBAL";
          const name = tour.country?.name || tour.destinationCountry || "Global";
          return [code, { code, name }];
        })
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const regions = Array.from(
    new Set(tours.map((tour) => tour.region).filter(Boolean))
  ).sort() as string[];

  const tourTypes = Array.from(
    new Set(tours.map((tour) => tour.tourType).filter(Boolean))
  ).sort() as string[];

  const allThemes = Array.from(
    new Set(
      tours.flatMap((tour) => {
        if (!tour.themes) return [];
        try {
          const parsed = JSON.parse(tour.themes);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })
    )
  ).sort() as string[];

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Holiday Packages
          </h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Discover curated holiday experiences designed for unforgettable memories
          </p>
        </div>
      </div>

      <HolidaysGridClient 
        tours={formatted} 
        countries={countryFilters}
        regions={regions}
        tourTypes={tourTypes}
        themes={allThemes}
      />
    </div>
  );
}

