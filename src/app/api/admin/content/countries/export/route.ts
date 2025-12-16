import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "@e965/xlsx";

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
    const format = searchParams.get("format") || "xlsx"; // xlsx or csv

    // Fetch all countries
    const countries = await prisma.country.findMany({
      orderBy: {
        name: "asc",
      },
    });

    // Prepare export data
    const exportData = countries.map((country) => ({
      ID: country.id,
      Name: country.name,
      Code: country.code,
      Region: country.region || "",
      FlagURL: country.flagUrl || "",
      IsActive: country.isActive ? "Yes" : "No",
      CreatedAt: new Date(country.createdAt).toISOString(),
      UpdatedAt: new Date(country.updatedAt).toISOString(),
    }));

    if (format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Countries");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=countries-export-${new Date().toISOString().split("T")[0]}.xlsx`,
        },
      });
    } else {
      // CSV format
      if (exportData.length === 0) {
        const headers = ["ID", "Name", "Code", "Region", "FlagURL", "IsActive", "CreatedAt", "UpdatedAt"];
        const csvContent = headers.join(",");
        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=countries-export-${new Date().toISOString().split("T")[0]}.csv`,
          },
        });
      }

      const headers = Object.keys(exportData[0]);
      const rows = exportData.map((row) =>
        headers.map((header) => {
          const value = row[header as keyof typeof row];
          const stringValue = String(value || "");
          // Escape commas and quotes
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
      );

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=countries-export-${new Date().toISOString().split("T")[0]}.csv`,
        },
      });
    }
  } catch (error) {
    console.error("Error exporting countries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

