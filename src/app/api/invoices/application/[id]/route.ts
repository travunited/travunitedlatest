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
        User_Application_userIdToUser: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        Visa: {
          include: {
            Country: true,
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
        ApplicationTraveller: {
          include: {
            Traveller: true,
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
    const payments = (application as any).Payment || [];
    const completedPayments = payments.filter((p: any) => p.status === "COMPLETED");
    if (completedPayments.length === 0) {
      return NextResponse.json(
        { error: "No completed payments found for this application" },
        { status: 400 }
      );
    }

    const totalPaid = completedPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const latestPayment = completedPayments[0] as any;

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
    const visa = (application as any).Visa;
    const travellers = (application as any).ApplicationTraveller || [];
    const user = (application as any).User_Application_userIdToUser;

    const visaName = visa?.name || application.visaType || "Visa Application";
    const countryName = visa?.Country?.name || application.country || "";

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
      customerName: user?.name || "Customer",
      customerEmail: user?.email,
      customerPhone: user?.phone || undefined,
      itemName: `${countryName} ${visaName}`,
      itemDescription: visa?.processingTime
        ? `Processing Time: ${visa.processingTime}`
        : undefined,
      quantity: travellers.length,
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

