import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "@e965/xlsx";
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
    const format = searchParams.get("format");

    // Build date filter
    const where: any = {
      status: "COMPLETED",
    };

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

    // Get all completed payments
    const payments = await prisma.payment.findMany({
      where,
      include: {
        application: {
          select: {
            id: true,
            country: true,
            visaType: true,
            createdAt: true,
          },
        },
        booking: {
          select: {
            id: true,
            tourName: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Calculate totals
    const visaPayments = payments.filter((p) => p.applicationId);
    const tourPayments = payments.filter((p) => p.bookingId);

    const visaRevenue = visaPayments.reduce((sum, p) => sum + p.amount, 0);
    const tourRevenue = tourPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalRevenue = visaRevenue + tourRevenue;

    // Group by date for daily summary
    const dailySummary: Record<string, {
      date: string;
      visaRevenue: number;
      tourRevenue: number;
      totalRevenue: number;
      transactionCount: number;
    }> = {};

    payments.forEach((payment) => {
      const date = payment.createdAt.toISOString().split("T")[0];
      if (!dailySummary[date]) {
        dailySummary[date] = {
          date,
          visaRevenue: 0,
          tourRevenue: 0,
          totalRevenue: 0,
          transactionCount: 0,
        };
      }
      dailySummary[date].transactionCount++;
      dailySummary[date].totalRevenue += payment.amount;
      if (payment.applicationId) {
        dailySummary[date].visaRevenue += payment.amount;
      } else if (payment.bookingId) {
        dailySummary[date].tourRevenue += payment.amount;
      }
    });

    const dailyData = Object.values(dailySummary).sort((a, b) => a.date.localeCompare(b.date));

    // Export handling
    if (format === "pdf") {
      try {
        const headers = ["Date", "Transactions", "Visa Revenue (INR)", "Tour Revenue (INR)", "Total Revenue (INR)"];
        const rows = dailyData.map((day) => [
          day.date,
          day.transactionCount,
          day.visaRevenue,
          day.tourRevenue,
          day.totalRevenue,
        ]);

        const pdfBuffer = await generatePDF({
          title: "Revenue Summary Report",
          filters: {
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
          summary: {
            "Total Revenue": `₹${totalRevenue.toLocaleString()}`,
            "Visa Revenue": `₹${visaRevenue.toLocaleString()}`,
            "Tour Revenue": `₹${tourRevenue.toLocaleString()}`,
            "Total Transactions": payments.length,
          },
          headers,
          rows,
        });

        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new Error("PDF buffer is empty");
        }

        return new NextResponse(pdfBuffer as any, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=revenue-summary-${new Date().toISOString().split("T")[0]}.pdf`,
          },
        });
      } catch (pdfError) {
        console.error("Error generating PDF:", pdfError);
        console.error("PDF error details:", pdfError instanceof Error ? pdfError.message : String(pdfError));
        console.error("PDF error stack:", pdfError instanceof Error ? pdfError.stack : undefined);
        return NextResponse.json(
          { 
            error: "Failed to generate PDF",
            message: pdfError instanceof Error ? pdfError.message : "Unknown error occurred during PDF generation"
          },
          { status: 500 }
        );
      }
    }

    if (format === "xlsx" || format === "csv") {
      const exportData = dailyData.map((day) => ({
        Date: day.date,
        "Transaction Count": day.transactionCount,
        "Visa Revenue (INR)": day.visaRevenue,
        "Tour Revenue (INR)": day.tourRevenue,
        "Total Revenue (INR)": day.totalRevenue,
      }));

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Revenue Summary");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=revenue-summary-${new Date().toISOString().split("T")[0]}.xlsx`,
          },
        });
      } else {
        // CSV
        const csv = [
          Object.keys(exportData[0] || {}).join(","),
          ...exportData.map((row) => Object.values(row).join(",")),
        ].join("\n");
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=revenue-summary-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    // JSON response
    return NextResponse.json({
      summary: {
        totalRevenue,
        visaRevenue,
        tourRevenue,
        totalTransactions: payments.length,
        successfulTransactions: payments.length,
        failedTransactions: 0,
        avgOrderValue: payments.length > 0 ? totalRevenue / payments.length : 0,
      },
      chart: {
        daily: dailyData,
      },
      rows: dailyData,
    });
  } catch (error) {
    console.error("Error fetching revenue report:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : undefined);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}

