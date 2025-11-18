import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { generatePDF } from "@/lib/pdf-export";

export const dynamic = "force-dynamic";

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
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        application: {
          select: {
            id: true,
            country: true,
            visaType: true,
          },
        },
        booking: {
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

    // Calculate summary
    const summary = {
      totalTransactions: filteredPayments.length,
      successfulTransactions: filteredPayments.filter((p) => p.status === "COMPLETED").length,
      failedTransactions: filteredPayments.filter((p) => p.status === "FAILED").length,
      refundedTransactions: filteredPayments.filter((p) => p.status === "REFUNDED").length,
      totalAmount: filteredPayments.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0),
      visaAmount: filteredPayments.filter((p) => p.applicationId && p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0),
      tourAmount: filteredPayments.filter((p) => p.bookingId && p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0),
    };

    // Export handling
    if (format === "pdf") {
      const headers = ["Date & Time", "Payment ID", "Type", "Customer", "Status", "Amount (INR)"];
      const rows = filteredPayments.slice(0, 200).map((payment) => [
        payment.createdAt.toISOString(),
        payment.razorpayPaymentId?.slice(0, 20) || "N/A",
        payment.applicationId ? "Visa" : payment.bookingId ? "Tour" : "N/A",
        payment.user.name || payment.user.email,
        payment.status,
        payment.amount,
      ]);

      const pdfBuffer = await generatePDF({
        title: "Payments & Refunds Report",
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          status: status || undefined,
          type: type || undefined,
        },
        summary: {
          "Total Transactions": summary.totalTransactions,
          "Successful": summary.successfulTransactions,
          "Failed": summary.failedTransactions,
          "Refunded": summary.refundedTransactions,
          "Total Amount": `₹${summary.totalAmount.toLocaleString()}`,
        },
        headers,
        rows,
        maxRows: 200,
      });

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=payments-report-${new Date().toISOString().split("T")[0]}.pdf`,
        },
      });
    }

    if (format === "xlsx" || format === "csv") {
      const exportData = filteredPayments.map((payment) => ({
        "Date & Time": payment.createdAt.toISOString(),
        "Payment ID": payment.razorpayPaymentId || "N/A",
        "Order ID": payment.razorpayOrderId || "N/A",
        "Application/Booking ID": payment.applicationId || payment.bookingId || "N/A",
        "Type": payment.applicationId ? "Visa" : payment.bookingId ? "Tour" : "N/A",
        "Customer Name": payment.user.name || "N/A",
        "Customer Email": payment.user.email,
        "Payment Status": payment.status,
        "Amount (INR)": payment.amount,
        "Currency": payment.currency,
        "Country": payment.application?.country || "N/A",
        "Visa Type / Tour": payment.application?.visaType || payment.booking?.tourName || "N/A",
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
    const paginatedPayments = filteredPayments.slice(start, end);

    return NextResponse.json({
      summary,
      rows: paginatedPayments.map((p) => ({
        id: p.id,
        date: p.createdAt,
        paymentId: p.razorpayPaymentId,
        orderId: p.razorpayOrderId,
        applicationId: p.applicationId,
        bookingId: p.bookingId,
        type: p.applicationId ? "Visa" : p.bookingId ? "Tour" : "Other",
        customerName: p.user.name,
        customerEmail: p.user.email,
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        country: p.application?.country,
        visaType: p.application?.visaType,
        tourName: p.booking?.tourName,
      })),
      pagination: {
        page,
        limit,
        total: filteredPayments.length,
        totalPages: Math.ceil(filteredPayments.length / limit),
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

