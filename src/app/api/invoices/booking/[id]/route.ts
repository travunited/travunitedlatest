import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const bookingId = resolvedParams.id;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        User_Booking_userIdToUser: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        Payment: {
          where: {
            status: "COMPLETED",
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        BookingTraveller: {
          include: {
            Traveller: true,
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

    // Check if user has access (owner or admin)
    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (booking.userId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get completed payments
    const payments = (booking as any).Payment || [];
    const completedPayments = payments.filter((p: any) => p.status === "COMPLETED");
    if (completedPayments.length === 0) {
      return NextResponse.json(
        { error: "No completed payments found for this booking" },
        { status: 400 }
      );
    }

    const totalPaid = completedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const latestPayment = completedPayments[0] as any;

    // Generate invoice number
    const year = new Date(booking.createdAt).getFullYear();
    const invoiceNumber = `INV-${year}-${booking.id.slice(-8).toUpperCase()}`;

    // Company info (you can move this to environment variables or settings)
    const companyName = process.env.COMPANY_NAME || "Travunited";
    const companyAddress = process.env.COMPANY_ADDRESS || "Your Company Address";
    const companyPhone = process.env.COMPANY_PHONE;
    const companyEmail = process.env.COMPANY_EMAIL || "support@travunited.com";
    const companyGSTIN = process.env.COMPANY_GSTIN;

    // Safely get traveller count
    const travellers = (booking as any).BookingTraveller || [];
    const travellerCount = travellers.length || 1;

    // Prepare invoice data
    const user = (booking as any).User_Booking_userIdToUser;

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
      customerName: user?.name || "Customer",
      customerEmail: user?.email || "customer@example.com",
      customerPhone: user?.phone || undefined,
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

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=invoice-${invoiceNumber}.pdf`,
      },
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

