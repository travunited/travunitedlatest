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
      const tourIds = ids.split(",");
      where.id = {
        in: tourIds,
      };
    }

    const tours = await prisma.tour.findMany({
      where,
      include: {
        country: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Generate CSV
    const headers = [
      "Tour ID",
      "Name",
      "Slug",
      "Destination",
      "Primary Destination",
      "Country",
      "Duration",
      "Duration Days",
      "Duration Nights",
      "Price",
      "Base Price (INR)",
      "Original Price",
      "Currency",
      "Tour Type",
      "Package Type",
      "Region",
      "Status",
      "Is Active",
      "Is Featured",
      "Allow Advance",
      "Advance Percentage",
      "Created Date",
      "Updated Date",
    ];

    const rows = tours.map((tour) => [
      tour.id,
      tour.name || "",
      tour.slug || "",
      tour.destination || "",
      tour.primaryDestination || "",
      tour.country?.name || "",
      tour.duration || "",
      tour.durationDays?.toString() || "",
      tour.durationNights?.toString() || "",
      tour.price?.toString() || "0",
      tour.basePriceInInr?.toString() || "",
      tour.originalPrice?.toString() || "",
      tour.currency || "INR",
      tour.tourType || "",
      tour.packageType || "",
      tour.region || "",
      tour.status || (tour.isActive ? "active" : "inactive"),
      tour.isActive ? "Yes" : "No",
      tour.isFeatured ? "Yes" : "No",
      tour.allowAdvance ? "Yes" : "No",
      tour.advancePercentage?.toString() || "",
      new Date(tour.createdAt).toISOString(),
      new Date(tour.updatedAt).toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="tours-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting tours:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

