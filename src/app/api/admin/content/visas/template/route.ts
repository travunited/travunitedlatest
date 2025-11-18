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
      "country_code",
      "country_name",
      "visa_name",
      "visa_slug",
      "entry_type",
      "stay_duration_days",
      "validity_days",
      "processing_time_days",
      "govt_fee",
      "service_fee",
      "currency",
      "is_active"
    ];

    const exampleRows = [
      {
        country_code: "AE",
        country_name: "United Arab Emirates",
        visa_name: "UAE Tourist 30 Days",
        visa_slug: "uae-tourist-30-days",
        entry_type: "single",
        stay_duration_days: "30",
        validity_days: "60",
        processing_time_days: "3-5",
        govt_fee: "5000",
        service_fee: "2000",
        currency: "INR",
        is_active: "TRUE"
      }
    ];

    if (format === "xlsx") {
      const buffer = generateXLSXTemplate(headers, exampleRows);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=visas-template.xlsx",
        },
      });
    } else {
      const csv = generateCSVTemplate(headers, exampleRows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=visas-template.csv",
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

