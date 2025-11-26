import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { notify } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

function ensureAdmin(session: any) {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Forbidden - Admin access required" },
      { status: 403 }
    );
  }
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureAdmin(session);
    if (authError) return authError;

    // TypeScript guard: session is guaranteed to be non-null after ensureAdmin check
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = reviewSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { email: true, name: true },
        },
        travellers: {
          where: {
            documents: {
              some: { id: params.docId },
            },
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

    const document = await prisma.bookingDocument.findUnique({
      where: { id: params.docId },
    });

    if (!document || document.bookingId !== params.id) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update document status
    const updated = await prisma.bookingDocument.update({
      where: { id: params.docId },
      data: {
        status: data.status,
        rejectionReason: data.status === "REJECTED" ? (data.rejectionReason || null) : null,
      },
    });

    // Log audit event
    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.BOOKING,
      entityId: booking.id,
      action: data.status === "APPROVED" ? AuditAction.APPROVE : AuditAction.DOC_REJECT,
      description: `${data.status} document ${document.type} for booking ${booking.id}`,
      metadata: {
        documentId: document.id,
        documentType: document.type,
        status: data.status,
        rejectionReason: data.rejectionReason,
      },
    });

    // Notify user if rejected
    if (data.status === "REJECTED") {
      await notify({
        userId: booking.userId,
        type: "TOUR_BOOKING_DOCUMENT_REJECTED",
        title: "Document Rejected",
        message: `Your ${document.type} document for booking ${booking.tourName || "tour"} has been rejected. ${data.rejectionReason ? `Reason: ${data.rejectionReason}` : ""}`,
        link: `/dashboard/bookings/${booking.id}`,
      });

      // Send email notification
      await sendEmail({
        to: booking.user.email,
        subject: `Document Rejected - ${booking.tourName || "Tour Booking"}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Document Rejected</h1>
            <p>Your ${document.type} document for booking <strong>${booking.tourName || "tour"}</strong> has been rejected.</p>
            ${data.rejectionReason ? `<p><strong>Reason:</strong> ${data.rejectionReason}</p>` : ""}
            <p>Please upload a replacement document:</p>
            <p><a href="${process.env.NEXTAUTH_URL}/dashboard/bookings/${booking.id}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Upload Replacement</a></p>
            <p>Best regards,<br>The Travunited Team</p>
          </div>
        `,
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error reviewing booking document:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

