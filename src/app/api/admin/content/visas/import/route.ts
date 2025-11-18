import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseFile, validateVisas } from "@/lib/import-utils";
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
    const validation = validateVisas(rows);

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
        // Find or create country first
        let country = await prisma.country.findUnique({
          where: { code: data.country_code },
        });

        if (!country) {
          country = await prisma.country.create({
            data: {
              code: data.country_code,
              name: data.country_name,
              isActive: true,
            },
          });
        }

        // Calculate total price
        const totalPrice = data.govt_fee + data.service_fee;

        // Find or create visa
        const existingVisa = await prisma.visa.findUnique({
          where: { slug: data.visa_slug },
        });

        const visaData = {
          countryId: country.id,
          name: data.visa_name,
          slug: data.visa_slug,
          category: data.entry_type || "Tourist",
          priceInInr: totalPrice,
          processingTime: data.processing_time_days || "3-5 days",
          stayDuration: data.stay_duration_days ? `${data.stay_duration_days} days` : "30 days",
          validity: data.validity_days ? `${data.validity_days} days` : "60 days",
          entryType: data.entry_type || "single",
          overview: data.long_description || data.short_description || "",
          eligibility: "",
          isActive: data.is_active,
          isFeatured: data.show_on_homepage || false,
        };

        if (existingVisa) {
          await prisma.visa.update({
            where: { slug: data.visa_slug },
            data: visaData,
          });
          updated++;
        } else {
          await prisma.visa.create({
            data: visaData,
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
      description: `Bulk imported visas: ${created} created, ${updated} updated, ${failed.length} failed`,
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
    console.error("Error importing visas:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

