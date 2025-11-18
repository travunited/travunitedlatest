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

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const unassigned = searchParams.get("unassigned") === "true";
    const assigned = searchParams.get("assigned") === "true";
    const rejected = searchParams.get("rejected") === "true";
    const country = searchParams.get("country");
    const visaType = searchParams.get("visaType");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const assignedAdmin = searchParams.get("assignedAdmin");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    
    if (country) {
      where.country = {
        contains: country,
        mode: "insensitive",
      };
    }
    
    if (visaType) {
      where.visaType = {
        contains: visaType,
        mode: "insensitive",
      };
    }
    
    // Filter unassigned applications
    if (unassigned) {
      where.processedById = null;
    }
    
    // Filter assigned applications
    if (assigned) {
      where.processedById = {
        not: null,
      };
    }
    
    // Filter applications with rejected documents
    if (rejected) {
      where.documents = {
        some: {
          status: "REJECTED",
        },
      };
    }
    
    // Date range filter
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
    
    // Filter by assigned admin email
    if (assignedAdmin) {
      where.processedBy = {
        email: {
          contains: assignedAdmin,
          mode: "insensitive",
        },
      };
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        processedBy: {
          select: {
            name: true,
            email: true,
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
