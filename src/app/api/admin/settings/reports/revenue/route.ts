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

    // Calculate visa revenue from completed payments for applications
    const visaPayments = await prisma.payment.findMany({
      where: {
        ...where,
        applicationId: { not: null },
        status: "COMPLETED",
      },
      select: {
        amount: true,
      },
    });

    const visaRevenue = visaPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate tour revenue from completed payments for bookings
    const tourPayments = await prisma.payment.findMany({
      where: {
        ...where,
        bookingId: { not: null },
        status: "COMPLETED",
      },
      select: {
        amount: true,
      },
    });

    const tourRevenue = tourPayments.reduce((sum, payment) => sum + payment.amount, 0);

    const revenueSummary = {
      visaRevenue,
      tourRevenue,
      totalRevenue: visaRevenue + tourRevenue,
    };

    return NextResponse.json(revenueSummary);
  } catch (error) {
    console.error("Error generating revenue summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

