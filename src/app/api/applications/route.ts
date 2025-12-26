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
          include: {
            VisaDocumentRequirement: true,
          },
        },
        PromoCodeUsage: {
          include: {
            promoCode: true,
          },
        },
      } as any,
      orderBy: {
        createdAt: "desc",
      },
    });

    const mappedApplications = applications.map((app: any) => ({
      ...app,
      documents: app.documents,
      visaSubType: app.VisaSubType,
      visa: app.Visa,
      promoCode: app.PromoCodeUsage?.[0]?.promoCode,
      VisaSubType: undefined,
      Visa: undefined,
      PromoCodeUsage: undefined,
    }));

    return NextResponse.json(mappedApplications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

