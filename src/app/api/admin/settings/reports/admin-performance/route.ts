import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



export async function GET(req: Request) {
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
    const format = searchParams.get("format"); // csv or json

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

    // Get all admins
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ["STAFF_ADMIN", "SUPER_ADMIN"],
        },
      },
      include: {
        _count: {
          select: {
            processedApplications: {
              where,
            },
            processedBookings: {
              where,
            },
          },
        },
      },
    });

    // Calculate average processing times
    const adminPerformance = await Promise.all(
      admins.map(async (admin) => {
        // Get applications processed by this admin
        const applications = await prisma.application.findMany({
          where: {
            ...where,
            processedById: admin.id,
            status: {
              in: ["APPROVED", "REJECTED"],
            },
          },
          select: {
            createdAt: true,
            updatedAt: true,
            status: true,
          },
        });

        // Calculate average processing time
        let totalDays = 0;
        let count = 0;

        applications.forEach((app) => {
          const submittedDate = new Date(app.createdAt);
          const processedDate = new Date(app.updatedAt);
          const days = (processedDate.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);
          if (days > 0) {
            totalDays += days;
            count += 1;
          }
        });

        const avgProcessingTime = count > 0 ? totalDays / count : 0;

        return {
          adminName: admin.name || "N/A",
          adminEmail: admin.email,
          applicationsHandled: admin._count.processedApplications,
          bookingsHandled: admin._count.processedBookings,
          avgProcessingTime,
        };
      })
    );

    // Sort by total handled (applications + bookings)
    adminPerformance.sort(
      (a, b) =>
        b.applicationsHandled + b.bookingsHandled - (a.applicationsHandled + a.bookingsHandled)
    );

    if (format === "csv") {
      let csv = "Admin Name,Admin Email,Applications Handled,Bookings Handled,Avg Processing Time (days)\n";
      adminPerformance.forEach((admin) => {
        csv += `${admin.adminName},${admin.adminEmail},${admin.applicationsHandled},${admin.bookingsHandled},${admin.avgProcessingTime.toFixed(1)}\n`;
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="admin-performance-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ admins: adminPerformance });
  } catch (error) {
    console.error("Error generating admin performance report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

