import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countryCode = searchParams.get("country");

    const where: any = {
      isActive: true,
    };

    if (countryCode) {
      // Try to find country by ID, code, or name
      const country = await prisma.country.findFirst({
        where: {
          OR: [
            { id: countryCode },
            { code: countryCode.toUpperCase() },
            { code: countryCode.toLowerCase() },
            { name: { contains: countryCode, mode: "insensitive" } },
          ],
        },
      });

      if (country) {
        // Only return visas for the found country
        where.countryId = country.id;
      } else {
        // If country not found, return empty array instead of all visas
        return NextResponse.json([]);
      }
    }

    const visas = await prisma.visa.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        subtitle: true,
        category: true,
        Country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Transform Country to country to match frontend interface
    const transformedVisas = visas.map((visa) => {
      const { Country, ...rest } = visa;
      return {
        ...rest,
        country: Country,
      };
    });

    return NextResponse.json(transformedVisas);
  } catch (error) {
    console.error("Error fetching visa types:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

