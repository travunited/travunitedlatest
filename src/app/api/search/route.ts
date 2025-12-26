import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const country = searchParams.get("country") || "";
    const visaType = searchParams.get("visaType") || "";
    const destination = searchParams.get("destination") || "";
    const type = searchParams.get("type") || "all"; // "visa", "tour", or "all"

    const results: {
      visas: any[];
      tours: any[];
    } = {
      visas: [],
      tours: [],
    };

    // Search visas
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
      }

      if (query && !visaType) {
        visaWhere.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { subtitle: { contains: query, mode: "insensitive" } },
        ];
      }

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
        take: 20,
        orderBy: {
          updatedAt: "desc",
        },
      });
    }

    // Search tours
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
      }

      if (query && !destination) {
        tourWhere.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { destinationCountry: { contains: query, mode: "insensitive" } },
          { destinationState: { contains: query, mode: "insensitive" } },
          { primaryDestination: { contains: query, mode: "insensitive" } },
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
        take: 20,
        orderBy: {
          updatedAt: "desc",
        },
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

