import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const promoCode = await prisma.promoCode.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });

    if (!promoCode) {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }

    // Get all usages with related data
    const usages = await prisma.promoCodeUsage.findMany({
      where: { promoCodeId: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
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
      orderBy: { usedAt: "desc" },
      take: 100, // Limit to recent 100 usages
    });

    // Calculate statistics
    const totalDiscountGiven = usages.reduce((sum, usage) => sum + usage.discountAmount, 0);
    const totalRevenueGenerated = usages.reduce((sum, usage) => sum + usage.finalAmount, 0);
    const averageDiscount = usages.length > 0 ? totalDiscountGiven / usages.length : 0;

    // Usage by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsages = usages.filter(
      (usage) => new Date(usage.usedAt) >= thirtyDaysAgo
    );

    // Group by date
    const usageByDate: Record<string, number> = {};
    recentUsages.forEach((usage) => {
      const date = new Date(usage.usedAt).toISOString().split("T")[0];
      usageByDate[date] = (usageByDate[date] || 0) + 1;
    });

    // Breakdown by type
    const visaCount = usages.filter((u) => u.applicationId).length;
    const tourCount = usages.filter((u) => u.bookingId).length;

    // Top users
    const userUsageCounts: Record<string, { count: number; totalDiscount: number; email: string; name: string | null }> = {};
    usages.forEach((usage) => {
      const userId = usage.userId;
      if (!userUsageCounts[userId]) {
        userUsageCounts[userId] = {
          count: 0,
          totalDiscount: 0,
          email: usage.user.email,
          name: usage.user.name,
        };
      }
      userUsageCounts[userId].count += 1;
      userUsageCounts[userId].totalDiscount += usage.discountAmount;
    });

    const topUsers = Object.entries(userUsageCounts)
      .map(([userId, data]) => ({
        userId,
        ...data,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        currentUses: promoCode.currentUses,
        maxUses: promoCode.maxUses,
      },
      statistics: {
        totalUses: usages.length,
        totalDiscountGiven,
        totalRevenueGenerated,
        averageDiscount: Math.round(averageDiscount),
        visaCount,
        tourCount,
      },
      usageByDate,
      topUsers,
      recentUsages: usages.slice(0, 50).map((usage) => ({
        id: usage.id,
        userEmail: usage.user.email,
        userName: usage.user.name,
        discountAmount: usage.discountAmount,
        finalAmount: usage.finalAmount,
        usedAt: usage.usedAt,
        type: usage.applicationId ? "visa" : usage.bookingId ? "tour" : "unknown",
        application: usage.application
          ? {
              id: usage.application.id,
              country: usage.application.country,
              visaType: usage.application.visaType,
            }
          : null,
        booking: usage.booking
          ? {
              id: usage.booking.id,
              tourName: usage.booking.tourName,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching promo code analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
