import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one country ID is required"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = bulkDeleteSchema.parse(body);

    // Check if any countries have linked visas or tours
    const countriesWithLinks = await prisma.country.findMany({
      where: {
        id: { in: data.ids },
        OR: [
          {
            visas: {
              some: {},
            },
          },
          {
            tours: {
              some: {},
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            visas: true,
            tours: true,
          },
        },
      },
    });

    if (countriesWithLinks.length > 0) {
      const countryDetails = countriesWithLinks.map((c) => ({
        name: c.name,
        visas: c._count.visas,
        tours: c._count.tours,
      }));

      return NextResponse.json(
        {
          error: "Cannot delete countries with linked visas or tours",
          details: {
            countries: countryDetails,
            count: countriesWithLinks.length,
          },
        },
        { status: 400 }
      );
    }

    // Delete all countries
    const deleteResult = await prisma.country.deleteMany({
      where: {
        id: { in: data.ids },
      },
    });

    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} country record(s)`,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error("Error bulk deleting countries:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

