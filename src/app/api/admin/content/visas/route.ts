import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocScope, EntryType, StayType, VisaMode } from "@prisma/client";
export const dynamic = "force-dynamic";



const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function ensureUniqueSlug(base: string) {
  let slug = base || "visa";
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.visa.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) break;
    slug = `${base}-${suffix++}`;
  }
  return slug;
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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureContentAdmin(session);
    if (authError) return authError;

    const url = new URL(req.url);
    const countryId = url.searchParams.get("countryId");
    const category = url.searchParams.get("category");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    const visas = await prisma.visa.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        ...(category ? { category } : {}),
        ...(status === "active"
          ? { isActive: true }
          : status === "inactive"
            ? { isActive: false }
            : {}),
        ...(search
          ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { subtitle: { contains: search, mode: "insensitive" } },
            ],
          }
          : {}),
      },
      include: {
        country: true,
        subTypes: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: {
            requirements: true,
            applications: true,
          },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { updatedAt: "desc" },
      ],
    });

    return NextResponse.json(visas);
  } catch (error) {
    console.error("Error fetching visas:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureContentAdmin(session);
    if (authError) return authError;

    const body = await req.json();
    const {
      countryId,
      name,
      slug,
      subtitle,
      category,
      isActive,
      isFeatured,
      priceInInr,
      processingTime,
      stayDuration,
      validity,
      entryType,
      entryTypeLegacy,
      overview,
      eligibility,
      importantNotes,
      rejectionReasons,
      whyTravunited,
      statistics,
      heroImageUrl,
      sampleVisaImageUrl,
      metaTitle,
      metaDescription,
      // New fields
      stayDurationDays,
      validityDays,
      currency,
      visaMode,
      structuredEntryType,
      stayType,
      visaSubTypeLabel,
      requirements = [],
      faqs = [],
      subTypes = [],
    } = body;

    // Provide default values for required fields to prevent DB errors
    const safeName = name || "Untitled Visa";
    const safeCategory = category || "Tourist";
    const safePriceInInr = priceInInr || 0;
    const safeProcessingTime = processingTime || "Not specified";
    const safeStayDuration = stayDuration || "Not specified";
    const safeValidity = validity || "Not specified";
    const safeOverview = overview || "No overview provided.";
    const safeEligibility = eligibility || "No eligibility criteria provided.";

    // if (
    //   !countryId ||
    //   !name ||
    //   !category ||
    //   !priceInInr ||
    //   !processingTime ||
    //   !stayDuration ||
    //   !validity ||
    //   !overview ||
    //   !eligibility
    // ) {
    //   return NextResponse.json(
    //     { error: "Missing required fields" },
    //     { status: 400 }
    //   );
    // }

    const resolvedSlug = await ensureUniqueSlug(
      slug?.trim() || slugify(safeName)
    );

    let parsedVisaMode: VisaMode | null = null;
    let parsedEntryType: EntryType | null = null;
    let parsedStayType: StayType | null = null;
    try {
      // Only normalize enum values if they are actually provided and not empty
      if (visaMode !== undefined && visaMode !== null && visaMode !== "") {
        parsedVisaMode = normalizeEnumInput(visaMode, Object.values(VisaMode), "visaMode");
      }
      
      // Check if structuredEntryType or entryType is explicitly provided with a non-empty value
      const hasStructuredEntryType = structuredEntryType !== undefined && 
                                     structuredEntryType !== null && 
                                     typeof structuredEntryType === "string" &&
                                     structuredEntryType.trim() !== "";
      const hasEntryType = entryType !== undefined && 
                          entryType !== null && 
                          typeof entryType === "string" &&
                          entryType.trim() !== "";
      
      if (hasStructuredEntryType) {
        parsedEntryType = normalizeEnumInput(structuredEntryType, Object.values(EntryType), "entryType");
      } else if (hasEntryType) {
        parsedEntryType = normalizeEnumInput(entryType, Object.values(EntryType), "entryType");
      }
      
      if (stayType !== undefined && stayType !== null && stayType !== "") {
        parsedStayType = normalizeEnumInput(stayType, Object.values(StayType), "stayType");
      }
    } catch (enumError) {
      return NextResponse.json(
        {
          error: (enumError as Error).message || "Invalid enum value provided",
        },
        { status: 400 }
      );
    }

    const visa = await prisma.visa.create({
      data: {
        countryId,
        name: safeName,
        slug: resolvedSlug,
        subtitle: subtitle || null,
        category: safeCategory,
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
        priceInInr: Number(safePriceInInr),
        processingTime: safeProcessingTime,
        stayDuration: safeStayDuration,
        validity: safeValidity,
        entryTypeLegacy: (entryTypeLegacy !== undefined && entryTypeLegacy !== null && typeof entryTypeLegacy === "string" && entryTypeLegacy.trim() !== "") ? entryTypeLegacy : null,
        visaMode: parsedVisaMode,
        entryType: parsedEntryType,
        stayType: parsedStayType,
        visaSubTypeLabel: visaSubTypeLabel || null,
        overview: safeOverview,
        eligibility: safeEligibility,
        importantNotes: importantNotes || null,
        rejectionReasons: rejectionReasons || null,
        whyTravunited: whyTravunited || null,
        statistics: statistics || null,
        heroImageUrl: heroImageUrl || null,
        sampleVisaImageUrl: sampleVisaImageUrl || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        // New fields
        stayDurationDays: stayDurationDays !== undefined && stayDurationDays !== null ? Number(stayDurationDays) : null,
        validityDays: validityDays !== undefined && validityDays !== null ? Number(validityDays) : null,
        currency: currency || "INR",
        requirements: requirements.length
          ? {
            create: requirements.map(
              (req: {
                name: string;
                description?: string;
                scope: DocScope;
                isRequired?: boolean;
                category?: string;
                sortOrder?: number;
              }, index: number) => ({
                name: req.name,
                description: req.description || null,
                scope: req.scope || DocScope.PER_APPLICATION,
                isRequired: req.isRequired ?? true,
                category: req.category || null,
                sortOrder:
                  typeof req.sortOrder === "number"
                    ? req.sortOrder
                    : index,
              })
            ),
          }
          : undefined,
        faqs: faqs.length
          ? {
            create: faqs.map(
              (
                faq: {
                  category?: string;
                  question: string;
                  answer: string;
                  sortOrder?: number;
                },
                index: number
              ) => ({
                category: faq.category || null,
                question: faq.question,
                answer: faq.answer,
                sortOrder:
                  typeof faq.sortOrder === "number"
                    ? faq.sortOrder
                    : index,
              })
            ),
          }
          : undefined,
        subTypes: subTypes.length
          ? {
            create: subTypes.map(
              (
                subtype: {
                  label: string;
                  code?: string;
                  sortOrder?: number;
                },
                index: number
              ) => ({
                label: subtype.label,
                code: subtype.code || null,
                sortOrder:
                  typeof subtype.sortOrder === "number"
                    ? subtype.sortOrder
                    : index,
              })
            ),
          }
          : undefined,
      },
      include: {
        country: true,
        requirements: true,
        faqs: true,
        subTypes: true,
      },
    });

    return NextResponse.json(visa);
  } catch (error) {
    console.error("Error creating visa:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code?: string; meta?: any; message?: string };
      
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "Visa slug must be unique" },
          { status: 409 }
        );
      }
      
      // Handle missing table/column errors
      if (prismaError.code === "P2021" || prismaError.code === "P2019") {
        console.error("Database schema error:", prismaError);
        return NextResponse.json(
          { 
            error: "Database schema error",
            message: prismaError.message || "A required database table or column is missing. Please run migrations.",
            code: prismaError.code
          },
          { status: 500 }
        );
      }
      
      // Handle foreign key constraint errors
      if (prismaError.code === "P2003") {
        return NextResponse.json(
          { 
            error: "Invalid reference",
            message: prismaError.message || "The selected country or related entity does not exist."
          },
          { status: 400 }
        );
      }
    }
    
    // Handle validation errors
    if (error instanceof Error) {
      // If it's a known validation error, return it
      if (error.message.includes("must be one of")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    // Generic error response with more details in development
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: process.env.NODE_ENV === 'development' && error instanceof Error 
          ? error.message 
          : "An unexpected error occurred while creating the visa. Please try again.",
        ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
      },
      { status: 500 }
    );
  }
}
