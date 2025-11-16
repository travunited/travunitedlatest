import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTourConfirmedEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";

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
    const { status } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const previousStatus = booking.status;

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: { status },
    });

    // Send email if confirmed
    if (status === "CONFIRMED") {
      await sendTourConfirmedEmail(
        booking.user.email,
        booking.id,
        booking.tourName || ""
      );
    }

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.BOOKING,
      entityId: params.id,
      action: AuditAction.STATUS_CHANGE,
      description: `Booking status changed from ${previousStatus} to ${status}`,
      metadata: {
        previousStatus,
        newStatus: status,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating booking status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

