import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMediaProxyUrl, normalizeMediaInput } from "@/lib/media";
export const dynamic = "force-dynamic";



const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function ensureUniqueSlug(slug: string, excludeId: string) {
  let candidate = slug;
  let suffix = 1;
  while (true) {
    const existing = await prisma.tour.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) break;
    candidate = `${slug}-${suffix++}`;
  }
  return candidate;
}

function ensureContentAdmin(session: Session | null) {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STAFF_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden - Admin access required" },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureContentAdmin(session);
    if (authError) return authError;

    const tour = await prisma.tour.findUnique({
      where: { id: params.id },
      include: {
        country: true,
        days: {
          orderBy: { dayIndex: "asc" },
        },
        addOns: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!tour) {
      return NextResponse.json(
        { error: "Tour not found" },
        { status: 404 }
      );
    }

    // Safely parse gallery images
    let processedGalleryImages = null;
    if (tour.galleryImageUrls) {
      try {
        const parsed = JSON.parse(tour.galleryImageUrls);
        if (Array.isArray(parsed)) {
          processedGalleryImages = JSON.stringify(
            parsed.map((url: string) => getMediaProxyUrl(url))
          );
        }
      } catch {
        // If parsing fails, return as-is
        processedGalleryImages = tour.galleryImageUrls;
      }
    }

    return NextResponse.json({
      ...tour,
      imageUrl: getMediaProxyUrl(tour.imageUrl),
      heroImageUrl: getMediaProxyUrl(tour.heroImageUrl),
      galleryImageUrls: processedGalleryImages,
    });
  } catch (error) {
    console.error("Error fetching tour:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to build tour data object
function buildTourData(body: any, resolvedSlug: string) {
  // Helper to safely stringify JSON fields
  const stringifyJson = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        JSON.parse(value);
        return value;
      } catch {
        return JSON.stringify(value);
      }
    }
    return JSON.stringify(value);
  };

  // Process gallery images
  const processGalleryImages = (galleryImageUrls: any, images: any): string | null => {
    if (Array.isArray(galleryImageUrls)) {
      return JSON.stringify(galleryImageUrls.map((url: string) => normalizeMediaInput(url) || url));
    }
    if (galleryImageUrls && typeof galleryImageUrls === "string") {
      try {
        const parsed = JSON.parse(galleryImageUrls);
        if (Array.isArray(parsed)) {
          return JSON.stringify(parsed.map((url: string) => normalizeMediaInput(url) || url));
        }
      } catch {
        // If not JSON, treat as newline-separated
        const urls = galleryImageUrls.split("\n").map((url: string) => url.trim()).filter(Boolean);
        return JSON.stringify(urls.map((url: string) => normalizeMediaInput(url) || url));
      }
    }
    if (images) {
      return stringifyJson(images);
    }
    return null;
  };

  return {
    countryId: body.countryId || null,
    name: body.name,
    slug: resolvedSlug,
    subtitle: body.subtitle || null,
    shortDescription: body.shortDescription || null,
    description: body.description || null,
    tourType: body.tourType || null,
    tourSubType: body.tourSubType || null,
    bestFor: stringifyJson(body.bestFor),
    
    // Destination & Categorization
    destination: body.destination,
    primaryDestination: body.primaryDestination || null,
    destinationCountry: body.destinationCountry || null,
    destinationState: body.destinationState || null,
    citiesCovered: stringifyJson(body.citiesCovered),
    region: body.region || null,
    regionTags: stringifyJson(body.regionTags),
    categoryId: body.categoryId || null,
    themes: stringifyJson(body.themes),
    
    // Duration & Group Size
    duration: body.duration,
    durationDays: body.durationDays || null,
    durationNights: body.durationNights || null,
    groupSizeMin: body.groupSizeMin || null,
    groupSizeMax: body.groupSizeMax || null,
    minimumTravelers: body.minimumTravelers || null,
    maximumTravelers: body.maximumTravelers || null,
    difficultyLevel: body.difficultyLevel || null,
    
    // Pricing
    price: Number(body.price),
    basePriceInInr: body.basePriceInInr ? Number(body.basePriceInInr) : Number(body.price),
    originalPrice: body.originalPrice ? Number(body.originalPrice) : null,
    currency: body.currency || "INR",
    packageType: body.packageType || null,
    seasonalPricing: stringifyJson(body.seasonalPricing),
    
    // Dates & Availability
    availableDates: stringifyJson(body.availableDates),
    bookingDeadline: body.bookingDeadline ? new Date(body.bookingDeadline) : null,
    status: body.status || (body.isActive ? "active" : "inactive"),
    isActive: body.isActive ?? true,
    isFeatured: body.isFeatured ?? false,
    
    // Advance Payment
    allowAdvance: body.allowAdvance ?? false,
    advancePercentage: body.allowAdvance && body.advancePercentage ? Number(body.advancePercentage) : null,
    requiresPassport: body.requiresPassport ?? false,
    
    // Content
    overview: body.overview || null,
    highlights: stringifyJson(body.highlights),
    inclusions: stringifyJson(body.inclusions),
    exclusions: stringifyJson(body.exclusions),
    itinerary: stringifyJson(body.itinerary),
    importantNotes: body.importantNotes || null,
    hotelCategories: stringifyJson(body.hotelCategories),
    customizationOptions: stringifyJson(body.customizationOptions),
    bookingPolicies: body.bookingPolicies || null,
    cancellationTerms: body.cancellationTerms || null,
    
    // Images & Media
    imageUrl: normalizeMediaInput(body.imageUrl),
    heroImageUrl: normalizeMediaInput(body.heroImageUrl || body.imageUrl),
    featuredImage: normalizeMediaInput(body.featuredImage),
    galleryImageUrls: processGalleryImages(body.galleryImageUrls, body.images),
    images: stringifyJson(body.images || body.galleryImageUrls),
    ogImage: normalizeMediaInput(body.ogImage),
    twitterImage: normalizeMediaInput(body.twitterImage),
    
    // SEO & Social
    metaTitle: body.metaTitle || null,
    metaDescription: body.metaDescription || null,
    metaKeywords: body.metaKeywords || null,
    canonicalUrl: body.canonicalUrl || null,
    ogTitle: body.ogTitle || null,
    ogDescription: body.ogDescription || null,
    twitterTitle: body.twitterTitle || null,
    twitterDescription: body.twitterDescription || null,
  };
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureContentAdmin(session);
    if (authError) return authError;

    const body = await req.json();
    const { name, slug, destination, duration, price, days = [] } = body;

    if (!name || !destination || !duration || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const resolvedSlug = await ensureUniqueSlug(
      (slug?.trim() || slugify(name)) ?? "",
      params.id
    );

    const addOnsInput = Array.isArray(body.addOns) ? body.addOns : [];

    await prisma.$transaction(async (tx) => {
      await tx.tour.update({
        where: { id: params.id },
        data: buildTourData(body, resolvedSlug),
      });

      await tx.tourDay.deleteMany({ where: { tourId: params.id } });
      if (days.length) {
        await tx.tourDay.createMany({
          data: days.map(
            (
              day: { title: string; content: string; dayIndex?: number },
              index: number
            ) => ({
              tourId: params.id,
              title: day.title,
              content: day.content,
              dayIndex:
                typeof day.dayIndex === "number" ? day.dayIndex : index + 1,
            })
          ),
        });
      }

      // Sync tour add-ons
      const keepAddOnIds: string[] = [];
      for (const addOn of addOnsInput) {
        const payload = {
          name: addOn.name,
          description: addOn.description || null,
          price: Number(addOn.price || 0),
          pricingType: addOn.pricingType || "PER_BOOKING",
          isRequired: !!addOn.isRequired,
          isActive: addOn.isActive ?? true,
          sortOrder: typeof addOn.sortOrder === "number" ? addOn.sortOrder : 0,
        };

        if (addOn.id) {
          await tx.tourAddOn.update({
            where: { id: addOn.id },
            data: payload,
          });
          keepAddOnIds.push(addOn.id);
        } else {
          const created = await tx.tourAddOn.create({
            data: {
              ...payload,
              tourId: params.id,
            },
          });
          keepAddOnIds.push(created.id);
        }
      }

      // Remove add-ons omitted from payload
      await tx.tourAddOn.deleteMany({
        where: {
          tourId: params.id,
          ...(keepAddOnIds.length
            ? { id: { notIn: keepAddOnIds } }
            : {}),
        },
      });
    });

    const updated = await prisma.tour.findUnique({
      where: { id: params.id },
      include: {
        country: true,
        days: { orderBy: { dayIndex: "asc" } },
        addOns: { orderBy: { sortOrder: "asc" } },
      },
    });

    // Revalidate cache for the updated holiday pages
    if (updated) {
      const tourSlug = updated.slug;
      
      // Revalidate holiday detail page (slug may contain slashes, so we need to handle it)
      if (tourSlug) {
        // The route is /holidays/[...id], so we need to revalidate with the full slug path
        revalidatePath(`/holidays/${tourSlug}`);
        // Also revalidate the encoded version
        revalidatePath(`/holidays/${encodeURIComponent(tourSlug)}`);
      }
      
      // Revalidate holidays listing page
      revalidatePath("/holidays");
      
      // Revalidate homepage if tour is featured
      if (updated.isFeatured) {
        revalidatePath("/");
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating tour:", error);
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Tour slug must be unique" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureContentAdmin(session);
    if (authError) return authError;

    const body = await req.json();

    const updated = await prisma.tour.update({
      where: { id: params.id },
      data: {
        ...(body.isActive === undefined ? {} : { isActive: body.isActive }),
        ...(body.isFeatured === undefined
          ? {}
          : { isFeatured: body.isFeatured }),
      },
      include: {
        country: true,
      },
    });

    // Revalidate cache for the updated holiday pages
    if (updated) {
      const tourSlug = updated.slug;
      
      // Revalidate holiday detail page
      if (tourSlug) {
        revalidatePath(`/holidays/${tourSlug}`);
        revalidatePath(`/holidays/${encodeURIComponent(tourSlug)}`);
      }
      
      // Revalidate holidays listing page
      revalidatePath("/holidays");
      
      // Revalidate homepage if tour is featured
      if (updated.isFeatured) {
        revalidatePath("/");
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating tour flags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

