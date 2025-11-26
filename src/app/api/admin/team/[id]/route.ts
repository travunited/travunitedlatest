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

async function ensureUniqueSlug(base: string, excludeId: string) {
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

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureAdmin(session);
    if (authError) return authError;

    const teamMember = await prisma.teamMember.findUnique({
      where: { id: params.id },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error("Error fetching team member:", error);
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
    const authError = ensureAdmin(session);
    if (authError) return authError;

    // TypeScript guard: session is guaranteed to be non-null after ensureAdmin check
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.teamMember.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
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

    // Handle slug uniqueness if changed
    let finalSlug = existing.slug;
    if (slug && slug !== existing.slug) {
      finalSlug = await ensureUniqueSlug(slugify(slug), params.id);
    } else if (!slug && name && name !== existing.name) {
      finalSlug = await ensureUniqueSlug(slugify(name), params.id);
    }

    // Handle email uniqueness if changed
    if (email && email !== existing.email) {
      const emailExists = await prisma.teamMember.findUnique({
        where: { email },
        select: { id: true },
      });
      if (emailExists && emailExists.id !== params.id) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      updatedBy: session.user.id,
    };

    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title || null;
    if (finalSlug !== undefined) updateData.slug = finalSlug;
    if (bio !== undefined) updateData.bio = bio || null;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (photoKey !== undefined) updateData.photoKey = photoKey || null;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null;
    if (resumeKey !== undefined) updateData.resumeKey = resumeKey || null;
    if (resumeUrl !== undefined) updateData.resumeUrl = resumeUrl || null;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const teamMember = await prisma.teamMember.update({
      where: { id: params.id },
      data: updateData,
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.TEAM,
      entityId: teamMember.id,
      action: AuditAction.UPDATE,
      description: `Updated team member: ${teamMember.name}`,
      metadata: {
        teamMemberId: teamMember.id,
        name: teamMember.name,
        changes: Object.keys(updateData),
      },
    });

    return NextResponse.json(teamMember);
  } catch (error: any) {
    console.error("Error updating team member:", error);
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureAdmin(session);
    if (authError) return authError;

    // TypeScript guard: session is guaranteed to be non-null after ensureAdmin check
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: { id: params.id },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.teamMember.update({
      where: { id: params.id },
      data: {
        isActive: false,
        updatedBy: session.user.id,
      },
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.TEAM,
      entityId: teamMember.id,
      action: AuditAction.DELETE,
      description: `Deleted team member: ${teamMember.name}`,
      metadata: {
        teamMemberId: teamMember.id,
        name: teamMember.name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting team member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

