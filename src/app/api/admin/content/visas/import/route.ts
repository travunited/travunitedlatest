import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseFile, validateVisas } from "@/lib/import-utils";
import { logAuditEvent } from "@/lib/audit";
import {
  AuditAction,
  AuditEntityType,
  DocScope,
  EntryType,
  StayType,
  VisaMode,
} from "@prisma/client";

export const dynamic = "force-dynamic";

// Helper to parse JSON strings safely
function parseJSON<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString || jsonString.trim() === "") return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

// Helper to extract days from duration/validity strings like "30 Days", "3 Months"
function extractDays(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(day|days|month|months|year|years)/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("month")) return num * 30;
  if (unit.startsWith("year")) return num * 365;
  return num;
}

// Helper to find or create country by name
async function findOrCreateCountry(countryName: string | undefined, flagEmoji: string | undefined) {
  if (!countryName) {
    throw new Error("Country name is required");
  }
  
  // Try to find by name (case-insensitive)
  let country = await prisma.country.findFirst({
    where: {
      name: {
        equals: countryName,
        mode: "insensitive",
      },
    },
  });
  
  if (!country) {
    // Create country with a code derived from name
    const code = countryName.substring(0, 2).toUpperCase();
    country = await prisma.country.upsert({
      where: { code },
      update: { name: countryName },
      create: {
        code,
        name: countryName,
        isActive: true,
      },
    });
  }
  
  return country;
}

