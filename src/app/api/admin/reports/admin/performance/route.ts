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
    const adminId = searchParams.get("adminId");
    const format = searchParams.get("format");

    // Build date filter for applications/bookings
    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      dateFilter.updatedAt = {};
      if (dateFrom && dateFrom.trim() !== "") {
        try {
          dateFilter.updatedAt.gte = new Date(dateFrom);
          if (isNaN(dateFilter.updatedAt.gte.getTime())) {
            throw new Error(`Invalid dateFrom: ${dateFrom}`);
          }
        } catch (dateError) {
          console.error("Invalid dateFrom:", dateFrom, dateError);
          return NextResponse.json(
            { error: `Invalid dateFrom parameter: ${dateFrom}` },
            { status: 400 }
          );
        }
      }
      if (dateTo && dateTo.trim() !== "") {
        try {
          const toDate = new Date(dateTo);
          if (isNaN(toDate.getTime())) {
            throw new Error(`Invalid dateTo: ${dateTo}`);
          }
          toDate.setHours(23, 59, 59, 999);
          dateFilter.updatedAt.lte = toDate;
        } catch (dateError) {
          console.error("Invalid dateTo:", dateTo, dateError);
          return NextResponse.json(
            { error: `Invalid dateTo parameter: ${dateTo}` },
            { status: 400 }
          );
        }
      }
    }

    // Get all admins
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ["STAFF_ADMIN", "SUPER_ADMIN"],
        },
        ...(adminId ? { id: adminId } : {}),
      },
      include: {
        processedApplications: {
          where: dateFilter,
          include: {
            documents: {
              where: {
                status: {
                  in: ["APPROVED", "REJECTED"],
                },
              },
            },
          },
        },
        processedBookings: {
          where: dateFilter,
        },
      },
    });

    // Calculate performance metrics for each admin
    const adminData = admins.map((admin) => {
      const applications = Array.isArray(admin.processedApplications) ? admin.processedApplications : [];
      const bookings = Array.isArray(admin.processedBookings) ? admin.processedBookings : [];
      
      // Applications assigned
      const applicationsAssigned = applications.length;
      
      // Applications processed (status changed from NEW/IN_PROCESS to APPROVED/REJECTED)
      const applicationsProcessed = applications.filter((app) => 
        app.status === "APPROVED" || app.status === "REJECTED"
      ).length;
      
      // Calculate average processing time
      let totalProcessingTime = 0;
      let processedCount = 0;
      
      applications.forEach((app) => {
        if ((app.status === "APPROVED" || app.status === "REJECTED") && app.updatedAt && app.createdAt) {
          const processingTime = app.updatedAt.getTime() - app.createdAt.getTime();
          totalProcessingTime += processingTime;
          processedCount++;
        }
      });
      
      const avgProcessingTime = processedCount > 0
        ? totalProcessingTime / processedCount / (1000 * 60 * 60) // Convert to hours
        : 0;
      
      // Pending applications > 7 days
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const pendingOver7Days = applications.filter((app) => 
        (app.status === "SUBMITTED" || app.status === "IN_PROCESS") &&
        app.createdAt &&
        app.createdAt < sevenDaysAgo
      ).length;
      
      // Document verifications
      const documentVerifications = applications.reduce((sum, app) => 
        sum + (Array.isArray(app.documents) ? app.documents.length : 0), 0
      );

      return {
        id: admin.id,
        name: admin.name || admin.email,
        email: admin.email,
        applicationsAssigned,
        applicationsProcessed,
        avgProcessingTimeHours: avgProcessingTime,
        pendingOver7Days,
        documentVerifications,
        bookingsProcessed: bookings.length,
      };
    });

    // Sort by applications assigned descending
    adminData.sort((a, b) => b.applicationsAssigned - a.applicationsAssigned);

    // Export handling
    if (format === "pdf") {
      const headers = ["Admin", "Email", "Applications Assigned", "Applications Processed", "Avg Processing Time (hrs)", "Pending >7 Days", "Document Verifications"];
      const rows = adminData.map((a) => [
        a.name,
        a.email,
        a.applicationsAssigned,
        a.applicationsProcessed,
        a.avgProcessingTimeHours.toFixed(1),
        a.pendingOver7Days,
        a.documentVerifications,
      ]);

      const pdfBuffer = await generatePDF({
        title: "Admin Performance Report",
        filters: {
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
        summary: {
          "Total Admins": adminData.length,
          "Total Applications Assigned": adminData.reduce((sum, a) => sum + a.applicationsAssigned, 0),
          "Total Applications Processed": adminData.reduce((sum, a) => sum + a.applicationsProcessed, 0),
        },
        headers,
        rows,
      });

      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=admin-performance-${new Date().toISOString().split("T")[0]}.pdf`,
        },
      });
    }

    if (format === "xlsx" || format === "csv") {
      const exportData = adminData.map((admin) => ({
        "Admin Name": admin.name,
        "Email": admin.email,
        "Applications Assigned": admin.applicationsAssigned,
        "Applications Processed": admin.applicationsProcessed,
        "Average Processing Time (Hours)": admin.avgProcessingTimeHours.toFixed(1),
        "Pending > 7 Days": admin.pendingOver7Days,
        "Document Verifications": admin.documentVerifications,
        "Bookings Processed": admin.bookingsProcessed,
      }));

      if (format === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Admin Performance");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename=admin-performance-${new Date().toISOString().split("T")[0]}.xlsx`,
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
            "Content-Disposition": `attachment; filename=admin-performance-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }
    }

    return NextResponse.json({
      summary: {
        totalAdmins: adminData.length,
        totalApplicationsAssigned: adminData.reduce((sum, a) => sum + a.applicationsAssigned, 0),
        totalApplicationsProcessed: adminData.reduce((sum, a) => sum + a.applicationsProcessed, 0),
      },
      rows: adminData,
    });
  } catch (error) {
    console.error("Error fetching admin performance report:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });
    
    return NextResponse.json(
      { 
        error: errorMessage,
        // Only include stack in development
        ...(process.env.NODE_ENV === "development" && errorStack ? { details: errorStack } : {})
      },
      { status: 500 }
    );
  }
}

