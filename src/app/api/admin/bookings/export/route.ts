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

    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids");

    let where: any = {};
    if (ids) {
      const bookingIds = ids.split(",");
      where.id = {
        in: bookingIds,
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        processedBy: {
          select: {
            name: true,
            email: true,
          },
        },
        payments: {
          where: {
            status: "COMPLETED",
          },
          select: {
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Generate CSV
    const headers = [
      "Booking ID",
      "Tour Name",
      "Travel Date",
      "Status",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Total Amount",
      "Amount Paid",
      "Pending Balance",
      "Assigned To",
      "Booked Date",
      "Updated Date",
    ];

    const rows = bookings.map((booking) => {
      const amountPaid = booking.payments.reduce((sum, p) => sum + p.amount, 0);
      const pendingBalance = booking.totalAmount - amountPaid;
      return [
        booking.id,
        booking.tourName || "",
        booking.travelDate ? new Date(booking.travelDate).toISOString().split("T")[0] : "",
        booking.status,
        booking.user.name || "",
        booking.user.email,
        booking.user.phone || "",
        booking.totalAmount.toString(),
        amountPaid.toString(),
        (pendingBalance > 0 ? pendingBalance : 0).toString(),
        booking.processedBy?.name || booking.processedBy?.email || "Unassigned",
        new Date(booking.createdAt).toISOString(),
        new Date(booking.updatedAt).toISOString(),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="bookings-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

