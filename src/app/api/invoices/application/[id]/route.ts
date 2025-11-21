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

    const application = await prisma.application.findUnique({
      where: { id: params.id },
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

    // Check if user has access (owner or admin)
    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (application.userId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get completed payments
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
    const companyEmail = process.env.COMPANY_EMAIL || "support@travunited.com";
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

