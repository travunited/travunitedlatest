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

    // Fetch additional data for enhanced export
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const travellers = await prisma.bookingTraveller.findMany({
          where: { bookingId: booking.id },
          select: { id: true },
        });
        const allPayments = await prisma.payment.findMany({
          where: { bookingId: booking.id },
          select: { amount: true, status: true },
        });
        
        const completedPayments = allPayments.filter((p) => p.status === "COMPLETED");
        const failedPayments = allPayments.filter((p) => p.status === "FAILED");
        const refundedPayments = allPayments.filter((p) => p.status === "REFUNDED");
        
        const amountPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
        const amountRefunded = refundedPayments.reduce((sum, p) => sum + p.amount, 0);
        const pendingBalance = booking.totalAmount - amountPaid;
        
        let paymentStatus = "UNPAID";
        if (amountRefunded > 0) {
          paymentStatus = "REFUNDED";
        } else if (amountPaid >= booking.totalAmount) {
          paymentStatus = "PAID";
        } else if (amountPaid > 0) {
          paymentStatus = "PARTIAL";
        } else if (failedPayments.length > 0) {
          paymentStatus = "FAILED";
        }
        
        return {
          ...booking,
          travellersCount: travellers.length,
          paymentStatus,
          amountPaid,
          pendingBalance: pendingBalance > 0 ? pendingBalance : 0,
        };
      })
    );

    // Generate CSV with enhanced fields
    const headers = [
      "Booking ID",
      "Created Date",
      "Tour Name",
      "Destination",
      "Travel Date",
      "Travelers Count",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Total Amount",
      "Amount Paid",
      "Pending Balance",
      "Payment Status",
      "Booking Status",
      "Assigned To",
      "Source",
      "Updated Date",
    ];

    const rows = bookingsWithDetails.map((booking) => {
      return [
        booking.id,
        new Date(booking.createdAt).toISOString().split("T")[0],
        booking.tourName || "",
        "", // Destination would need to be fetched from tour relation
        booking.travelDate ? new Date(booking.travelDate).toISOString().split("T")[0] : "",
        booking.travellersCount?.toString() || "0",
        booking.user.name || "",
        booking.user.email,
        booking.user.phone || "",
        booking.totalAmount.toString(),
        booking.amountPaid.toString(),
        booking.pendingBalance.toString(),
        booking.paymentStatus,
        booking.status,
        booking.processedBy?.name || booking.processedBy?.email || "Unassigned",
        "WEBSITE", // Source - would need to be added to booking model
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

