import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();
    const country = searchParams.get("country") || "";
    const visaType = searchParams.get("visaType") || "";
    const destination = searchParams.get("destination") || "";
    const type = searchParams.get("type") || "all"; // "visa", "tour", or "all"
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Early return if query is too short
    if (query.length < 2 && !country && !visaType && !destination) {
      return NextResponse.json({ visas: [], tours: [] });
    }

    const results: {
      visas: any[];
      tours: any[];
    } = {
      visas: [],
      tours: [],
    };

    // Search visas with optimized query
    if (type === "all" || type === "visa") {
      const visaWhere: any = {
        isActive: true,
      };

      if (country) {
        visaWhere.Country = {
          OR: [
            { code: country.toUpperCase() },
            { code: country.toLowerCase() },
            { name: { contains: country, mode: "insensitive" } },
          ],
        };
      }

      if (visaType) {
        visaWhere.OR = [
          { name: { contains: visaType, mode: "insensitive" } },
          { category: { contains: visaType, mode: "insensitive" } },
          { subtitle: { contains: visaType, mode: "insensitive" } },
        ];
      } else if (query) {
        // Optimized: Use OR for multiple fields, prioritize name matches
        visaWhere.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { subtitle: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ];
      }

      // Use Promise.all for parallel queries if needed, but keep it simple for now
      results.visas = await prisma.visa.findMany({
        where: visaWhere,
        include: {
          Country: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        take: limit,
        orderBy: [
          // Prioritize featured and recently updated
          { isFeatured: "desc" },
          { updatedAt: "desc" },
        ],
      });
    }

    // Search tours with optimized query
    if (type === "all" || type === "tour") {
      const tourWhere: any = {
        isActive: true,
        status: "active",
      };

      if (destination) {
        tourWhere.OR = [
          { destinationCountry: { contains: destination, mode: "insensitive" } },
          { destinationState: { contains: destination, mode: "insensitive" } },
          { primaryDestination: { contains: destination, mode: "insensitive" } },
          { name: { contains: destination, mode: "insensitive" } },
        ];
      } else if (query) {
        // Optimized: Search across multiple fields
        tourWhere.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { destinationCountry: { contains: query, mode: "insensitive" } },
          { destinationState: { contains: query, mode: "insensitive" } },
          { primaryDestination: { contains: query, mode: "insensitive" } },
          { destination: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ];
      }

      results.tours = await prisma.tour.findMany({
        where: tourWhere,
        include: {
          Country: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        take: limit,
        orderBy: [
          // Prioritize featured and recently updated
          { isFeatured: "desc" },
          { updatedAt: "desc" },
        ],
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

