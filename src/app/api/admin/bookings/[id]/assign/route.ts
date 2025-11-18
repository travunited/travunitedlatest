import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";

export const dynamic = "force-dynamic";

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
    const { adminId } = body;

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin ID is required" },
        { status: 400 }
      );
    }

    // Verify admin exists
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!admin || (admin.role !== "STAFF_ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Invalid admin user" },
        { status: 400 }
      );
    }

    // Update booking
    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        processedById: adminId,
      },
      include: {
        processedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log audit event
    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.BOOKING,
      entityId: params.id,
      action: AuditAction.UPDATE,
      description: `Booking assigned to ${admin.name || admin.email}`,
      metadata: {
        assignedToId: adminId,
        assignedToName: admin.name || admin.email,
      },
    });

    return NextResponse.json({
      message: "Booking assigned successfully",
      booking,
    });
  } catch (error) {
    console.error("Error assigning booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

