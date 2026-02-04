import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "@e965/xlsx";
import { ensureRazorpayClient } from "@/lib/razorpay-server";

export const dynamic = "force-dynamic";

// Helper function to fetch Razorpay payment transaction time
async function fetchRazorpayTransactionTime(razorpayPaymentId: string | null): Promise<string | null> {
  if (!razorpayPaymentId) {
    return null;
  }

  try {
    const razorpay = ensureRazorpayClient();
    const razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);
    // Razorpay returns created_at as a Unix timestamp
    if (razorpayPayment.created_at) {
      return new Date(razorpayPayment.created_at * 1000).toISOString();
    }
    return null;
  } catch (error) {
    console.error(`Error fetching Razorpay transaction time for payment ${razorpayPaymentId}:`, error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const format = searchParams.get("format");

    // Build filters
    const where: any = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (status && status !== "all") {
      where.status = status;
    }

    // Get payments with related data
    const payments = await prisma.payment.findMany({
      where,
      include: {
        User: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
        Application: {
          select: {
            id: true,
            country: true,
            visaType: true,
            processedById: true,
            User_Application_processedByIdToUser: {
              select: { name: true, email: true }
            }
          },
        },
        Booking: {
          select: {
            id: true,
            tourName: true,
            processedById: true,
            User_Booking_processedByIdToUser: {
              select: { name: true, email: true }
            }
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter by type if specified
    let filteredPayments = payments;
    if (type === "VISA") {
      filteredPayments = payments.filter((p) => p.applicationId);
    } else if (type === "TOUR") {
      filteredPayments = payments.filter((p) => p.bookingId);
    }

    // Fetch Razorpay transaction times for payments with razorpayPaymentId
    const paymentsWithTransactionTime = await Promise.all(
      filteredPayments.map(async (payment: any) => {
        let razorpayTransactionTime = null;
        if (payment.razorpayPaymentId) {
          razorpayTransactionTime = await fetchRazorpayTransactionTime(payment.razorpayPaymentId);
        }

        // Derive Fields
        const particulars = payment.Application
          ? `${payment.Application.country || ""} ${payment.Application.visaType || ""} Visa`
          : (payment.Booking ? `${payment.Booking.tourName} Package` : "Other Service");

        const salesPerson = payment.Application?.User_Application_processedByIdToUser?.name
          || payment.Booking?.User_Booking_processedByIdToUser?.name
          || "System / Self-Serve";

        return {
          ...payment,
          razorpayTransactionTime,
          particulars,
          salesPerson,
          receivedBankName: "Online Payment Gateway", // Placeholder
          modeOfPayment: payment.razorpayPaymentId ? "Razorpay" : "Manual", // Simplified logic
          receiptVoucherNo: payment.id, // Using internal ID as voucher No
        };
      })
    );

    // Calculate summary
    const summary = {
      totalTransactions: paymentsWithTransactionTime.length,
      successfulTransactions: paymentsWithTransactionTime.filter((p) => p.status === "COMPLETED").length,
      failedTransactions: paymentsWithTransactionTime.filter((p) => p.status === "FAILED").length,
      refundedTransactions: paymentsWithTransactionTime.filter((p) => p.status === "REFUNDED").length,
      totalAmount: paymentsWithTransactionTime.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0),
      visaAmount: paymentsWithTransactionTime.filter((p) => p.applicationId && p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0),
      tourAmount: paymentsWithTransactionTime.filter((p) => p.bookingId && p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0),
    };

    // Export handling
    if (format === "xlsx" || format === "csv") {
      const exportData = paymentsWithTransactionTime.map((payment: any) => ({
        "Sl No": payment.id, // Or index if mapping in loop
        "Receipt Date & Time": payment.createdAt.toISOString(),
        "Particulars": payment.particulars,
        "Transaction Id/ UTR / Ref Id": payment.razorpayPaymentId || "N/A",
        "Amount": payment.amount,
        "Mode of Payment Receipt": payment.modeOfPayment,
        "Received Bank Name": payment.receivedBankName,
        "Curency Type": payment.currency,
        "Paying Party name": payment.User?.name || "Customer",
        "Receipt Voucher No": payment.receiptVoucherNo,
        "Sales Person": payment.salesPerson
      }));

      // Fix Sl No to be index-based for export
      const indexedExportData = exportData.map((row, index) => ({ ...row, "Sl No": index + 1 }));

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(indexedExportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payment Receipt Report");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=payment-receipt-report-${new Date().toISOString().split("T")[0]}.xlsx`,
          },
        });
      } else {
        // CSV
        const csv = [
          Object.keys(indexedExportData[0] || {}).join(","),
          ...indexedExportData.map((row) =>
            Object.values(row).map((v) => {
              const str = String(v);
              return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(",")
          ),
        ].join("\n");
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=payment-receipt-report-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    // JSON response with pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedPayments = paymentsWithTransactionTime.slice(start, end);

    return NextResponse.json({
      summary,
      rows: paginatedPayments.map((p: any) => ({
        id: p.id,
        receiptDate: p.createdAt,
        particulars: p.particulars,
        transactionId: p.razorpayPaymentId || "N/A",
        amount: p.amount,
        modeOfPayment: p.modeOfPayment,
        receivedBankName: p.receivedBankName,
        currency: p.currency,
        payingPartyName: p.User?.name || "Customer",
        receiptVoucherNo: p.receiptVoucherNo,
        salesPerson: p.salesPerson,
        status: p.status // Keeping status for UI styling
      })),
      pagination: {
        page,
        limit,
        total: paymentsWithTransactionTime.length,
        totalPages: Math.ceil(paymentsWithTransactionTime.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payments report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
