import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, ReviewType } from "@prisma/client";
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

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const rating = searchParams.get("rating");
    const tourName = searchParams.get("tourName");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Prisma.ReviewWhereInput = {};

    if (type && type !== "ALL") {
      where.type = type as ReviewType;
    }

    if (rating && rating !== "ALL") {
      const parsed = parseInt(rating, 10);
      if (!Number.isNaN(parsed)) {
        where.rating = parsed;
      }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (tourName) {
      where.booking = {
        tourName: {
          contains: tourName,
          mode: "insensitive",
        },
      };
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        application: tourName ? undefined : {
          select: {
            id: true,
            country: true,
            visaType: true,
          },
        },
        booking: {
          select: {
            id: true,
            tourName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
