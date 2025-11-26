import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { uploadVisaDocument } from "@/lib/minio";
export const dynamic = "force-dynamic";

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
    const amount = formData.get("amount");
    const proofFile = formData.get("proof") as File | null;

    if (!amount) {
      return NextResponse.json(
        { error: "Amount is required" },
        { status: 400 }
      );
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        payments: {
          where: {
            status: "COMPLETED",
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

    let proofFileKey: string | null = null;
    if (proofFile) {
      try {
        const buffer = Buffer.from(await proofFile.arrayBuffer());
        const fileExtension = proofFile.name.split('.').pop() || 'pdf';
        const fileName = `payment-proofs/booking-${booking.id}-${Date.now()}.${fileExtension}`;
        proofFileKey = await uploadVisaDocument(fileName, buffer, proofFile.type);
      } catch (uploadError) {
        console.error("Error uploading payment proof:", uploadError);
        // Continue without proof file
      }
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: booking.userId,
        bookingId: booking.id,
        amount: amountNum,
        currency: booking.currency || "INR",
        status: "COMPLETED",
        // Store proof file key in metadata if needed
        // For now, we'll add it to booking notes
      },
    });

    // Update booking notes with payment info
    const paymentNote = `[OFFLINE PAYMENT ${new Date().toISOString()}] Amount: ₹${amountNum.toLocaleString()}${proofFileKey ? ` | Proof: ${proofFileKey}` : ""}`;
    await prisma.booking.update({
      where: { id: params.id },
      data: {
        notes: booking.notes 
          ? `${booking.notes}\n\n${paymentNote}`
          : paymentNote
      },
    });

    // Log audit event
    try {
      await logAuditEvent({
        adminId: session.user.id,
        entityType: AuditEntityType.PAYMENT,
        entityId: payment.id,
        action: AuditAction.CREATE,
        description: `Offline payment recorded for booking ${booking.id}. Amount: ₹${amountNum.toLocaleString()}`,
        metadata: {
          bookingId: booking.id,
          amount: amountNum,
          method: "OFFLINE",
          proofFileKey,
        },
      });
    } catch (auditError) {
      console.error("Error logging audit event:", auditError);
    }

    return NextResponse.json({ 
      message: "Offline payment recorded successfully",
      payment 
    });
  } catch (error) {
    console.error("Error recording offline payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

