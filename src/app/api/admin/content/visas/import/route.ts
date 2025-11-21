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
        // Validate required fields
        if (!data.country_code || !data.country_name || !data.visa_name || !data.visa_slug || !data.currency) {
          failed.push({ row, message: "Missing required fields: country_code, country_name, visa_name, visa_slug, currency" });
          continue;
        }

        // Data is already validated and transformed by the schema
        // stay_duration_days and validity_days are already integers or null
        // govt_fee and service_fee are already numbers

        // Find or create country by country_code
        const country = await prisma.country.upsert({
          where: { code: data.country_code },
          update: { name: data.country_name },
          create: {
            code: data.country_code,
            name: data.country_name,
            isActive: true,
          },
        });

        // Calculate total price for backward compatibility
        const totalPrice = data.govt_fee + data.service_fee;

        // Build visa data with new fields
        const visaData = {
          countryId: country.id,
          name: data.visa_name,
          slug: data.visa_slug,
          category: data.entry_type || "Tourist",
          // New fields from CSV template
          stayDurationDays: data.stay_duration_days ?? null,
          validityDays: data.validity_days ?? null,
          govtFee: data.govt_fee,
          serviceFee: data.service_fee,
          currency: data.currency || "INR",
          // Legacy fields (for backward compatibility)
          priceInInr: totalPrice,
          processingTime: data.processing_time_days || "3-5 days",
          stayDuration: data.stay_duration_days ? `${data.stay_duration_days} days` : "30 days",
          validity: data.validity_days ? `${data.validity_days} days` : "60 days",
          entryType: data.entry_type || "single",
          overview: data.long_description || data.short_description || "",
          eligibility: "",
          isActive: data.is_active ?? true,
          isFeatured: data.show_on_homepage || false,
        };

        // Upsert visa by slug
        const existingVisa = await prisma.visa.findUnique({
          where: { slug: data.visa_slug },
        });

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
        console.error(`Error importing visa at row ${row}:`, error);
        let errorMessage = error.message || "Failed to import";
        if (error.code === "P2002") {
          errorMessage = "Duplicate slug - visa_slug must be unique";
        } else if (error.code === "P2003") {
          errorMessage = `Foreign key constraint failed: ${error.meta?.field_name || "related record not found"}`;
        }
        failed.push({ row, message: errorMessage });
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

