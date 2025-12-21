import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const applications = await prisma.application.findMany({
      where: {
        userId: session.user.id,
        // Filter out expired drafts
        OR: [
          { status: { not: "DRAFT" } },
          {
            status: "DRAFT",
            updatedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        ],
      },
      include: {
        documents: {
          select: {
            id: true,
            documentType: true,
            status: true,
          },
        },
        visaSubType: {
          select: {
            id: true,
            label: true,
            code: true,
          },
        },
        visa: {
          select: {
            id: true,
            name: true,
            visaSubTypeLabel: true,
            entryType: true,
            entryTypeLegacy: true,
          },
        },
        promoCode: {
          select: {
            id: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

