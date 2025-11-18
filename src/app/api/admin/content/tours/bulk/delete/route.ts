import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one tour ID is required"),
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

    // Check if any tours have active bookings
    const toursWithBookings = await prisma.tour.findMany({
      where: {
        id: { in: data.ids },
        bookings: {
          some: {
            status: {
              notIn: ["CANCELLED", "COMPLETED"],
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            bookings: {
              where: {
                status: {
                  notIn: ["CANCELLED", "COMPLETED"],
                },
              },
            },
          },
        },
      },
    });

    if (toursWithBookings.length > 0) {
      const tourNames = toursWithBookings.map((t) => t.name).join(", ");
      return NextResponse.json(
        {
          error: "Cannot delete tours with active bookings",
          details: {
            tours: tourNames,
            count: toursWithBookings.length,
          },
        },
        { status: 400 }
      );
    }

    // Delete all tours (cascade will handle related records)
    const deleteResult = await prisma.tour.deleteMany({
      where: {
        id: { in: data.ids },
      },
    });

    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} tour record(s)`,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error("Error bulk deleting tours:", error);
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

