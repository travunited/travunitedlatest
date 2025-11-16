import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function ensureSuperAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
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

    const tour = await prisma.tour.findUnique({
      where: { id: params.id },
      include: {
        country: true,
        days: {
          orderBy: { dayIndex: "asc" },
        },
      },
    });

    if (!tour) {
      return NextResponse.json(
        { error: "Tour not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tour);
  } catch (error) {
    console.error("Error fetching tour:", error);
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
      destination,
      duration,
      overview,
      description,
      price,
      basePriceInInr,
      inclusions,
      exclusions,
      importantNotes,
      imageUrl,
      heroImageUrl,
      galleryImageUrls,
      isActive,
      isFeatured,
      allowAdvance,
      advancePercentage,
      metaTitle,
      metaDescription,
      days = [],
    } = body;

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

    await prisma.$transaction(async (tx) => {
      await tx.tour.update({
        where: { id: params.id },
        data: {
          countryId: countryId || null,
          name,
          slug: resolvedSlug,
          subtitle: subtitle || null,
          destination,
          duration,
          overview: overview || null,
          description: description || null,
          price: Number(price),
          basePriceInInr: basePriceInInr
            ? Number(basePriceInInr)
            : Number(price),
          inclusions: inclusions || null,
          exclusions: exclusions || null,
          importantNotes: importantNotes || null,
          imageUrl: imageUrl || null,
          heroImageUrl: heroImageUrl || imageUrl || null,
          galleryImageUrls: Array.isArray(galleryImageUrls)
            ? JSON.stringify(galleryImageUrls)
            : galleryImageUrls || null,
          isActive: isActive ?? true,
          isFeatured: isFeatured ?? false,
          allowAdvance: allowAdvance ?? false,
          advancePercentage:
            allowAdvance && advancePercentage
              ? Number(advancePercentage)
              : null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
        },
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
    });

    const updated = await prisma.tour.findUnique({
      where: { id: params.id },
      include: {
        country: true,
        days: { orderBy: { dayIndex: "asc" } },
      },
    });

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
    const authError = ensureSuperAdmin(session);
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating tour flags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

