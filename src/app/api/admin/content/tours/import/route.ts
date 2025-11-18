import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseFile, validateTours } from "@/lib/import-utils";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const mode = req.nextUrl.searchParams.get("mode") || "validate";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Parse file
    const rows = await parseFile(file);

    // Validate
    const validation = validateTours(rows);

    if (mode === "validate") {
      return NextResponse.json({
        preview: validation.preview,
        summary: {
          totalRows: rows.length,
          validRows: validation.validRows.length,
          invalidRows: validation.invalidRows.length,
        },
        errors: validation.invalidRows,
      });
    }

    // Import mode - commit to database
    let created = 0;
    let updated = 0;
    const failed: Array<{ row: number; message: string }> = [];

    for (const { row, data } of validation.validRows) {
      try {
        // Find country
        let country = await prisma.country.findUnique({
          where: { code: data.country_code },
        });

        if (!country) {
          failed.push({ row, message: `Country with code ${data.country_code} not found` });
          continue;
        }

        // Find or create tour
        const existingTour = await prisma.tour.findUnique({
          where: { slug: data.tour_slug },
        });

        const tourData = {
          countryId: country.id,
          name: data.tour_name,
          slug: data.tour_slug,
          destination: data.primary_city || data.tour_name,
          duration: data.duration_days ? `${data.duration_days} days` : "5 days",
          price: data.base_price,
          basePriceInInr: data.base_price,
          overview: data.long_description || data.short_description || "",
          description: data.long_description || "",
          isActive: data.is_active,
        };

        if (existingTour) {
          await prisma.tour.update({
            where: { slug: data.tour_slug },
            data: tourData,
          });
          updated++;
        } else {
          await prisma.tour.create({
            data: tourData,
          });
          created++;
        }
      } catch (error: any) {
        failed.push({ row, message: error.message || "Failed to import" });
      }
    }

    // Log audit event
    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.OTHER,
      entityId: "bulk-import",
      action: AuditAction.CREATE,
      description: `Bulk imported tours: ${created} created, ${updated} updated, ${failed.length} failed`,
      metadata: {
        created,
        updated,
        failed: failed.length,
        totalRows: rows.length,
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rows.length,
        created,
        updated,
        failed: failed.length,
      },
      failed,
    });
  } catch (error: any) {
    console.error("Error importing tours:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

