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
    const minBookings = searchParams.get("minBookings");
    const minLifetimeValue = searchParams.get("minLifetimeValue");
    const format = searchParams.get("format");

    // Get all customers with their applications and bookings
    const users = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
      },
      include: {
        applications: {
          include: {
            payments: {
              where: {
                status: "COMPLETED",
              },
            },
          },
        },
        bookings: {
          include: {
            payments: {
              where: {
                status: "COMPLETED",
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate customer metrics
    const customerData = users.map((user) => {
      const visaApplications = user.applications.length;
      const tourBookings = user.bookings.length;
      
      const visaRevenue = user.applications.reduce((sum, app) => {
        return sum + app.payments.reduce((pSum, p) => pSum + p.amount, 0);
      }, 0);
      
      const tourRevenue = user.bookings.reduce((sum, booking) => {
        return sum + booking.payments.reduce((pSum, p) => pSum + p.amount, 0);
      }, 0);
      
      const totalLifetimeRevenue = visaRevenue + tourRevenue;

      // Get last activity date
      const lastActivity = Math.max(
        ...user.applications.map((a) => a.updatedAt.getTime()),
        ...user.bookings.map((b) => b.updatedAt.getTime()),
        user.createdAt.getTime()
      );

      return {
        id: user.id,
        name: user.name || "N/A",
        email: user.email,
        phone: user.phone || "N/A",
        visaApplications,
        tourBookings,
        totalLifetimeRevenue,
        createdAt: user.createdAt,
        lastActivity: new Date(lastActivity),
      };
    });

    // Apply filters
    let filteredCustomers = customerData;

    if (dateFrom || dateTo) {
      filteredCustomers = filteredCustomers.filter((customer) => {
        const customerDate = customer.createdAt;
        if (dateFrom && customerDate < new Date(dateFrom)) return false;
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (customerDate > toDate) return false;
        }
        return true;
      });
    }

    if (minBookings) {
      const min = parseInt(minBookings);
      filteredCustomers = filteredCustomers.filter(
        (c) => c.visaApplications + c.tourBookings >= min
      );
    }

    if (minLifetimeValue) {
      const min = parseInt(minLifetimeValue);
      filteredCustomers = filteredCustomers.filter(
        (c) => c.totalLifetimeRevenue >= min
      );
    }

    // Sort by lifetime value descending
    filteredCustomers.sort((a, b) => b.totalLifetimeRevenue - a.totalLifetimeRevenue);

    // Export handling
    if (format === "pdf") {
      const headers = ["Name", "Email", "Phone", "Visa Apps", "Tour Bookings", "Lifetime Revenue (INR)", "Signup Date", "Last Activity"];
      const rows = filteredCustomers.slice(0, 100).map((c) => [
        c.name,
        c.email,
        c.phone,
        c.visaApplications,
        c.tourBookings,
        c.totalLifetimeRevenue,
        c.createdAt.toISOString().split("T")[0],
        c.lastActivity.toISOString().split("T")[0],
      ]);

      const pdfBuffer = await generatePDF({
        title: "Customer Report",
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          minBookings: minBookings || undefined,
          minLifetimeValue: minLifetimeValue || undefined,
        },
        summary: {
          "Total Customers": filteredCustomers.length,
          "Total Lifetime Revenue": `₹${filteredCustomers.reduce((sum, c) => sum + c.totalLifetimeRevenue, 0).toLocaleString()}`,
        },
        headers,
        rows,
        maxRows: 100,
      });

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=customer-report-${new Date().toISOString().split("T")[0]}.pdf`,
        },
      });
    }

    if (format === "xlsx" || format === "csv") {
      const exportData = filteredCustomers.map((customer) => ({
        "Name": customer.name,
        "Email": customer.email,
        "Phone": customer.phone,
        "Visa Applications": customer.visaApplications,
        "Tour Bookings": customer.tourBookings,
        "Total Lifetime Revenue (INR)": customer.totalLifetimeRevenue,
        "Signup Date": customer.createdAt.toISOString().split("T")[0],
        "Last Activity": customer.lastActivity.toISOString().split("T")[0],
      }));

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Customers");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=customer-report-${new Date().toISOString().split("T")[0]}.xlsx`,
          },
        });
      } else {
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
            "Content-Disposition": `attachment; filename=customer-report-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    // JSON response with pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedCustomers = filteredCustomers.slice(start, end);

    return NextResponse.json({
      summary: {
        totalCustomers: filteredCustomers.length,
        totalLifetimeRevenue: filteredCustomers.reduce((sum, c) => sum + c.totalLifetimeRevenue, 0),
      },
      rows: paginatedCustomers,
      pagination: {
        page,
        limit,
        total: filteredCustomers.length,
        totalPages: Math.ceil(filteredCustomers.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching customer report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

