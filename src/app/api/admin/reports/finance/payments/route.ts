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
          },
        },
        Application: {
          select: {
            id: true,
            country: true,
            visaType: true,
          },
        },
        Booking: {
          select: {
            id: true,
            tourName: true,
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
        const razorpayTransactionTime = await fetchRazorpayTransactionTime(payment.razorpayPaymentId);
        return {
          ...payment,
          razorpayTransactionTime,
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
        "Date & Time": payment.createdAt.toISOString(),
        "Razorpay Transaction Time": payment.razorpayTransactionTime || "N/A",
        "Payment ID": payment.razorpayPaymentId || "N/A",
        "Order ID": payment.razorpayOrderId || "N/A",
        "Application/Booking ID": payment.applicationId || payment.bookingId || "N/A",
        "Type": payment.applicationId ? "Visa" : payment.bookingId ? "Tour" : "N/A",
        "Customer Name": payment.User.name || "Customer",
        "Customer Email": payment.User.email || "N/A",
        "Payment Status": payment.status,
        "Amount (INR)": payment.amount,
        "Currency": payment.currency,
        "Country": payment.Application?.country || "N/A",
        "Visa Type / Tour": payment.Application?.visaType || payment.Booking?.tourName || "N/A",
      }));

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payments");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=payments-report-${new Date().toISOString().split("T")[0]}.xlsx`,
          },
        });
      } else {
        // CSV
        const csv = [
          Object.keys(exportData[0] || {}).join(","),
          ...exportData.map((row) =>
            Object.values(row).map((v) => {
              const str = String(v);
              return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(",")
          ),
        ].join("\n");
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=payments-report-${new Date().toISOString().split("T")[0]}.csv`,
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
        date: p.createdAt,
        razorpayTransactionTime: p.razorpayTransactionTime,
        paymentId: p.razorpayPaymentId,
        orderId: p.razorpayOrderId,
        applicationId: p.applicationId,
        bookingId: p.bookingId,
        type: p.applicationId ? "Visa" : p.bookingId ? "Tour" : "Other",
        customerName: p.User.name || "Customer",
        customerEmail: p.User.email || "N/A",
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        country: p.Application?.country,
        visaType: p.Application?.visaType,
        tourName: p.Booking?.tourName,
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