function normalizeEnumInput<T extends string>(
  value: unknown,
  enumValues: readonly T[],
  fieldName: "visa_mode" | "entry_type" | "stay_type"
): T | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const match = enumValues.find((val) => val === normalized);
  if (match) return match;

  if (fieldName === "entry_type") {
    if (normalized.includes("SINGLE")) return "SINGLE" as T;
    if (normalized.includes("DOUBLE")) return "DOUBLE" as T;
    if (normalized.includes("MULTI")) return "MULTIPLE" as T;
  }

  if (fieldName === "stay_type") {
    if (normalized.includes("SHORT")) return "SHORT_STAY" as T;
    if (normalized.includes("LONG")) return "LONG_STAY" as T;
  }

  if (fieldName === "visa_mode") {
    if (normalized.includes("E") && normalized.includes("VISA")) return "EVISA" as T;
    if (normalized.includes("STICKER")) return "STICKER" as T;
    if (normalized.includes("ARRIVAL")) return "VOA" as T;
    if (normalized.includes("VFS")) return "VFS" as T;
    if (normalized.includes("ETA")) return "ETA" as T;
  }

  return null;
}

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
        // Use new format fields, fallback to legacy fields for backward compatibility
        // In new format: name = country name, visa_type = visa type/name, slug = visa slug
        const countryName = data.name || data.country_name || "";
        const visaType = data.visa_type || data.entry_type || "";
        const visaSlug = data.slug || data.visa_slug || "";
        // Visa name should be visa_type (e.g., "Single Entry E Visa Short Stay")
        const visaName = visaType || data.visa_name || `${countryName} Visa`;
        
        if (!countryName || !visaSlug) {
          throw new Error("name (country) and slug are required");
        }
        
        if (!visaName) {
          throw new Error("visa_type is required");
        }

        // Find or create country
        const country = await findOrCreateCountry(countryName, data.flag_emoji);

        // Parse duration and validity
        const stayDurationDays = data.stay_duration_days || extractDays(data.duration) || null;
        const validityDays = data.validity_days || extractDays(data.validity) || null;
        
        // Parse price - use price field or calculate from govt_fee + service_fee
        let priceInInr = data.price || 0;
        if (!priceInInr && data.govt_fee !== null && data.service_fee !== null) {
          priceInInr = (data.govt_fee || 0) + (data.service_fee || 0);
        }

        // Parse JSON fields
        const documentRequirements = parseJSON<any[]>(data.document_requirements, []);
        const faqs = parseJSON<any[]>(data.faqs, []);
        const contentSections = parseJSON<any[]>(data.content_sections, []);

        // Extract eligibility and other content from content_sections
        let eligibility = "";
        let whyTravunited = "";
        if (contentSections.length > 0) {
          const eligibilitySection = contentSections.find((s: any) => 
            s.title?.toLowerCase().includes("eligibility")
          );
          if (eligibilitySection) {
            eligibility = eligibilitySection.description || "";
          }
        }

        // Build visa data
        // Access properties that might not be in the schema but could exist in raw data
        const rawData = data as typeof data & { visa_mode?: string; mode?: string; entry_type_enum?: string; entry_type_structured?: string; entry_type_code?: string; stay_type?: string; stay_duration_type?: string; subtype_label?: string; visa_subtype_label?: string; subtypes?: string; visa_subtypes?: string; sub_types?: string };
        const visaModeValue =
          normalizeEnumInput(rawData.visa_mode || rawData.mode, Object.values(VisaMode), "visa_mode") ||
          null;
        const entryTypeEnumSource =
          rawData.entry_type_enum || rawData.entry_type_structured || rawData.entry_type_code || data.entry_type;
        const entryTypeValue =
          normalizeEnumInput(entryTypeEnumSource, Object.values(EntryType), "entry_type") || null;
        const stayTypeValue =
          normalizeEnumInput(
            rawData.stay_type || rawData.stay_duration_type,
            Object.values(StayType),
            "stay_type"
          ) || null;
        const visaSubTypeLabel =
          rawData.subtype_label || rawData.visa_subtype_label || data.visa_type || null;

        const visaData = {
          countryId: country.id,
          name: visaName,
          slug: visaSlug,
          subtitle: data.visa_type || null,
          category: data.visa_type || data.entry_type || "Tourist",
          priceInInr: Math.round(priceInInr),
          processingTime: data.processing_time || data.processing_time_days || "3-5 days",
          stayDuration: data.duration || (stayDurationDays ? `${stayDurationDays} days` : null) || "",
          validity: data.validity || (validityDays ? `${validityDays} days` : null) || "",
          entryTypeLegacy: data.entry_type || null,
          visaMode: visaModeValue,
          entryType: entryTypeValue,
          stayType: stayTypeValue,
          visaSubTypeLabel,
          overview: data.description || data.long_description || data.short_description || "",
          eligibility: eligibility,
          heroImageUrl: data.image || null,
          sampleVisaImageUrl: data.visa_sample_image || null,
          metaTitle: data.meta_title || null,
          metaDescription: data.meta_description || null,
          stayDurationDays: stayDurationDays,
          validityDays: validityDays,
          govtFee: data.govt_fee || null,
          serviceFee: data.service_fee || null,
          currency: data.currency || "INR",
          isActive: data.is_active ?? true,
          isFeatured: data.show_on_homepage || false,
          ...(data.created_at && { createdAt: data.created_at }),
        };

        // Upsert visa by slug
        const existingVisa = await prisma.visa.findUnique({
          where: { slug: visaSlug },
          select: { id: true },
        });

        const visa = await prisma.visa.upsert({
          where: { slug: visaSlug },
          update: visaData,
          create: visaData,
        });

        // Handle document requirements
        if (documentRequirements.length > 0) {
          // Delete existing requirements
          await prisma.visaDocumentRequirement.deleteMany({
            where: { visaId: visa.id },
          });

          // Create new requirements
          for (let i = 0; i < documentRequirements.length; i++) {
            const req = documentRequirements[i];
            await prisma.visaDocumentRequirement.create({
              data: {
                visaId: visa.id,
                name: req.name || req.id || `Requirement ${i + 1}`,
                description: req.description || null,
                scope: DocScope.PER_TRAVELLER, // Default, can be enhanced
                isRequired: true,
                sortOrder: i,
              },
            });
          }
        }

        // Handle FAQs
        if (faqs.length > 0) {
          // Delete existing FAQs
          await prisma.visaFaq.deleteMany({
            where: { visaId: visa.id },
          });

          // Create new FAQs
          for (let i = 0; i < faqs.length; i++) {
            const faq = faqs[i];
            if (faq.question && faq.answer) {
              await prisma.visaFaq.create({
                data: {
                  visaId: visa.id,
                  question: faq.question,
                  answer: faq.answer,
                  sortOrder: i,
                },
              });
            }
          }
        }

        // Handle SubTypes
        // Support both JSON array format and comma-separated string format
        const subtypesInput = rawData.subtypes || rawData.visa_subtypes || rawData.sub_types;
        if (subtypesInput) {
          // Delete existing subtypes
          await prisma.visaSubType.deleteMany({
            where: { visaId: visa.id },
          });

          let subtypesArray: Array<{ label: string; code?: string }> = [];
          
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(subtypesInput);
            if (Array.isArray(parsed)) {
              subtypesArray = parsed;
            } else if (typeof parsed === 'object' && parsed.label) {
              subtypesArray = [parsed];
            }
          } catch {
            // If not JSON, try comma-separated format
            // Format: "Label1,Label2" or "Label1:Code1,Label2:Code2"
            const parts = subtypesInput.split(',').map(s => s.trim()).filter(Boolean);
            subtypesArray = parts.map(part => {
              const [label, code] = part.split(':').map(s => s.trim());
              return { label, code: code || undefined };
            });
          }

          // Create subtypes
          for (let i = 0; i < subtypesArray.length; i++) {
            const subtype = subtypesArray[i];
            if (subtype.label) {
              await prisma.visaSubType.create({
                data: {
                  visaId: visa.id,
                  label: subtype.label,
                  code: subtype.code || null,
                  sortOrder: i,
                },
              });
            }
          }
        }

        if (existingVisa) {
          updated++;
        } else {
          created++;
        }
      } catch (error: any) {
        console.error(`Error importing visa at row ${row}:`, error);
        let errorMessage = error.message || "Failed to import";
        if (error.code === "P2002") {
          errorMessage = "Duplicate slug - slug must be unique";
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

