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
    if (validation.validRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No valid rows to import",
        summary: {
          totalRows: rows.length,
          validRows: 0,
          invalidRows: validation.invalidRows.length,
          created: 0,
          updated: 0,
          failed: 0,
        },
        errors: validation.invalidRows,
      }, { status: 400 });
    }
    
    let created = 0;
    let updated = 0;
    const failed: Array<{ row: number; message: string }> = [];
    const createdIds: string[] = [];
    const updatedIds: string[] = [];
    
    console.log(`[Tour Import] Starting import of ${validation.validRows.length} valid rows`);
    
    // Quick schema validation - try to create a test query to verify schema
    try {
      await prisma.tour.findFirst({
        select: {
          id: true,
          name: true,
          shortDescription: true,
          requiresPassport: true,
        },
      });
    } catch (schemaError: any) {
      console.error("[Tour Import] Schema validation failed:", schemaError);
      if (schemaError.code === "P2021" || schemaError.code === "P2022") {
        return NextResponse.json({
          success: false,
          error: `Database schema mismatch: ${schemaError.message}. Please run migrations and regenerate Prisma Client.`,
          details: {
            code: schemaError.code,
            message: schemaError.message,
          },
        }, { status: 500 });
      }
    }

    // Helper function to generate slug from title
    const slugify = (text: string) =>
      text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    // Helper function to ensure unique slug
    const ensureUniqueSlug = async (baseSlug: string, excludeId?: string) => {
      let slug = baseSlug || "tour";
      let suffix = 1;
      while (true) {
        const existing = await prisma.tour.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (!existing || existing.id === excludeId) break;
        slug = `${baseSlug}-${suffix++}`;
      }
      return slug;
    };

    // Helper function to parse JSON strings safely
    const parseJsonField = (value: string | null | undefined): string | null => {
      if (!value || value.trim() === "") return null;
      try {
        // Validate it's valid JSON
        JSON.parse(value);
        return value;
      } catch {
        // If not valid JSON, return as-is (might be plain text)
        return value;
      }
    };

    // Process imports one by one with transactions for better error handling
    for (const { row, data } of validation.validRows) {
      // Declare variables outside try block so they're accessible in catch
      let tourSlug: string = "";
      let destination: string = "";
      
      try {
        // Find country by country_id or destination_country
        let countryId: string | null = null;
        if (data.country_id) {
          const country = await prisma.country.findUnique({
            where: { id: data.country_id },
          });
          if (country) {
            countryId = country.id;
          }
        } else if (data.destination_country) {
          // Try to find by name
          const country = await prisma.country.findFirst({
            where: { name: { contains: data.destination_country, mode: "insensitive" } },
          });
          if (country) {
            countryId = country.id;
          }
        }

        // Generate slug if not provided
        const baseSlug = data.slug || slugify(data.title);
        tourSlug = await ensureUniqueSlug(baseSlug, data.id || undefined);

        // Build duration string
        const durationParts: string[] = [];
        if (data.duration_days) durationParts.push(`${data.duration_days} day${data.duration_days !== 1 ? "s" : ""}`);
        if (data.duration_nights) durationParts.push(`${data.duration_nights} night${data.duration_nights !== 1 ? "s" : ""}`);
        const duration = durationParts.length > 0 ? durationParts.join(" / ") : "5 days";

        // Determine destination
        destination = data.primary_destination || data.destination_country || data.title;

        // Build tour data object
        const tourData: any = {
          name: data.title,
          slug: tourSlug,
          destination: destination,
          duration: duration,
          price: data.price || 0,
          basePriceInInr: data.price || 0,
          description: data.description || null,
          shortDescription: data.short_description || null,
          originalPrice: data.original_price || null,
          currency: data.currency || "INR",
          durationDays: data.duration_days || null,
          durationNights: data.duration_nights || null,
          destinationCountry: data.destination_country || null,
          citiesCovered: parseJsonField(data.cities_covered),
          images: parseJsonField(data.images),
          featuredImage: data.featured_image || null,
          inclusions: parseJsonField(data.inclusions),
          exclusions: parseJsonField(data.exclusions),
          itinerary: parseJsonField(data.itinerary),
          difficultyLevel: data.difficulty_level || null,
          groupSizeMin: data.group_size_min || null,
          groupSizeMax: data.group_size_max || null,
          availableDates: parseJsonField(data.available_dates),
          bookingDeadline: data.booking_deadline ? new Date(data.booking_deadline) : null,
          status: data.status || "active",
          isActive: data.status === "active" || !data.status ? true : false,
          isFeatured: data.featured || false,
          categoryId: data.category_id || null,
          metaTitle: data.meta_title || null,
          metaDescription: data.meta_description || null,
          metaKeywords: data.meta_keywords || null,
          canonicalUrl: data.canonical_url || null,
          ogTitle: data.og_title || null,
          ogDescription: data.og_description || null,
          ogImage: data.og_image || null,
          twitterTitle: data.twitter_title || null,
          twitterDescription: data.twitter_description || null,
          twitterImage: data.twitter_image || null,
          packageType: data.package_type || null,
          minimumTravelers: data.minimum_travelers || null,
          maximumTravelers: data.maximum_travelers || null,
          hotelCategories: parseJsonField(data.hotel_categories),
          customizationOptions: parseJsonField(data.customization_options),
          seasonalPricing: parseJsonField(data.seasonal_pricing),
          bookingPolicies: data.booking_policies || null,
          cancellationTerms: data.cancellation_terms || null,
          highlights: parseJsonField(data.highlights),
          bestFor: parseJsonField(data.best_for),
          destinationState: data.destination_state || null,
          tourType: data.tour_type || null,
          tourSubType: data.tour_sub_type || null,
          region: data.region || null,
          primaryDestination: data.primary_destination || null,
          regionTags: parseJsonField(data.region_tags),
          themes: parseJsonField(data.themes),
        };

        // Add country relation if found
        if (countryId) {
          tourData.countryId = countryId;
        }

        // Set image URLs if provided
        if (data.featured_image) {
          tourData.heroImageUrl = data.featured_image;
          tourData.imageUrl = data.featured_image;
        } else if (data.images) {
          try {
            const imageArray = JSON.parse(data.images);
            if (Array.isArray(imageArray) && imageArray.length > 0) {
              tourData.heroImageUrl = imageArray[0];
              tourData.imageUrl = imageArray[0];
              tourData.galleryImageUrls = JSON.stringify(imageArray);
            }
          } catch {
            // If parsing fails, ignore
          }
        }

        // Find existing tour by id or slug
        let existingTour = null;
        if (data.id) {
          existingTour = await prisma.tour.findUnique({
            where: { id: data.id },
          });
        }
        if (!existingTour && tourSlug) {
          existingTour = await prisma.tour.findUnique({
            where: { slug: tourSlug },
          });
        }

        // Use transaction for each tour to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
          if (existingTour) {
            const updatedTour = await tx.tour.update({
              where: { id: existingTour.id },
              data: tourData,
            });
            console.log(`[Tour Import] Updated tour ${updatedTour.id} (row ${row}): ${updatedTour.name}`);
            return { type: "update" as const, id: updatedTour.id, name: updatedTour.name };
          } else {
            const newTour = await tx.tour.create({
              data: tourData,
            });
            console.log(`[Tour Import] Created tour ${newTour.id} (row ${row}): ${newTour.name}`);
            return { type: "create" as const, id: newTour.id, name: newTour.name };
          }
        });
        
        // Verify the transaction succeeded
        if (result.type === "update") {
          updated++;
          updatedIds.push(result.id);
        } else {
          created++;
          createdIds.push(result.id);
        }
      } catch (error: any) {
        // Calculate fallback values if they weren't set before error
        const errorSlug = tourSlug || data.slug || slugify(data.title || "tour");
        const errorDestination = destination || data.primary_destination || data.destination_country || data.title || "Unknown";
        
        console.error(`[Tour Import] Error importing tour at row ${row}:`, {
          error: error.message,
          code: error.code,
          meta: error.meta,
          stack: error.stack,
          data: {
            title: data.title,
            slug: errorSlug,
            destination: errorDestination,
          },
        });
        
        // Provide more helpful error messages for common issues
        let errorMessage = error.message || "Failed to import";
        if (error.message?.includes("Unknown argument")) {
          const fieldMatch = error.message.match(/Unknown argument `(\w+)`/);
          errorMessage = `Schema mismatch: Field '${fieldMatch?.[1] || "unknown"}' does not exist in database. Please ensure migrations are applied and Prisma Client is regenerated on the server.`;
        } else if (error.code === "P2002") {
          errorMessage = `Duplicate slug or unique constraint violation: ${error.meta?.target || "unknown field"}`;
        } else if (error.code === "P2003") {
          errorMessage = `Foreign key constraint failed: ${error.meta?.field_name || "related record not found"}`;
        } else if (error.code === "P2021") {
          errorMessage = `Table does not exist in database. Please run migrations.`;
        } else if (error.code === "P2022") {
          errorMessage = `Column does not exist in database. Please run migrations.`;
        }
        
        failed.push({ row, message: errorMessage });
      }
    }

    // Log audit event (non-blocking)
    try {
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
    } catch (auditError) {
      // Audit log failure should not block the import response
      console.error("Failed to log audit event for tour import:", auditError);
    }

    console.log(`[Tour Import] Import complete: ${created} created, ${updated} updated, ${failed.length} failed`);
    
    // If nothing was created or updated, but there were valid rows, something went wrong
    if (validation.validRows.length > 0 && created === 0 && updated === 0 && failed.length === 0) {
      console.error(`[Tour Import] WARNING: No tours were created/updated despite ${validation.validRows.length} valid rows`);
      return NextResponse.json({
        success: false,
        error: "Import completed but no tours were created or updated. Check server logs for details.",
        summary: {
          totalRows: rows.length,
          validRows: validation.validRows.length,
          created: 0,
          updated: 0,
          failed: 0,
        },
        createdIds: [],
        updatedIds: [],
        failed: [],
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rows.length,
        validRows: validation.validRows.length,
        created,
        updated,
        failed: failed.length,
      },
      createdIds,
      updatedIds,
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

