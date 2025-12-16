import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl, getDocumentObject } from "@/lib/minio";
import { extractMediaKeyFromUrl } from "@/lib/media";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
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
      // Fetch full application data for access control and invoice generation
      const application = await prisma.application.findUnique({
        where: { id: resolvedParams.id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          visa: {
            include: {
              country: true,
            },
          },
          payments: {
            where: {
              status: "COMPLETED",
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          travellers: {
            include: {
              traveller: true,
            },
          },
        },
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

      // Check if invoice exists in storage
      if (application.invoiceUrl && application.invoiceUrl.trim() !== "") {
        try {
          // Extract the MinIO key from the invoice URL (handles both key and full URL)
          const invoiceKey = extractMediaKeyFromUrl(application.invoiceUrl) || application.invoiceUrl;

          if (invoiceKey) {
            // Try to get the document object first to verify it exists
            const documentObject = await getDocumentObject(invoiceKey);
            if (documentObject) {
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
            }
          }
        } catch (storageError) {
          console.warn("Failed to access invoice from storage, generating on-the-fly:", storageError);
          // Fall through to generate invoice on-the-fly
        }
      }

      // Fallback: Generate invoice on-the-fly if not in storage or storage access fails
      try {
        const completedPayments = application.payments.filter(p => p.status === "COMPLETED");
        if (completedPayments.length === 0) {
          return NextResponse.json(
            { error: "No completed payments found for this application" },
            { status: 400 }
          );
        }

        const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
        const latestPayment = completedPayments[0];

        // Generate invoice number
        const year = new Date(application.createdAt).getFullYear();
        const invoiceNumber = `INV-${year}-${application.id.slice(-8).toUpperCase()}`;

        // Company info
        const companyName = process.env.COMPANY_NAME || "Travunited";
        const companyAddress = process.env.COMPANY_ADDRESS || "Your Company Address";
        const companyPhone = process.env.COMPANY_PHONE;
        const companyEmail = process.env.COMPANY_EMAIL || "support@travunited.in";
        const companyGSTIN = process.env.COMPANY_GSTIN;

        // Prepare invoice data
        const visaName = application.visa?.name || application.visaType || "Visa Application";
        const countryName = application.visa?.country?.name || application.country || "";

        const invoiceData = {
          invoiceNumber,
          invoiceDate: new Date(application.createdAt).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          type: "application" as const,
          companyName,
          companyAddress,
          companyPhone,
          companyEmail,
          companyGSTIN,
          customerName: application.user.name || "Customer",
          customerEmail: application.user.email,
          customerPhone: application.user.phone || undefined,
          itemName: `${countryName} ${visaName}`,
          itemDescription: application.visa?.processingTime
            ? `Processing Time: ${application.visa.processingTime}`
            : undefined,
          quantity: application.travellers.length,
          subtotal: application.totalAmount,
          tax: 0,
          discount: application.totalAmount - totalPaid > 0 ? application.totalAmount - totalPaid : 0,
          total: totalPaid,
          currency: application.currency || "INR",
          paymentStatus: application.status === "APPROVED" || application.status === "IN_PROCESS" ? "Paid" : "Partial",
          paymentDate: latestPayment.createdAt
            ? new Date(latestPayment.createdAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
            : undefined,
          paymentMethod: "Online Payment",
          transactionId: latestPayment.razorpayPaymentId || latestPayment.razorpayOrderId || undefined,
          applicationId: application.id,
          notes: `Thank you for your visa application with ${companyName}. Your application reference is ${application.id}.`,
        };

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // Use Blob for better compatibility
        const pdfBlob = new Blob([pdfBuffer as any], { type: "application/pdf" });

        return new NextResponse(pdfBlob, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=invoice-${invoiceNumber}.pdf`,
          },
        });
      } catch (generateError) {
        console.error("Error generating invoice on-the-fly:", generateError);
        return NextResponse.json(
          {
            error: "Failed to generate invoice. Please contact support.",
            details: process.env.NODE_ENV === "development" ? (generateError instanceof Error ? generateError.message : String(generateError)) : undefined
          },
          { status: 500 }
        );
      }
    } else if (resolvedParams.type === "booking") {
      // Fetch full booking data for access control and invoice generation
      const booking = await prisma.booking.findUnique({
        where: { id: resolvedParams.id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          payments: {
            where: {
              status: "COMPLETED",
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          travellers: {
            include: {
              traveller: true,
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

      // Check access (owner or admin)
      if (booking.userId !== session.user.id && !isAdmin) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }

      // Check if invoice exists in storage
      if (booking.invoiceUrl && booking.invoiceUrl.trim() !== "") {
        try {
          // Extract the MinIO key from the invoice URL (handles both key and full URL)
          const invoiceKey = extractMediaKeyFromUrl(booking.invoiceUrl) || booking.invoiceUrl;

          if (invoiceKey) {
            // Try to get the document object first to verify it exists
            const documentObject = await getDocumentObject(invoiceKey);
            if (documentObject) {
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
            }
          }
        } catch (storageError) {
          console.warn("Failed to access invoice from storage, generating on-the-fly:", storageError);
          // Fall through to generate invoice on-the-fly
        }
      }

      // Fallback: Generate invoice on-the-fly if not in storage or storage access fails
      try {
        const completedPayments = booking.payments?.filter(p => p.status === "COMPLETED") || [];
        if (completedPayments.length === 0) {
          return NextResponse.json(
            { error: "No completed payments found for this booking" },
            { status: 400 }
          );
        }

        const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const latestPayment = completedPayments[0];

        // Generate invoice number
        const year = new Date(booking.createdAt).getFullYear();
        const invoiceNumber = `INV-${year}-${booking.id.slice(-8).toUpperCase()}`;

        // Company info
        const companyName = process.env.COMPANY_NAME || "Travunited";
        const companyAddress = process.env.COMPANY_ADDRESS || "Your Company Address";
        const companyPhone = process.env.COMPANY_PHONE;
        const companyEmail = process.env.COMPANY_EMAIL || "support@travunited.in";
        const companyGSTIN = process.env.COMPANY_GSTIN;

        // Safely get traveller count
        const travellerCount = booking.travellers?.length || 1;

        // Prepare invoice data
        const invoiceData = {
          invoiceNumber,
          invoiceDate: new Date(booking.createdAt).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          type: "booking" as const,
          companyName,
          companyAddress,
          companyPhone,
          companyEmail,
          companyGSTIN,
          customerName: booking.user?.name || "Customer",
          customerEmail: booking.user?.email || "customer@example.com",
          customerPhone: booking.user?.phone || undefined,
          itemName: booking.tourName || "Tour Package",
          itemDescription: booking.travelDate
            ? `Travel Date: ${new Date(booking.travelDate).toLocaleDateString("en-IN")}`
            : undefined,
          quantity: travellerCount,
          subtotal: booking.totalAmount || 0,
          tax: 0,
          discount: Math.max(0, (booking.totalAmount || 0) - totalPaid),
          total: totalPaid,
          currency: booking.currency || "INR",
          paymentStatus: booking.status === "BOOKED" || booking.status === "CONFIRMED" ? "Paid" : "Partial",
          paymentDate: latestPayment?.createdAt
            ? new Date(latestPayment.createdAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
            : undefined,
          paymentMethod: "Online Payment",
          transactionId: latestPayment?.razorpayPaymentId || latestPayment?.razorpayOrderId || undefined,
          bookingId: booking.id,
          travelDate: booking.travelDate
            ? new Date(booking.travelDate).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
            : undefined,
          notes: `Thank you for booking with ${companyName}. Your booking reference is ${booking.id}.`,
        };

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // Use Blob for better compatibility
        const pdfBlob = new Blob([pdfBuffer as any], { type: "application/pdf" });

        return new NextResponse(pdfBlob, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=invoice-${invoiceNumber}.pdf`,
          },
        });
      } catch (generateError) {
        console.error("Error generating invoice on-the-fly:", generateError);
        return NextResponse.json(
          {
            error: "Failed to generate invoice. Please contact support.",
            details: process.env.NODE_ENV === "development" ? (generateError instanceof Error ? generateError.message : String(generateError)) : undefined
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
        message: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

