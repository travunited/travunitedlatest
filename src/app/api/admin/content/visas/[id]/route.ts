import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocScope, EntryType, StayType, VisaMode } from "@prisma/client";
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
    const existing = await prisma.visa.findUnique({
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

function normalizeEnumInput<T extends string>(
  value: unknown,
  enumValues: readonly T[],
  fieldName: string
): T | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string value`);
  }
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const match = enumValues.find((val) => val === normalized);
  if (!match) {
    throw new Error(
      `${fieldName} must be one of: ${enumValues
        .map((val) => val.toLowerCase())
        .join(", ")}`
    );
  }
  return match;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureContentAdmin(session);
    if (authError) return authError;

    const visa = await prisma.visa.findUnique({
      where: { id: params.id },
      include: {
        country: true,
        requirements: {
          orderBy: { sortOrder: "asc" },
        },
        faqs: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!visa) {
      return NextResponse.json(
        { error: "Visa not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...visa,
      heroImageUrl: getMediaProxyUrl(visa.heroImageUrl),
      sampleVisaImageUrl: getMediaProxyUrl(visa.sampleVisaImageUrl),
    });
  } catch (error) {
    console.error("Error fetching visa:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureContentAdmin(session);
    if (authError) return authError;

    // First, fetch the existing visa to use as defaults for partial updates
    const existingVisa = await prisma.visa.findUnique({
      where: { id: params.id },
      select: {
        countryId: true,
        name: true,
        slug: true,
        subtitle: true,
        category: true,
        isActive: true,
        isFeatured: true,
        priceInInr: true,
        processingTime: true,
        stayDuration: true,
        validity: true,
        entryType: true,
        overview: true,
        eligibility: true,
        importantNotes: true,
        rejectionReasons: true,
        whyTravunited: true,
        statistics: true,
        heroImageUrl: true,
        sampleVisaImageUrl: true,
        metaTitle: true,
        metaDescription: true,
        stayDurationDays: true,
        validityDays: true,
        currency: true,
        visaMode: true,
        stayType: true,
        visaSubTypeLabel: true,
        entryTypeLegacy: true,
      },
    });

    if (!existingVisa) {
      return NextResponse.json(
        { error: "Visa not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    
    // Merge with existing values, but only use provided values (not undefined)
    // For required fields, treat empty strings as "not provided" to allow partial updates
    // This allows toggling featured without sending all required fields
    const countryId = (body.countryId !== undefined && body.countryId !== null && body.countryId !== "") 
      ? body.countryId 
      : existingVisa.countryId;
    const name = (body.name !== undefined && body.name !== null && body.name !== "") 
      ? body.name 
      : existingVisa.name;
    const slug = body.slug !== undefined ? body.slug : existingVisa.slug;
    const subtitle = body.subtitle !== undefined ? body.subtitle : existingVisa.subtitle;
    const category = (body.category !== undefined && body.category !== null && body.category !== "") 
      ? body.category 
      : existingVisa.category;
    const isActive = body.isActive !== undefined ? body.isActive : existingVisa.isActive;
    const isFeatured = body.isFeatured !== undefined ? body.isFeatured : existingVisa.isFeatured;
    const priceInInr = (body.priceInInr !== undefined && body.priceInInr !== null) 
      ? body.priceInInr 
      : existingVisa.priceInInr;
    const processingTime = (body.processingTime !== undefined && body.processingTime !== null && body.processingTime !== "") 
      ? body.processingTime 
      : existingVisa.processingTime;
    const stayDuration = (body.stayDuration !== undefined && body.stayDuration !== null && body.stayDuration !== "") 
      ? body.stayDuration 
      : existingVisa.stayDuration;
    const validity = (body.validity !== undefined && body.validity !== null && body.validity !== "") 
      ? body.validity 
      : existingVisa.validity;
    const entryType = body.entryType !== undefined ? body.entryType : existingVisa.entryTypeLegacy;
    const overview = (body.overview !== undefined && body.overview !== null && body.overview !== "") 
      ? body.overview 
      : existingVisa.overview;
    const eligibility = (body.eligibility !== undefined && body.eligibility !== null && body.eligibility !== "") 
      ? body.eligibility 
      : existingVisa.eligibility;
    const importantNotes = body.importantNotes !== undefined ? body.importantNotes : existingVisa.importantNotes;
    const rejectionReasons = body.rejectionReasons !== undefined ? body.rejectionReasons : existingVisa.rejectionReasons;
    const whyTravunited = body.whyTravunited !== undefined ? body.whyTravunited : existingVisa.whyTravunited;
    const statistics = body.statistics !== undefined ? body.statistics : existingVisa.statistics;
    const heroImageUrl = body.heroImageUrl !== undefined ? body.heroImageUrl : existingVisa.heroImageUrl;
    const sampleVisaImageUrl = body.sampleVisaImageUrl !== undefined ? body.sampleVisaImageUrl : existingVisa.sampleVisaImageUrl;
    const metaTitle = body.metaTitle !== undefined ? body.metaTitle : existingVisa.metaTitle;
    const metaDescription = body.metaDescription !== undefined ? body.metaDescription : existingVisa.metaDescription;
    const stayDurationDays = body.stayDurationDays !== undefined ? body.stayDurationDays : existingVisa.stayDurationDays;
    const validityDays = body.validityDays !== undefined ? body.validityDays : existingVisa.validityDays;
    const currency = body.currency !== undefined ? body.currency : existingVisa.currency;
    const visaMode = body.visaMode !== undefined ? body.visaMode : existingVisa.visaMode;
    const structuredEntryType = body.structuredEntryType;
    const stayType = body.stayType !== undefined ? body.stayType : existingVisa.stayType;
    const visaSubTypeLabel = body.visaSubTypeLabel !== undefined ? body.visaSubTypeLabel : existingVisa.visaSubTypeLabel;
    const requirements = body.requirements !== undefined ? body.requirements : [];
    const faqs = body.faqs !== undefined ? body.faqs : [];

    // Validate required fields using merged values
    // Since we merge with existing values, empty strings from frontend won't break validation
    // We only validate the final merged values to ensure they're valid
    const missingFields: string[] = [];
    
    // Check if this is a minimal update (only boolean flags like isFeatured/isActive)
    // If so, skip validation since we're just toggling flags
    const providedFields = Object.keys(body).filter(key => {
      const value = body[key];
      // Ignore empty strings, null, undefined, and empty arrays
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });
    
    const isMinimalUpdate = providedFields.length <= 2 && 
      (providedFields.includes('isFeatured') || providedFields.includes('isActive'));
    
    // For minimal updates (like toggling featured), skip validation
    // For full updates, validate all required fields using merged values
    if (!isMinimalUpdate) {
      if (!countryId || (typeof countryId === 'string' && countryId.trim() === "")) {
        missingFields.push("countryId");
      }
      if (!name || (typeof name === 'string' && name.trim() === "")) {
        missingFields.push("name");
      }
      if (!category || (typeof category === 'string' && category.trim() === "")) {
        missingFields.push("category");
      }
      if (priceInInr === undefined || priceInInr === null) {
        missingFields.push("priceInInr");
      }
      if (!processingTime || (typeof processingTime === 'string' && processingTime.trim() === "")) {
        missingFields.push("processingTime");
      }
      if (!stayDuration || (typeof stayDuration === 'string' && stayDuration.trim() === "")) {
        missingFields.push("stayDuration");
      }
      if (!validity || (typeof validity === 'string' && validity.trim() === "")) {
        missingFields.push("validity");
      }
      if (!overview || (typeof overview === 'string' && overview.trim() === "")) {
        missingFields.push("overview");
      }
      if (!eligibility || (typeof eligibility === 'string' && eligibility.trim() === "")) {
        missingFields.push("eligibility");
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: "Missing required fields",
          missingFields: missingFields,
          message: `The following required fields are missing or invalid: ${missingFields.join(", ")}`
        },
        { status: 400 }
      );
    }

    const resolvedSlug = await ensureUniqueSlug(
      (slug?.trim() || slugify(name)) ?? "",
      params.id
    );

    let parsedVisaMode: VisaMode | null = null;
    let parsedEntryType: EntryType | null = null;
    let parsedStayType: StayType | null = null;
    try {
      parsedVisaMode = normalizeEnumInput(visaMode, Object.values(VisaMode), "visaMode");
      const enumEntrySource = structuredEntryType ?? entryType;
      parsedEntryType = normalizeEnumInput(enumEntrySource, Object.values(EntryType), "entryType");
      parsedStayType = normalizeEnumInput(stayType, Object.values(StayType), "stayType");
    } catch (enumError) {
      return NextResponse.json(
        {
          error: (enumError as Error).message || "Invalid enum value provided",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.visa.update({
        where: { id: params.id },
        data: {
          countryId,
          name,
          slug: resolvedSlug,
          subtitle: subtitle || null,
          category,
          isActive: isActive ?? true,
          isFeatured: isFeatured ?? false,
          priceInInr: Number(priceInInr),
          processingTime,
          stayDuration,
          validity,
          entryTypeLegacy: entryType || undefined,
          visaMode: parsedVisaMode ?? undefined,
          entryType: parsedEntryType ?? undefined,
          stayType: parsedStayType ?? undefined,
          visaSubTypeLabel: visaSubTypeLabel ?? undefined,
          overview,
          eligibility,
          importantNotes: importantNotes || null,
          rejectionReasons: rejectionReasons || null,
          whyTravunited: whyTravunited || null,
          statistics: statistics || null,
          heroImageUrl: normalizeMediaInput(heroImageUrl),
          sampleVisaImageUrl:
            sampleVisaImageUrl !== undefined
              ? normalizeMediaInput(sampleVisaImageUrl)
              : undefined,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          // New fields
          stayDurationDays: stayDurationDays !== undefined ? (stayDurationDays === null ? null : Number(stayDurationDays)) : undefined,
          validityDays: validityDays !== undefined ? (validityDays === null ? null : Number(validityDays)) : undefined,
          currency: currency || undefined,
        },
      });

      await tx.visaDocumentRequirement.deleteMany({
        where: { visaId: params.id },
      });
      if (requirements.length) {
        await tx.visaDocumentRequirement.createMany({
          data: requirements.map(
            (req: {
              name: string;
              description?: string;
              scope: DocScope;
              isRequired?: boolean;
              category?: string;
              sortOrder?: number;
            }, index: number) => ({
              visaId: params.id,
              name: req.name,
              description: req.description || null,
              scope: req.scope || DocScope.PER_APPLICATION,
              isRequired: req.isRequired ?? true,
              category: req.category || null,
              sortOrder:
                typeof req.sortOrder === "number" ? req.sortOrder : index,
            })
          ),
        });
      }

      await tx.visaFaq.deleteMany({
        where: { visaId: params.id },
      });
      if (faqs.length) {
        await tx.visaFaq.createMany({
          data: faqs.map(
            (
              faq: {
                category?: string;
                question: string;
                answer: string;
                sortOrder?: number;
              },
              index: number
            ) => ({
              visaId: params.id,
              category: faq.category || null,
              question: faq.question,
              answer: faq.answer,
              sortOrder:
                typeof faq.sortOrder === "number" ? faq.sortOrder : index,
            })
          ),
        });
      }
    });

    const updated = await prisma.visa.findUnique({
      where: { id: params.id },
      include: {
        country: true,
        requirements: { orderBy: { sortOrder: "asc" } },
        faqs: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating visa:", error);
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Visa slug must be unique" },
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

    const updated = await prisma.visa.update({
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating visa status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

