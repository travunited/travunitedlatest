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

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const customer = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        applications: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            country: true,
            visaType: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        bookings: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            tourName: true,
            status: true,
            totalAmount: true,
            travelDate: true,
            createdAt: true,
          },
        },
      },
    });

    const reviews = await prisma.review.findMany({
      where: { userId: params.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        rating: true,
        comment: true,
        isVisible: true,
        createdAt: true,
        application: {
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
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    if (customer.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Not a customer" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ...customer,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
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

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, phone } = body;

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

