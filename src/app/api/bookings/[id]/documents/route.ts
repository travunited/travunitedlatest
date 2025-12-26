import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadVisaDocument } from "@/lib/minio";
import { notify, notifyMultiple } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { getAdminUserIds, getTourAdminEmail } from "@/lib/admin-contacts";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large file uploads

const APP_BASE_URL = process.env.NEXTAUTH_URL || "https://travunited.com";

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

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        BookingTraveller: true,
        User_Booking_userIdToUser: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        Tour: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!booking || booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string;
    const travellerId = formData.get("travellerId") as string | null;

    if (!file || !documentType) {
      return NextResponse.json(
        { error: "File and document type are required" },
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

    // Validate travellerId if provided
    if (travellerId) {
      const traveller = (booking as any).BookingTraveller.find((t: any) => t.id === travellerId);
      if (!traveller) {
        return NextResponse.json(
          { error: "Traveller not found in this booking" },
          { status: 400 }
        );
      }
    }

    // Upload file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const timestamp = Date.now();
    const key = `bookings/${params.id}/${travellerId || "booking"}/${documentType}-${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    await uploadVisaDocument(key, buffer, file.type);

    // Create document record
    const document = await prisma.bookingDocument.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        bookingId: params.id,
        travellerId: travellerId || null,
        type: documentType,
        key: key,
        fileName: file.name,
        status: "PENDING",
      },
    });

    const documentName = document.type || documentType;
    const bookingLink = `/dashboard/bookings/${params.id}?requiredDoc=${document.id}`;

    await notify({
      userId: booking.userId,
      type: "TOUR_BOOKING_DOCUMENT_UPLOADED",
      title: "Document received",
      message: `We received ${documentName} for your ${booking.tourName || (booking as any).Tour?.name || "tour"
        } booking.`,
      link: bookingLink,
      data: {
        bookingId: params.id,
        documentId: document.id,
        documentType: documentName,
      },
      sendEmail: true,
    });

    const adminIds = await getAdminUserIds();
    if (adminIds.length) {
      await notifyMultiple(adminIds, {
        type: "ADMIN_TOUR_DOCUMENT_UPLOADED",
        title: "New tour document uploaded",
        message: `${(booking as any).User_Booking_userIdToUser?.name || (booking as any).User_Booking_userIdToUser?.email || "Customer"} uploaded ${documentName} for booking ${params.id}.`,
        link: `/admin/bookings/${params.id}`,
        data: {
          bookingId: params.id,
          documentId: document.id,
          documentType: documentName,
        },
      });
    }

    const adminEmail = getTourAdminEmail();
    if (adminEmail) {
      const adminLink = `${APP_BASE_URL}/admin/bookings/${params.id}`;
      await sendEmail({
        to: adminEmail,
        subject: `Document uploaded for booking ${params.id}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New booking document received</h2>
            <p><strong>Booking:</strong> ${params.id}</p>
            <p><strong>Customer:</strong> ${(booking as any).User_Booking_userIdToUser?.name || "Unknown"} (${(booking as any).User_Booking_userIdToUser?.email || "N/A"})</p>
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
      id: document.id,
      key: document.key,
      url: `/api/media/${key}`,
      downloadUrl: `/api/media/${key}?download=true&filename=${encodeURIComponent(file.name)}`,
      fileName: document.fileName,
      type: document.type,
      status: document.status,
    });
  } catch (error) {
    console.error("Error uploading booking document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
    });

    if (!booking || booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const documents = await prisma.bookingDocument.findMany({
      where: { bookingId: params.id },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching booking documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

