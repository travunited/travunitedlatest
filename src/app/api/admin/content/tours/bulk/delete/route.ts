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

    if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = bulkDeleteSchema.parse(body);

    // Check if any tours have ANY bookings (including cancelled/completed)
    let toursWithBookings: Array<{
      id: string;
      name: string;
      _count: { bookings: number };
    }> = [];
    try {
      toursWithBookings = await prisma.tour.findMany({
        where: {
          id: { in: data.ids },
          bookings: {
            some: {},
          },
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              bookings: true, // Count ALL bookings, not just active ones
            },
          },
        },
      });
    } catch (queryError) {
      console.error("Error checking tours with bookings:", queryError);
      // If the query fails, we'll still try to delete but log the error
    }

    if (toursWithBookings.length > 0) {
      const tourNames = toursWithBookings.map((t) => `${t.name} (${t._count.bookings} booking(s))`).join(", ");
      return NextResponse.json(
        {
          error: "Cannot delete tours with existing bookings",
          details: {
            tours: tourNames,
            count: toursWithBookings.length,
            message: "Tours with bookings cannot be deleted. Please archive them instead or delete bookings first.",
          },
        },
        { status: 400 }
      );
    }

    // Delete related records first (addOns, days) to avoid foreign key constraints
    // Then delete the tours
    const deleteResult = await prisma.$transaction(async (tx) => {
      // Get all TourAddOn IDs for these tours
      const tourAddOns = await tx.tourAddOn.findMany({
        where: {
          tourId: { in: data.ids },
        },
        select: { id: true },
      });
      const addOnIds = tourAddOns.map((addOn) => addOn.id);

      // Delete BookingAddOn records that reference these TourAddOns
      if (addOnIds.length > 0) {
        await tx.bookingAddOn.deleteMany({
          where: {
            addOnId: { in: addOnIds },
          },
        });
      }

      // Delete TourAddOn records
      await tx.tourAddOn.deleteMany({
        where: {
          tourId: { in: data.ids },
        },
      });

      // Delete TourDay records (must be deleted before Tour due to FK constraint)
      await tx.tourDay.deleteMany({
        where: {
          tourId: { in: data.ids },
        },
      });

      // Finally delete the tours
      const result = await tx.tour.deleteMany({
        where: {
          id: { in: data.ids },
        },
      });

      return result;
    }, {
      timeout: 30000, // 30 second timeout for large deletions
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

    // Check for Prisma foreign key constraint errors
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2003") {
        return NextResponse.json(
          { 
            error: "Cannot delete tour(s) because they are referenced by other records",
            details: "Please ensure there are no active bookings or other dependencies"
          },
          { status: 400 }
        );
      }
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "One or more tours not found" },
          { status: 404 }
        );
      }
    }

    // Log full error details for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      error,
    });

    return NextResponse.json(
      { 
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

