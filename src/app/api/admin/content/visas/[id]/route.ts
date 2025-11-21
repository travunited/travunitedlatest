import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocScope } from "@prisma/client";
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

function ensureSuperAdmin(session: Session | null) {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden - Super Admin access required" },
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
    const authError = ensureSuperAdmin(session);
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
    const authError = ensureSuperAdmin(session);
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
      metaTitle,
      metaDescription,
      // New fields
      stayDurationDays,
      validityDays,
      govtFee,
      serviceFee,
      currency,
      requirements = [],
      faqs = [],
    } = body;

    if (
      !countryId ||
      !name ||
      !category ||
      !priceInInr ||
      !processingTime ||
      !stayDuration ||
      !validity ||
      !entryType ||
      !overview ||
      !eligibility
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const resolvedSlug = await ensureUniqueSlug(
      (slug?.trim() || slugify(name)) ?? "",
      params.id
    );

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
          entryType,
          overview,
          eligibility,
          importantNotes: importantNotes || null,
          rejectionReasons: rejectionReasons || null,
          whyTravunited: whyTravunited || null,
          statistics: statistics || null,
          heroImageUrl: normalizeMediaInput(heroImageUrl),
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          // New fields
          stayDurationDays: stayDurationDays !== undefined ? (stayDurationDays === null ? null : Number(stayDurationDays)) : undefined,
          validityDays: validityDays !== undefined ? (validityDays === null ? null : Number(validityDays)) : undefined,
          govtFee: govtFee !== undefined ? (govtFee === null ? null : Number(govtFee)) : undefined,
          serviceFee: serviceFee !== undefined ? (serviceFee === null ? null : Number(serviceFee)) : undefined,
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
    const authError = ensureSuperAdmin(session);
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

