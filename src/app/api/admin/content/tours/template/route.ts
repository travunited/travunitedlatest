import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateCSVTemplate, generateXLSXTemplate } from "@/lib/import-utils";

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
    const format = searchParams.get("format") || "csv";

    const headers = [
      "tour_name",
      "tour_slug",
      "country_code",
      "primary_city",
      "duration_days",
      "base_price",
      "currency",
      "is_active",
      "max_group_size",
      "category"
    ];

    const exampleRows = [
      {
        tour_name: "Dubai City Tour (4 Nights/5 Days)",
        tour_slug: "dubai-city-tour-4n5d",
        country_code: "AE",
        primary_city: "Dubai",
        duration_days: "5",
        base_price: "45000",
        currency: "INR",
        is_active: "TRUE",
        max_group_size: "20",
        category: "City Tour"
      }
    ];

    if (format === "xlsx") {
      const buffer = generateXLSXTemplate(headers, exampleRows);
      return new NextResponse(buffer as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=tours-template.xlsx",
        },
      });
    } else {
      const csv = generateCSVTemplate(headers, exampleRows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=tours-template.csv",
        },
      });
    }
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

