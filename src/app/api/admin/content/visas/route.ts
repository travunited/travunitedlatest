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
    } = body;

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
      slug?.trim() || slugify(name)
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

    const visa = await prisma.visa.create({
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
        entryTypeLegacy: entryType || null,
        visaMode: parsedVisaMode,
        entryType: parsedEntryType,
        stayType: parsedStayType,
        visaSubTypeLabel: visaSubTypeLabel || null,
        overview,
        eligibility,
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
      },
      include: {
        country: true,
        requirements: true,
        faqs: true,
      },
    });

    return NextResponse.json(visa);
  } catch (error) {
    console.error("Error creating visa:", error);
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
