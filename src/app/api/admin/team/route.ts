import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";

export const dynamic = "force-dynamic";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function ensureUniqueSlug(base: string, excludeId?: string) {
  let slug = base || "team-member";
  let suffix = 1;
  while (true) {
    const existing = await prisma.teamMember.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) break;
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

function ensureAdmin(session: any) {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Forbidden - Admin access required" },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureAdmin(session);
    if (authError) return authError;

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const isActive = url.searchParams.get("isActive");
    const isFeatured = url.searchParams.get("isFeatured");
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || 20);
    const sort = url.searchParams.get("sort") || "sortOrder:asc";

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (isFeatured !== null && isFeatured !== undefined) {
      where.isFeatured = isFeatured === "true";
    }

    const [items, total] = await Promise.all([
      prisma.teamMember.findMany({
        where,
        orderBy: sort === "sortOrder:asc" 
          ? { sortOrder: "asc" }
          : sort === "sortOrder:desc"
          ? { sortOrder: "desc" }
          : { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.teamMember.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureAdmin(session);
    if (authError) return authError;

    // TypeScript guard: session is guaranteed to be non-null after ensureAdmin check
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      title,
      slug,
      bio,
      email,
      phone,
      photoKey,
      photoUrl,
      resumeKey,
      resumeUrl,
      socialLinks,
      isActive,
      isFeatured,
      sortOrder,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const finalSlug = slug
      ? await ensureUniqueSlug(slugify(slug))
      : await ensureUniqueSlug(slugify(name));

    // Check email uniqueness if provided
    if (email) {
      const existing = await prisma.teamMember.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        name,
        title: title || null,
        slug: finalSlug,
        bio: bio || null,
        email: email || null,
        phone: phone || null,
        photoKey: photoKey || null,
        photoUrl: photoUrl || null,
        resumeKey: resumeKey || null,
        resumeUrl: resumeUrl || null,
        socialLinks: socialLinks || null,
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
        sortOrder: sortOrder ?? 0,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.TEAM,
      entityId: teamMember.id,
      action: AuditAction.CREATE,
      description: `Created team member: ${name}`,
      metadata: {
        teamMemberId: teamMember.id,
        name: teamMember.name,
        email: teamMember.email,
      },
    });

    return NextResponse.json(teamMember);
  } catch (error: any) {
    console.error("Error creating team member:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Slug or email already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

