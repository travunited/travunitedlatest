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

    // Build queries in parallel for maximum speed
    const searchPromises: Promise<any>[] = [];

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

      searchPromises.push(
        prisma.visa.findMany({
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
        })
      );
    } else {
      searchPromises.push(Promise.resolve([]));
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

      searchPromises.push(
        prisma.tour.findMany({
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
        })
      );
    } else {
      searchPromises.push(Promise.resolve([]));
    }

    // Execute both queries in parallel for maximum speed
    const [visas, tours] = await Promise.all(searchPromises);

    return NextResponse.json({
      visas: Array.isArray(visas) ? visas : [],
      tours: Array.isArray(tours) ? tours : [],
    });
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

