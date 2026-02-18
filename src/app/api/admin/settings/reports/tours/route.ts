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

    // Fetch all bookings with related data
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        User_Booking_userIdToUser: true,
        Tour: true,
        BookingTraveller: {
          include: {
            Traveller: true,
          },
        },
        Payment: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "csv") {
      // Generate CSV with requested columns
      let csv = "Number of Children,Customer Type,Customer Name,PAN Number,Mobile No,Email ID,Booking Status,Package Inclusions,Visa Included,Flight Included,Hotel Category,Transport Included,Meal Plan,Confirmation Date,Cancellation Date,Payment Status,Payment Mode,Document Collected\n";

      bookings.forEach((booking) => {
        const user = booking.User_Booking_userIdToUser;
        const tour = booking.Tour;
        const payment = booking.Payment[0];
        const travellers = booking.BookingTraveller;

        // Calculate number of children (age < 12)
        const numberOfChildren = travellers.filter(t => t.age && t.age < 12).length;

        // Determine customer type (Indian / Foreign)
        const firstTraveller = travellers[0];
        const nationality = firstTraveller?.nationality || "";
        const customerType = nationality.toLowerCase().includes("india") || nationality.toLowerCase() === "in" ? "Indian" : "Foreign";

        const customerName = user?.name || "";
        const panNumber = firstTraveller?.panNumber || "";
        const mobileNo = user?.phone || "";
        const emailId = user?.email || "";
        const bookingStatus = booking.status || "";
        const packageInclusions = tour?.inclusions || "";

        // Parse inclusions for specific items
        const inclusionsLower = packageInclusions.toLowerCase();
        const visaIncluded = tour?.requiresPassport || inclusionsLower.includes("visa") ? "Y" : "N";
        const flightIncluded = inclusionsLower.includes("flight") || inclusionsLower.includes("airfare") ? "Y" : "N";
        const hotelCategory = tour?.hotelCategories || "";
        const transportIncluded = inclusionsLower.includes("transport") || inclusionsLower.includes("transfer") ? "Y" : "N";
        const mealPlan = booking.foodPreference || "";

        // Confirmation and cancellation dates
        const confirmationDate = booking.status === "CONFIRMED" || booking.status === "COMPLETED" ? new Date(booking.updatedAt).toLocaleDateString() : "";
        const cancellationDate = booking.status === "CANCELLED" ? new Date(booking.updatedAt).toLocaleDateString() : "";

        const paymentStatus = payment?.status || "";
        const paymentMode = payment?.method || "";
        const documentCollected = booking.documents ? "Y" : "N";

        // Escape CSV values
        const escapeCsv = (val: string | number) => {
          const strVal = String(val);
          if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
            return `"${strVal.replace(/"/g, '""')}"`;
          }
          return strVal;
        };

        csv += `${numberOfChildren},${escapeCsv(customerType)},${escapeCsv(customerName)},${escapeCsv(panNumber)},${escapeCsv(mobileNo)},${escapeCsv(emailId)},${escapeCsv(bookingStatus)},${escapeCsv(packageInclusions)},${visaIncluded},${flightIncluded},${escapeCsv(hotelCategory)},${transportIncluded},${escapeCsv(mealPlan)},${escapeCsv(confirmationDate)},${escapeCsv(cancellationDate)},${escapeCsv(paymentStatus)},${escapeCsv(paymentMode)},${documentCollected}\n`;
      });

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="tour-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Return JSON format with booking details
    const report = bookings.map((booking) => {
      const user = booking.User_Booking_userIdToUser;
      const tour = booking.Tour;
      const payment = booking.Payment[0];
      const travellers = booking.BookingTraveller;

      const numberOfChildren = travellers.filter(t => t.age && t.age < 12).length;
      const firstTraveller = travellers[0];
      const nationality = firstTraveller?.nationality || "";
      const customerType = nationality.toLowerCase().includes("india") || nationality.toLowerCase() === "in" ? "Indian" : "Foreign";

      const packageInclusions = tour?.inclusions || "";
      const inclusionsLower = packageInclusions.toLowerCase();

      return {
        numberOfChildren,
        customerType,
        customerName: user?.name || "",
        panNumber: firstTraveller?.panNumber || "",
        mobileNo: user?.phone || "",
        emailId: user?.email || "",
        bookingStatus: booking.status || "",
        packageInclusions,
        visaIncluded: tour?.requiresPassport || inclusionsLower.includes("visa") ? "Y" : "N",
        flightIncluded: inclusionsLower.includes("flight") || inclusionsLower.includes("airfare") ? "Y" : "N",
        hotelCategory: tour?.hotelCategories || "",
        transportIncluded: inclusionsLower.includes("transport") || inclusionsLower.includes("transfer") ? "Y" : "N",
        mealPlan: booking.foodPreference || "",
        confirmationDate: booking.status === "CONFIRMED" || booking.status === "COMPLETED" ? booking.updatedAt : null,
        cancellationDate: booking.status === "CANCELLED" ? booking.updatedAt : null,
        paymentStatus: payment?.status || "",
        paymentMode: payment?.method || "",
        documentCollected: booking.documents ? "Y" : "N",
      };
    });

    return NextResponse.json({ bookings: report });
  } catch (error) {
    console.error("Error generating tour report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

