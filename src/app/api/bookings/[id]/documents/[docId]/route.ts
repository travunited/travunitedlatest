import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadVisaDocument } from "@/lib/minio";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { notify, notifyMultiple } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { getAdminUserIds, getTourAdminEmail } from "@/lib/admin-contacts";

export const dynamic = "force-dynamic";

const APP_BASE_URL = process.env.NEXTAUTH_URL || "https://travunited.in";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        tour: {
          select: { name: true },
        },
      },
    });

    if (!booking || booking.userId !== session.user.id) {
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

    // Only allow re-upload if document is rejected
    if (document.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Only rejected documents can be re-uploaded" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Validate file
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and PDF files are allowed" },
        { status: 400 }
      );
    }

    // Upload new file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const key = `bookings/${params.id}/${document.travellerId || "booking"}/${document.type}-${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    await uploadVisaDocument(key, buffer, file.type);

    // Update document record
    const updated = await prisma.bookingDocument.update({
      where: { id: params.docId },
      data: {
        key: key,
        fileName: file.name,
        status: "PENDING",
        rejectionReason: null, // Clear rejection reason on re-upload
      },
    });

    const documentName = updated.type || document.type || "Document";
    const bookingLink = `/dashboard/bookings/${params.id}?requiredDoc=${updated.id}`;

    await notify({
      userId: booking.userId,
      type: "TOUR_BOOKING_DOCUMENT_UPLOADED",
      title: "Document re-uploaded",
      message: `We received the updated ${documentName} for your ${
        booking.tourName || booking.tour?.name || "tour"
      } booking.`,
      link: bookingLink,
      data: {
        bookingId: params.id,
        documentId: updated.id,
        documentType: documentName,
      },
      sendEmail: true,
    });

    const adminIds = await getAdminUserIds();
    if (adminIds.length) {
      await notifyMultiple(adminIds, {
        type: "ADMIN_TOUR_DOCUMENT_UPLOADED",
        title: "Tour document re-uploaded",
        message: `${booking.user?.name || booking.user?.email || "Customer"} re-uploaded ${documentName} for booking ${params.id}.`,
        link: `/admin/bookings/${params.id}`,
        data: {
          bookingId: params.id,
          documentId: updated.id,
          documentType: documentName,
        },
      });
    }

    const adminEmail = getTourAdminEmail();
    if (adminEmail) {
      const adminLink = `${APP_BASE_URL}/admin/bookings/${params.id}`;
      await sendEmail({
        to: adminEmail,
        subject: `Document re-uploaded for booking ${params.id}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Document re-uploaded</h2>
            <p><strong>Booking:</strong> ${params.id}</p>
            <p><strong>Customer:</strong> ${booking.user?.name || "Unknown"} (${booking.user?.email || "N/A"})</p>
            <p><strong>Document:</strong> ${documentName}</p>
            <p>
              <a href="${adminLink}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;">
                Review booking
              </a>
            </p>
          </div>
        `,
        category: "tours",
      });
    }

    return NextResponse.json({
      id: updated.id,
      key: updated.key,
      url: `/api/media/${key}`,
      downloadUrl: `/api/media/${key}?download=true&filename=${encodeURIComponent(file.name)}`,
      fileName: updated.fileName,
      type: updated.type,
      status: updated.status,
    });
  } catch (error) {
    console.error("Error re-uploading booking document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
    });

    if (!booking || booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    await prisma.bookingDocument.delete({
      where: { id: params.docId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

