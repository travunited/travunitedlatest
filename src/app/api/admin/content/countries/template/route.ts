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
      "continent",
      "default_currency",
      "is_active"
    ];

    const exampleRows = [
      {
        country_code: "AE",
        country_name: "United Arab Emirates",
        continent: "Asia",
        default_currency: "AED",
        is_active: "TRUE"
      },
      {
        country_code: "SG",
        country_name: "Singapore",
        continent: "Asia",
        default_currency: "SGD",
        is_active: "TRUE"
      }
    ];

    if (format === "xlsx") {
      const buffer = generateXLSXTemplate(headers, exampleRows);
      return new NextResponse(buffer as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=countries-template.xlsx",
        },
      });
    } else {
      const csv = generateCSVTemplate(headers, exampleRows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=countries-template.csv",
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

