import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl } from "@/lib/minio";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { type: string; id: string } }
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

    if (params.type === "application") {
      const application = await prisma.application.findUnique({
        where: { id: params.id },
      });

      if (!application) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }

      // Check access (owner or admin)
      if (application.userId !== session.user.id && !isAdmin) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }

      // Check if invoice exists
      if (!application.invoiceUrl) {
        return NextResponse.json(
          { error: "Invoice not available yet" },
          { status: 404 }
        );
      }

      // Get signed URL for invoice
      const signedUrl = await getSignedDocumentUrl(application.invoiceUrl, 300); // 5 minutes expiry
      
      // Redirect to signed URL
      return NextResponse.redirect(signedUrl);
    } else if (params.type === "booking") {
      const booking = await prisma.booking.findUnique({
        where: { id: params.id },
      });

      if (!booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }

      // Check access (owner or admin)
      if (booking.userId !== session.user.id && !isAdmin) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }

      // Check if invoice exists
      if (!booking.invoiceUrl) {
        return NextResponse.json(
          { error: "Invoice not available yet" },
          { status: 404 }
        );
      }

      // Get signed URL for invoice
      const signedUrl = await getSignedDocumentUrl(booking.invoiceUrl, 300); // 5 minutes expiry
      
      // Redirect to signed URL
      return NextResponse.redirect(signedUrl);
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be 'application' or 'booking'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error downloading invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

