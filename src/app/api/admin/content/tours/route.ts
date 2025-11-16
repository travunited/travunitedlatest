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

async function ensureUniqueSlug(baseSlug: string) {
  let slug = baseSlug || "tour";
  let suffix = 1;
  while (true) {
    const existing = await prisma.tour.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) break;
    slug = `${baseSlug}-${suffix++}`;
  }
  return slug;
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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureSuperAdmin(session);
    if (authError) return authError;

    const url = new URL(req.url);
    const countryId = url.searchParams.get("countryId");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    const tours = await prisma.tour.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        ...(status === "active"
          ? { isActive: true }
          : status === "inactive"
          ? { isActive: false }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { destination: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        country: true,
        _count: {
          select: {
            days: true,
            bookings: true,
          },
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(tours);
  } catch (error) {
    console.error("Error fetching tours:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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
      slug?.trim() || slugify(name)
    );

    const tour = await prisma.tour.create({
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
        days: days.length
          ? {
              create: days.map(
                (day: { title: string; content: string; dayIndex?: number }, index: number) => ({
                  title: day.title,
                  content: day.content,
                  dayIndex:
                    typeof day.dayIndex === "number"
                      ? day.dayIndex
                      : index + 1,
                })
              ),
            }
          : undefined,
      },
      include: {
        country: true,
        days: {
          orderBy: { dayIndex: "asc" },
        },
      },
    });

    return NextResponse.json(tour);
  } catch (error) {
    console.error("Error creating tour:", error);
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
