import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";

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

    // Check if user has access (owner or admin)
    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (booking.userId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get completed payments
    const completedPayments = booking.payments.filter(p => p.status === "COMPLETED");
    if (completedPayments.length === 0) {
      return NextResponse.json(
        { error: "No completed payments found for this booking" },
        { status: 400 }
      );
    }

    const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const latestPayment = completedPayments[0];

    // Generate invoice number
    const year = new Date(booking.createdAt).getFullYear();
    const invoiceNumber = `INV-${year}-${booking.id.slice(-8).toUpperCase()}`;

    // Company info (you can move this to environment variables or settings)
    const companyName = process.env.COMPANY_NAME || "Travunited";
    const companyAddress = process.env.COMPANY_ADDRESS || "Your Company Address";
    const companyPhone = process.env.COMPANY_PHONE;
    const companyEmail = process.env.COMPANY_EMAIL || "support@travunited.com";
    const companyGSTIN = process.env.COMPANY_GSTIN;

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
      customerName: booking.user.name || "Customer",
      customerEmail: booking.user.email,
      customerPhone: booking.user.phone || undefined,
      itemName: booking.tourName || "Tour Package",
      itemDescription: booking.travelDate 
        ? `Travel Date: ${new Date(booking.travelDate).toLocaleDateString("en-IN")}`
        : undefined,
      quantity: booking.travellers.length,
      subtotal: booking.totalAmount,
      tax: 0,
      discount: booking.totalAmount - totalPaid > 0 ? booking.totalAmount - totalPaid : 0,
      total: totalPaid,
      currency: booking.currency || "INR",
      paymentStatus: booking.status === "BOOKED" || booking.status === "CONFIRMED" ? "Paid" : "Partial",
      paymentDate: latestPayment.createdAt 
        ? new Date(latestPayment.createdAt).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : undefined,
      paymentMethod: "Online Payment",
      transactionId: latestPayment.razorpayPaymentId || latestPayment.razorpayOrderId || undefined,
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

