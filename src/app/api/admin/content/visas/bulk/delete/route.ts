import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = bulkDeleteSchema.parse(body);

    // Check if any visas have active applications
    const visasWithApplications = await prisma.visa.findMany({
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

    // Delete all visas (cascade will handle related records)
    const deleteResult = await prisma.visa.deleteMany({
      where: {
        id: { in: data.ids },
      },
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

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

