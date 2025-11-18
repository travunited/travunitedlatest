import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const admin = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            processedApplications: true,
            processedBookings: true,
          },
        },
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    if (admin.role !== "STAFF_ADMIN" && admin.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Not an admin" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ...admin,
      lastLogin: admin.updatedAt, // Proxy for last login
      stats: {
        applicationsHandled: admin._count.processedApplications,
        bookingsHandled: admin._count.processedBookings,
        lastActive: admin.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
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
    const { name, role } = body;

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : undefined,
        role: role !== undefined ? (role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "STAFF_ADMIN") : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

