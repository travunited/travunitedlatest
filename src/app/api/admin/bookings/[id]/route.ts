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

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        User_Booking_userIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        BookingTraveller: {
          include: {
            Traveller: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        Payment: {
          orderBy: {
            createdAt: "desc",
          },
        },
        User_Booking_processedByIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Tour: {
          select: {
            id: true,
            name: true,
            destination: true,
            duration: true,
            price: true,
            cancellationTerms: true,
            bookingPolicies: true,
            Country: {
              select: {
                id: true,
                name: true,
                code: true,
                flagUrl: true,
              },
            },
          },
        },
        BookingAddOn: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const amountPaid = booking.Payment
      .filter(p => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingBalance = booking.totalAmount - amountPaid;

    // Generate reference number from ID (format: TRV-YYYY-XXXXX)
    const year = new Date(booking.createdAt).getFullYear();
    const refSuffix = booking.id.slice(-5).toUpperCase();
    const referenceNumber = `TRB-${year}-${refSuffix}`;

    // Get activities/timeline
    const activities = await prisma.auditLog.findMany({
      where: {
        entityType: "BOOKING",
        entityId: params.id,
      },
      include: {
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // Parse customised package info from specialRequests if present
    let customisedPackage: {
      isCustomisedPackage: boolean;
      customRequestNotes: string | null;
      customBasePrice: number | null;
      customAddOnsPrice: number | null;
      customDiscount: number | null;
    } | null = null;
    if (booking.specialRequests && booking.specialRequests.includes("[CUSTOMISED PACKAGE REQUEST]")) {
      const customMatch = booking.specialRequests.match(/\[CUSTOMISED PACKAGE REQUEST\]\n([^\n]+)/);
      if (customMatch) {
        customisedPackage = {
          isCustomisedPackage: true,
          customRequestNotes: customMatch[1] || null,
          customBasePrice: null,
          customAddOnsPrice: null,
          customDiscount: null,
        };
        // Try to extract pricing info
        const basePriceMatch = booking.specialRequests.match(/Custom Base Price: ₹([\d,]+)/);
        const addOnsPriceMatch = booking.specialRequests.match(/Custom Add-ons Price: ₹([\d,]+)/);
        const discountMatch = booking.specialRequests.match(/Discount: ₹([\d,]+)/);
        if (basePriceMatch) {
          customisedPackage.customBasePrice = parseInt(basePriceMatch[1].replace(/,/g, ""));
        }
        if (addOnsPriceMatch) {
          customisedPackage.customAddOnsPrice = parseInt(addOnsPriceMatch[1].replace(/,/g, ""));
        }
        if (discountMatch) {
          customisedPackage.customDiscount = parseInt(discountMatch[1].replace(/,/g, ""));
        }
      }
    }

    // Format response with additional computed fields
    const response = {
      ...booking,
      user: booking.User_Booking_userIdToUser,
      travellers: booking.BookingTraveller,
      payments: booking.Payment,
      processedBy: booking.User_Booking_processedByIdToUser,
      tour: booking.Tour,
      addOns: booking.BookingAddOn,
      referenceNumber,
      amountPaid,
      pendingBalance: pendingBalance > 0 ? pendingBalance : 0,
      customisedPackage,
      timeline: activities.map((activity) => ({
        id: activity.id,
        time: activity.timestamp,
        event: activity.description,
        adminName: activity.User?.name || activity.User?.email || "System",
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching booking:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      error,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

