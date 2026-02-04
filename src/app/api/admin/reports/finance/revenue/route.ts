import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "@e965/xlsx";

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
        User: true, // Amount payer
        Application: {
          select: {
            id: true,
            createdAt: true,
            processedById: true,
            User_Application_processedByIdToUser: {
              select: { name: true, role: true }
            }
          },
        },
        Booking: {
          select: {
            id: true,
            tourName: true,
            createdAt: true,
            processedById: true,
            User_Booking_processedByIdToUser: {
              select: { name: true, role: true }
            }
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
      totalTransactions: number;
      visaTransactions: number;
      packageTransactions: number; // Tours
      ticketTransactions: number; // Placeholder
      otherServiceTransactions: number; // Placeholder
      totalRevenue: number;
      revenueFromCustomers: number;
      revenueFromAgents: number;
      revenueFromCorporates: number;
      revenueFromSalesPerson: number;
      highestRevenueService: string;
      highestRevenueSource: string;
      remarks: string;
    }> = {};

    payments.forEach((payment) => {
      const date = payment.createdAt.toISOString().split("T")[0];
      if (!dailySummary[date]) {
        dailySummary[date] = {
          date,
          totalTransactions: 0,
          visaTransactions: 0,
          packageTransactions: 0,
          ticketTransactions: 0,
          otherServiceTransactions: 0,
          totalRevenue: 0,
          revenueFromCustomers: 0,
          revenueFromAgents: 0,
          revenueFromCorporates: 0,
          revenueFromSalesPerson: 0,
          highestRevenueService: "",
          highestRevenueSource: "",
          remarks: "",
        };
      }

      const dayStats = dailySummary[date];
      dayStats.totalTransactions++;
      dayStats.totalRevenue += payment.amount;

      // Transaction Type
      if (payment.applicationId) {
        dayStats.visaTransactions++;
      } else if (payment.bookingId) {
        dayStats.packageTransactions++;
      } else {
        dayStats.otherServiceTransactions++;
      }

      // Revenue Source Logic
      // Assuming Sales Person if processedById exists on the underlying entity
      const processedBy = payment.Application?.processedById || payment.Booking?.processedById;

      if (processedBy) {
        dayStats.revenueFromSalesPerson += payment.amount;
        // Also attribute to source based on User role if needed, but 'Sales Person' usually implies internal
      } else {
        // Direct customer/agent/corporate
        const role = payment.User?.role;
        if (role === "CUSTOMER") {
          dayStats.revenueFromCustomers += payment.amount;
        } else {
          // Fallback for others
          dayStats.revenueFromCustomers += payment.amount;
        }
      }
    });

    // Post-process to find highest revenue service/source per day (Simplified)
    // For a real implementation, we'd need to group by service/source *per day* first.
    // Given the constraints, I'll assume "Highest Revenue Service" is either Visa or Tour based on daily totals.
    Object.values(dailySummary).forEach(day => {
      // Calculate Visa vs Tour revenue for the day (re-iterating payments slightly inefficient but safe)
      const dayPayments = payments.filter(p => p.createdAt.toISOString().startsWith(day.date));
      const dayVisaRev = dayPayments.filter(p => p.applicationId).reduce((sum, p) => sum + p.amount, 0);
      const dayTourRev = dayPayments.filter(p => p.bookingId).reduce((sum, p) => sum + p.amount, 0);

      day.highestRevenueService = dayVisaRev > dayTourRev ? "Visa" : (dayTourRev > 0 ? "Tour Packages" : "-");

      // Highest Source
      const salesPersonRev = day.revenueFromSalesPerson;
      const customerRev = day.revenueFromCustomers;
      day.highestRevenueSource = salesPersonRev > customerRev ? "Sales Team" : "Direct Customers";
    });

    const dailyData = Object.values(dailySummary).sort((a, b) => a.date.localeCompare(b.date));

    // Export handling
    if (format === "xlsx" || format === "csv") {
      const exportData = dailyData.map((day, index) => ({
        "Sr No": index + 1,
        Date: day.date,
        "Period Type": "Daily",
        "Total Transactions": day.totalTransactions,
        "Visa Transactions": day.visaTransactions,
        "Package Transactions": day.packageTransactions,
        "Ticket Transactions": day.ticketTransactions,
        "Other Service Transactions": day.otherServiceTransactions,
        "Total Revenue (INR)": day.totalRevenue,
        "Avg Revenue per Transaction": day.totalTransactions > 0 ? Math.round(day.totalRevenue / day.totalTransactions) : 0,
        "Revenue from Customers": day.revenueFromCustomers,
        "Revenue from Agents": day.revenueFromAgents,
        "Revenue from Corporates": day.revenueFromCorporates,
        "Revenue from Sales Person": day.revenueFromSalesPerson,
        "Highest Revenue Service": day.highestRevenueService,
        "Highest Revenue Source": day.highestRevenueSource,
        "Remarks": day.remarks
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
      rows: dailyData,
    });
  } catch (error) {
    console.error("Error fetching revenue report:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}
