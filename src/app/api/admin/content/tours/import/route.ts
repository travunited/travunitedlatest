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

    for (const { row, data } of validation.validRows) {
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
        const tourSlug = await ensureUniqueSlug(baseSlug, data.id || undefined);

        // Build duration string
        const durationParts: string[] = [];
        if (data.duration_days) durationParts.push(`${data.duration_days} day${data.duration_days !== 1 ? "s" : ""}`);
        if (data.duration_nights) durationParts.push(`${data.duration_nights} night${data.duration_nights !== 1 ? "s" : ""}`);
        const duration = durationParts.length > 0 ? durationParts.join(" / ") : "5 days";

        // Determine destination
        const destination = data.primary_destination || data.destination_country || data.title;

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
          bookingDeadline: data.booking_deadline || null,
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

        if (existingTour) {
          await prisma.tour.update({
            where: { id: existingTour.id },
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
        console.error(`Error importing tour at row ${row}:`, error);
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

