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
      select: { code: true },
    });

    if (!promoCode) {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }

    // Get all usages
    const usages = await prisma.promoCodeUsage.findMany({
      where: { promoCodeId: params.id },
      include: {
        user: {
          select: {
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
    });

    // Generate CSV
    const csvHeader = [
      "Date",
      "User Email",
      "User Name",
      "Type",
      "Application/Booking ID",
      "Details",
      "Original Amount (₹)",
      "Discount Amount (₹)",
      "Final Amount (₹)",
      "IP Address",
    ].join(",");

    const csvRows = usages.map((usage) => {
      const date = new Date(usage.usedAt).toISOString();
      const type = usage.applicationId ? "Visa" : usage.bookingId ? "Tour" : "Unknown";
      const details = usage.application
        ? `${usage.application.country} ${usage.application.visaType}`
        : usage.booking
        ? usage.booking.tourName || ""
        : "";
      const id = usage.applicationId || usage.bookingId || "";

      return [
        date,
        usage.user.email || "",
        usage.user.name || "",
        type,
        id,
        details,
        (usage.originalAmount / 100).toFixed(2),
        (usage.discountAmount / 100).toFixed(2),
        (usage.finalAmount / 100).toFixed(2),
        usage.ipAddress || "",
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvContent = [csvHeader, ...csvRows].join("\n");

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="promo-code-${promoCode.code}-analytics-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting promo code analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
