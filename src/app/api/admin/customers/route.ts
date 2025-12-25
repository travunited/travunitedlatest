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
    const search = searchParams.get("search");

    const where: any = {
      role: "CUSTOMER", // Only show customers
    };

    // Filter by status
    if (status === "ACTIVE") {
      where.isActive = true;
    } else if (status === "DISABLED") {
      where.isActive = false;
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            Application_Application_userIdToUser: true,
            Booking_Booking_userIdToUser: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform to include counts
    const customersWithCounts = customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      applicationsCount: customer._count.Application_Application_userIdToUser,
      bookingsCount: customer._count.Booking_Booking_userIdToUser,
    }));

    return NextResponse.json(customersWithCounts);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

