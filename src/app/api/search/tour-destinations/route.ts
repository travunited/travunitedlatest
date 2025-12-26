import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    const tours = await prisma.tour.findMany({
      where: {
        isActive: true,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        destinationCountry: true,
        destinationState: true,
        citiesCovered: true,
        primaryDestination: true,
        Country: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    // Extract unique destinations from various fields
    const destinations = new Set<string>();

    tours.forEach((tour) => {
      if (tour.destinationCountry) destinations.add(tour.destinationCountry);
      if (tour.destinationState) destinations.add(tour.destinationState);
      if (tour.primaryDestination) destinations.add(tour.primaryDestination);

      // Parse citiesCovered if it's JSON
      if (tour.citiesCovered) {
        try {
          const cities = typeof tour.citiesCovered === "string"
            ? JSON.parse(tour.citiesCovered)
            : tour.citiesCovered;
          if (Array.isArray(cities)) {
            cities.forEach((city: string) => destinations.add(city));
          }
        } catch {
          // If not JSON, treat as string
          if (typeof tour.citiesCovered === "string") {
            destinations.add(tour.citiesCovered);
          }
        }
      }

      if ((tour as any).Country?.name) destinations.add((tour as any).Country.name);
    });

    // Filter by query if provided
    let filteredDestinations = Array.from(destinations);
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredDestinations = filteredDestinations.filter((dest) =>
        dest.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort and limit
    filteredDestinations.sort();
    filteredDestinations = filteredDestinations.slice(0, 20);

    return NextResponse.json(filteredDestinations);
  } catch (error) {
    console.error("Error fetching tour destinations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

