import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { revalidatePath } from "next/cache";
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

    // Validate required fields
    if (!countryId || (typeof countryId === "string" && countryId.trim() === "")) {
      return NextResponse.json(
        { error: "Country is required" },
        { status: 400 }
      );
    }

    // Verify country exists
    const country = await prisma.country.findUnique({
      where: { id: countryId },
      select: { id: true },
    });

    if (!country) {
      return NextResponse.json(
        { error: "Selected country does not exist" },
        { status: 400 }
      );
    }

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

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log("Creating visa with data:", {
        countryId,
        name: safeName,
        hasSubTypes: subTypes && subTypes.length > 0,
        subTypesCount: subTypes?.length || 0,
        hasRequirements: requirements && requirements.length > 0,
        requirementsCount: requirements?.length || 0,
        hasFaqs: faqs && faqs.length > 0,
        faqsCount: faqs?.length || 0,
      });
    }

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

    // Prepare the data object
    const visaData: any = {
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
        requirements: (() => {
          const validRequirements = requirements
            ? requirements.filter((req: any) => req && req.name && typeof req.name === "string" && req.name.trim() !== "")
            : [];
          return validRequirements.length > 0
            ? {
              create: validRequirements.map(
                (req: {
                  name: string;
                  description?: string;
                  scope: DocScope;
                  isRequired?: boolean;
                  category?: string;
                  sortOrder?: number;
                }, index: number) => ({
                  name: req.name.trim(),
                  description: (req.description && typeof req.description === "string" && req.description.trim() !== "") ? req.description.trim() : null,
                  scope: req.scope || DocScope.PER_APPLICATION,
                  isRequired: req.isRequired ?? true,
                  category: (req.category && typeof req.category === "string" && req.category.trim() !== "") ? req.category.trim() : null,
                  sortOrder:
                    typeof req.sortOrder === "number"
                      ? req.sortOrder
                      : index,
                })
              ),
            }
            : undefined;
        })(),
        faqs: (() => {
          const validFaqs = faqs
            ? faqs.filter((faq: any) => 
                faq && 
                faq.question && typeof faq.question === "string" && faq.question.trim() !== "" &&
                faq.answer && typeof faq.answer === "string" && faq.answer.trim() !== ""
              )
            : [];
          return validFaqs.length > 0
            ? {
              create: validFaqs.map(
                (
                  faq: {
                    category?: string;
                    question: string;
                    answer: string;
                    sortOrder?: number;
                  },
                  index: number
                ) => ({
                  category: (faq.category && typeof faq.category === "string" && faq.category.trim() !== "") ? faq.category.trim() : null,
                  question: faq.question.trim(),
                  answer: faq.answer.trim(),
                  sortOrder:
                    typeof faq.sortOrder === "number"
                      ? faq.sortOrder
                      : index,
                })
              ),
            }
            : undefined;
        })(),
        subTypes: (() => {
          const validSubTypes = subTypes
            ? subTypes.filter((subtype: any) => subtype && subtype.label && typeof subtype.label === "string" && subtype.label.trim() !== "")
            : [];
          return validSubTypes.length > 0
            ? {
              create: validSubTypes.map(
                (
                  subtype: {
                    label: string;
                    code?: string;
                    sortOrder?: number;
                  },
                  index: number
                ) => ({
                  label: subtype.label.trim(),
                  code: (subtype.code && typeof subtype.code === "string" && subtype.code.trim() !== "") ? subtype.code.trim() : null,
                  sortOrder:
                    typeof subtype.sortOrder === "number"
                      ? subtype.sortOrder
                      : index,
                })
              ),
            }
            : undefined;
        })(),
    };

    // Debug log the data being created (without nested arrays for readability)
    if (process.env.NODE_ENV === 'development') {
      console.log("Visa data to create:", {
        ...visaData,
        requirements: visaData.requirements ? `${visaData.requirements.create?.length || 0} items` : 'none',
        faqs: visaData.faqs ? `${visaData.faqs.create?.length || 0} items` : 'none',
        subTypes: visaData.subTypes ? `${visaData.subTypes.create?.length || 0} items` : 'none',
      });
    }

    const visa = await prisma.visa.create({
      data: visaData,
      include: {
        country: true,
        requirements: true,
        faqs: true,
        subTypes: true,
      },
    });

    // Revalidate cache for the new visa pages
    if (visa) {
      const countryCode = visa.country?.code?.toLowerCase() || "";
      const visaSlug = visa.slug;
      
      // Revalidate visa detail page
      if (countryCode && visaSlug) {
        revalidatePath(`/visas/${countryCode}/${visaSlug}`);
      }
      
      // Revalidate country visas listing page
      if (countryCode) {
        revalidatePath(`/visas/${countryCode}`);
      }
      
      // Revalidate visas listing page
      revalidatePath("/visas");
      
      // Revalidate homepage if visa is featured
      if (visa.isFeatured) {
        revalidatePath("/");
      }
    }

    return NextResponse.json(visa);
  } catch (error) {
    console.error("Error creating visa:", error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    if (error && typeof error === 'object') {
      try {
        console.error("Error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch {
        console.error("Error object (stringify failed):", error);
      }
    }
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code?: string; meta?: any; message?: string };
      console.error("Prisma error code:", prismaError.code);
      console.error("Prisma error meta:", prismaError.meta);
      
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
        const fieldName = prismaError.meta?.field_name || "reference";
        return NextResponse.json(
          { 
            error: "Invalid reference",
            message: `Invalid ${fieldName}. ${prismaError.message || "The selected country or related entity does not exist."}`
          },
          { status: 400 }
        );
      }
      
      // Handle other Prisma errors with detailed message
      if (prismaError.code) {
        return NextResponse.json(
          { 
            error: "Database error",
            message: prismaError.message || "A database error occurred",
            code: prismaError.code,
            ...(process.env.NODE_ENV === 'development' && { meta: prismaError.meta })
          },
          { status: 500 }
        );
      }
    }
    
    // Handle validation errors
    if (error instanceof Error) {
      // If it's a known validation error, return it
      if (error.message.includes("must be one of") || error.message.includes("must be a string")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    // Generic error response with actual error message
    const errorMessage = error instanceof Error ? error.message : (error as any)?.message || "Unknown error";
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: errorMessage || "An unexpected error occurred while creating the visa. Please try again.",
        ...(process.env.NODE_ENV === 'development' && error instanceof Error && { 
          stack: error.stack,
          details: errorMessage
        })
      },
      { status: 500 }
    );
  }
}
