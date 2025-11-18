import { prisma } from "@/lib/prisma";
import { getMediaProxyUrl } from "@/lib/media";
import ToursGridClient from "./ToursGridClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ToursPage() {
  const tours = await prisma.tour.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      country: true,
    },
  });

  const formatted = [...tours]
    .sort((a, b) => {
      if (a.isFeatured === b.isFeatured) {
        return 0;
      }
      return a.isFeatured ? -1 : 1;
    })
    .map((tour) => ({
    id: tour.slug ?? tour.id,
    name: tour.name,
    destination: tour.destination,
    duration: tour.duration,
    price: tour.basePriceInInr ?? tour.price,
    countryName: tour.country?.name || "Global",
    countryCode: tour.country?.code || "GLOBAL",
    isFeatured: tour.isFeatured,
    allowAdvance: tour.allowAdvance,
    image:
      getMediaProxyUrl(tour.heroImageUrl) ||
      getMediaProxyUrl(tour.imageUrl) ||
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&q=80",
    }));

  const countryFilters = Array.from(
    new Map(
      tours
        .filter((tour) => tour.country?.code)
        .map((tour) => [
          tour.country!.code,
          { code: tour.country!.code, name: tour.country!.name },
        ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Tour Packages
          </h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Discover curated holiday experiences designed for unforgettable memories
          </p>
        </div>
      </div>

      <ToursGridClient tours={formatted} countries={countryFilters} />
    </div>
  );
}

