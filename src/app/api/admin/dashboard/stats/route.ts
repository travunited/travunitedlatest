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

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get today's date range (start and end of today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's Visa Stats
    const todayApplications = await prisma.application.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const visasToday = {
      newSubmitted: todayApplications.filter(app => app.status === "SUBMITTED").length,
      inProcess: todayApplications.filter(app => app.status === "IN_PROCESS").length,
      approved: todayApplications.filter(app => app.status === "APPROVED").length,
      rejected: todayApplications.filter(app => app.status === "REJECTED").length,
    };

    // Today's Tour Stats
    const todayBookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const toursToday = {
      newBookings: todayBookings.filter(booking => booking.status === "BOOKED").length,
      confirmed: todayBookings.filter(booking => booking.status === "CONFIRMED").length,
      completed: todayBookings.filter(booking => booking.status === "COMPLETED").length,
    };

    // Pending Work - Unassigned Submitted Applications
    const unassignedApplications = await prisma.application.findMany({
      where: {
        status: "SUBMITTED",
        processedById: null,
      },
      include: {
        documents: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Pending Work - Applications with pending documents
    const applicationsWithPendingDocs = await prisma.application.findMany({
      where: {
        status: "SUBMITTED",
        documents: {
          some: {
            status: "PENDING",
          },
        },
      },
      include: {
        documents: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Pending Work - Applications with rejected documents
    const applicationsWithRejectedDocs = await prisma.application.findMany({
      where: {
        documents: {
          some: {
            status: "REJECTED",
          },
        },
      },
      include: {
        documents: {
          where: {
            status: "REJECTED",
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Pending Work - Bookings in Booked but not Confirmed
    const unconfirmedBookings = await prisma.booking.findMany({
      where: {
        status: "BOOKED",
      },
    });

    const pendingWork = {
      unassignedApplications: unassignedApplications.length,
      applicationsWithPendingDocs: applicationsWithPendingDocs.length,
      applicationsWithRejectedDocs: applicationsWithRejectedDocs.length,
      unconfirmedBookings: unconfirmedBookings.length,
    };

    return NextResponse.json({
      visasToday,
      toursToday,
      pendingWork,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

