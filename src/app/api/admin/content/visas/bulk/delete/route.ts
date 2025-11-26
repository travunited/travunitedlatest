import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one visa ID is required"),
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

    // Check if any visas have active applications
    let visasWithApplications: Array<{
      id: string;
      name: string;
      _count: { applications: number };
    }> = [];
    try {
      visasWithApplications = await prisma.visa.findMany({
        where: {
          id: { in: data.ids },
          applications: {
            some: {
              status: {
                notIn: ["REJECTED", "CANCELLED"],
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              applications: {
                where: {
                  status: {
                    notIn: ["REJECTED", "CANCELLED"],
                  },
                },
              },
            },
          },
        },
      });
    } catch (queryError) {
      console.error("Error checking visas with applications:", queryError);
      // If the query fails, we'll still try to delete but log the error
    }

    if (visasWithApplications.length > 0) {
      const visaNames = visasWithApplications.map((v) => v.name).join(", ");
      return NextResponse.json(
        {
          error: "Cannot delete visas with active applications",
          details: {
            visas: visaNames,
            count: visasWithApplications.length,
          },
        },
        { status: 400 }
      );
    }

    // Delete related records first (requirements and FAQs) to avoid foreign key constraints
    // Then delete the visas
    const deleteResult = await prisma.$transaction(async (tx) => {
      // Delete visa document requirements
      await tx.visaDocumentRequirement.deleteMany({
        where: {
          visaId: { in: data.ids },
        },
      });

      // Delete visa FAQs
      await tx.visaFaq.deleteMany({
        where: {
          visaId: { in: data.ids },
        },
      });

      // Finally delete the visas
      const result = await tx.visa.deleteMany({
        where: {
          id: { in: data.ids },
        },
      });

      return result;
    });

    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} visa record(s)`,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error("Error bulk deleting visas:", error);
    
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
            error: "Cannot delete visa(s) because they are referenced by other records",
            details: "Please ensure there are no active applications or other dependencies"
          },
          { status: 400 }
        );
      }
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "One or more visas not found" },
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

