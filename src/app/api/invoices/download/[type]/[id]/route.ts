import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl, getDocumentObject } from "@/lib/minio";
import { extractMediaKeyFromUrl } from "@/lib/media";
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
        // Extract the MinIO key from the invoice URL (handles both key and full URL)
        const invoiceKey = extractMediaKeyFromUrl(application.invoiceUrl) || application.invoiceUrl;
        
        if (!invoiceKey) {
          console.error("Could not extract invoice key from URL:", application.invoiceUrl);
          return NextResponse.json(
            { error: "Invalid invoice URL format" },
            { status: 500 }
          );
        }

        // Try to get the document object first to verify it exists
        const documentObject = await getDocumentObject(invoiceKey);
        if (!documentObject) {
          console.error("Invoice file not found in storage:", invoiceKey);
          return NextResponse.json(
            { error: "Invoice file not found. Please contact support." },
            { status: 404 }
          );
        }

        // Try to get signed URL first (preferred method)
        try {
          const signedUrl = await getSignedDocumentUrl(invoiceKey, 300); // 5 minutes expiry
          
          if (signedUrl) {
            // Redirect to signed URL
            return NextResponse.redirect(signedUrl);
          }
        } catch (signedUrlError) {
          console.warn("Failed to generate signed URL, falling back to direct stream:", signedUrlError);
        }

        // Fallback: Stream the file directly
        const stream = documentObject.stream;
        const headers = new Headers();
        headers.set("Content-Type", documentObject.contentType || "application/pdf");
        headers.set("Content-Disposition", `attachment; filename="invoice-application-${resolvedParams.id}.pdf"`);
        
        if (documentObject.contentLength) {
          headers.set("Content-Length", documentObject.contentLength.toString());
        }

        // Convert Node.js Readable stream to Web ReadableStream
        const webStream = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk: Buffer) => {
              controller.enqueue(chunk);
            });
            stream.on("end", () => {
              controller.close();
            });
            stream.on("error", (error: Error) => {
              controller.error(error);
            });
          },
          cancel() {
            stream.destroy();
          },
        });

        return new NextResponse(webStream, { headers });
      } catch (error) {
        console.error("Error generating signed URL for invoice:", error);
        console.error("Invoice URL:", application.invoiceUrl);
        console.error("Error details:", error instanceof Error ? error.message : String(error));
        console.error("Error stack:", error instanceof Error ? error.stack : undefined);
        return NextResponse.json(
          { 
            error: "Failed to generate invoice download link. Please contact support.",
            details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
          },
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
        // Extract the MinIO key from the invoice URL (handles both key and full URL)
        const invoiceKey = extractMediaKeyFromUrl(booking.invoiceUrl) || booking.invoiceUrl;
        
        if (!invoiceKey) {
          console.error("Could not extract invoice key from URL:", booking.invoiceUrl);
          return NextResponse.json(
            { error: "Invalid invoice URL format" },
            { status: 500 }
          );
        }

        // Try to get the document object first to verify it exists
        const documentObject = await getDocumentObject(invoiceKey);
        if (!documentObject) {
          console.error("Invoice file not found in storage:", invoiceKey);
          return NextResponse.json(
            { error: "Invoice file not found. Please contact support." },
            { status: 404 }
          );
        }

        // Try to get signed URL first (preferred method)
        try {
          const signedUrl = await getSignedDocumentUrl(invoiceKey, 300); // 5 minutes expiry
          
          if (signedUrl) {
            // Redirect to signed URL
            return NextResponse.redirect(signedUrl);
          }
        } catch (signedUrlError) {
          console.warn("Failed to generate signed URL, falling back to direct stream:", signedUrlError);
        }

        // Fallback: Stream the file directly
        const stream = documentObject.stream;
        const headers = new Headers();
        headers.set("Content-Type", documentObject.contentType || "application/pdf");
        headers.set("Content-Disposition", `attachment; filename="invoice-booking-${resolvedParams.id}.pdf"`);
        
        if (documentObject.contentLength) {
          headers.set("Content-Length", documentObject.contentLength.toString());
        }

        // Convert Node.js Readable stream to Web ReadableStream
        const webStream = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk: Buffer) => {
              controller.enqueue(chunk);
            });
            stream.on("end", () => {
              controller.close();
            });
            stream.on("error", (error: Error) => {
              controller.error(error);
            });
          },
          cancel() {
            stream.destroy();
          },
        });

        return new NextResponse(webStream, { headers });
      } catch (error) {
        console.error("Error generating signed URL for invoice:", error);
        console.error("Invoice URL:", booking.invoiceUrl);
        console.error("Error details:", error instanceof Error ? error.message : String(error));
        console.error("Error stack:", error instanceof Error ? error.stack : undefined);
        return NextResponse.json(
          { 
            error: "Failed to generate invoice download link. Please contact support.",
            details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
          },
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

