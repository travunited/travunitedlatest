import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { visaId } = body as { visaId?: string };

    if (!visaId) {
      return NextResponse.json(
        { error: "visaId is required" },
        { status: 400 }
      );
    }

    // Delete existing DRAFT applications for this user and visa
    // Use a transaction to handle potential foreign key constraints
    const result = await prisma.$transaction(async (tx) => {
      // First, find all DRAFT applications for this user and visa
      const applications = await tx.application.findMany({
        where: {
          userId: session.user.id,
          visaId,
          status: "DRAFT",
        },
        select: {
          id: true,
        },
      });

      const applicationIds = applications.map((app) => app.id);

      if (applicationIds.length === 0) {
        return { count: 0 };
      }

      // Delete related records in proper order to handle foreign key constraints
      // 1. Delete documents first
      await tx.applicationDocument.deleteMany({
        where: {
          applicationId: { in: applicationIds },
        },
      });

      // 2. Delete application travellers
      await tx.applicationTraveller.deleteMany({
        where: {
          applicationId: { in: applicationIds },
        },
      });

      // 3. Delete payments (optional FK, but delete anyway)
      await tx.payment.deleteMany({
        where: {
          applicationId: { in: applicationIds },
        },
      });

      // 4. Delete reviews (optional FK)
      await tx.review.deleteMany({
        where: {
          applicationId: { in: applicationIds },
        },
      });

      // 5. Finally delete the applications
      const deleteResult = await tx.application.deleteMany({
        where: {
          userId: session.user.id,
          visaId,
          status: "DRAFT",
        },
      });

      return deleteResult;
    });

    return NextResponse.json({ ok: true, deletedDrafts: result.count });
  } catch (error) {
    console.error("Error starting fresh application:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}


