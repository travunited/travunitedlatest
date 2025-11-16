import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadVisaDocument } from "@/lib/minio";
import { sendTourConfirmedEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";

export async function POST(
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

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

    // Upload voucher
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `vouchers/${params.id}/voucher-${Date.now()}-${file.name}`;
    
    await uploadVisaDocument(key, buffer, file.type);

    // Update booking with voucher URL and status
    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: {
        voucherUrl: key, // In production, use full URL
        status: "CONFIRMED",
      },
    });

    // Send confirmation email
    await sendTourConfirmedEmail(
      booking.user.email,
      booking.id,
      booking.tourName || ""
    );

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.BOOKING,
      entityId: params.id,
      action: AuditAction.APPROVE,
      description: "Tour vouchers uploaded and booking confirmed",
      metadata: {
        documentKey: key,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error uploading voucher:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

