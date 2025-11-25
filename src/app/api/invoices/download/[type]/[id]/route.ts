import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl } from "@/lib/minio";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> | { type: string; id: string } }
) {
  try {
    // Handle params as Promise (Next.js 15+) or object (Next.js 14)
    const resolvedParams = await Promise.resolve(params);
    
    if (!resolvedParams?.type || !resolvedParams?.id) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";

    if (resolvedParams.type === "application") {
      const application = await prisma.application.findUnique({
        where: { id: resolvedParams.id },
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
      if (!application.invoiceUrl || application.invoiceUrl.trim() === "") {
        return NextResponse.json(
          { error: "Invoice not available yet" },
          { status: 404 }
        );
      }

      try {
        // Get signed URL for invoice
        const signedUrl = await getSignedDocumentUrl(application.invoiceUrl, 300); // 5 minutes expiry
        
        if (!signedUrl) {
          return NextResponse.json(
            { error: "Failed to generate invoice download link" },
            { status: 500 }
          );
        }
        
        // Redirect to signed URL
        return NextResponse.redirect(signedUrl);
      } catch (error) {
        console.error("Error generating signed URL for invoice:", error);
        console.error("Invoice URL:", application.invoiceUrl);
        return NextResponse.json(
          { error: "Failed to generate invoice download link. Please contact support." },
          { status: 500 }
        );
      }
    } else if (resolvedParams.type === "booking") {
      const booking = await prisma.booking.findUnique({
        where: { id: resolvedParams.id },
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
      if (!booking.invoiceUrl || booking.invoiceUrl.trim() === "") {
        return NextResponse.json(
          { error: "Invoice not available yet" },
          { status: 404 }
        );
      }

      try {
        // Get signed URL for invoice
        const signedUrl = await getSignedDocumentUrl(booking.invoiceUrl, 300); // 5 minutes expiry
        
        if (!signedUrl) {
          return NextResponse.json(
            { error: "Failed to generate invoice download link" },
            { status: 500 }
          );
        }
        
        // Redirect to signed URL
        return NextResponse.redirect(signedUrl);
      } catch (error) {
        console.error("Error generating signed URL for invoice:", error);
        console.error("Invoice URL:", booking.invoiceUrl);
        return NextResponse.json(
          { error: "Failed to generate invoice download link. Please contact support." },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be 'application' or 'booking'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error downloading invoice:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : undefined);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

