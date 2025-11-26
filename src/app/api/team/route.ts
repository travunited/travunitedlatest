import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMediaProxyUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const isActive = url.searchParams.get("isActive");
    const isFeatured = url.searchParams.get("isFeatured");
    const limit = Number(url.searchParams.get("limit") || 100);

    const where: any = {};

    // Default to active members only for public API
    if (isActive === null || isActive === undefined) {
      where.isActive = true;
    } else {
      where.isActive = isActive === "true";
    }

    if (isFeatured !== null && isFeatured !== undefined) {
      where.isFeatured = isFeatured === "true";
    }

    const teamMembers = await prisma.teamMember.findMany({
      where,
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        title: true,
        slug: true,
        bio: true,
        email: true,
        phone: true,
        photoUrl: true,
        photoKey: true,
        resumeUrl: true,
        resumeKey: true,
        socialLinks: true,
        isFeatured: true,
        sortOrder: true,
      },
    });

    // Map to include media proxy URLs
    const membersWithUrls = teamMembers.map((member) => ({
      ...member,
      photoUrl: member.photoUrl || (member.photoKey ? getMediaProxyUrl(member.photoKey) : null),
      resumeUrl: member.resumeUrl || (member.resumeKey ? getMediaProxyUrl(member.resumeKey) : null),
    }));

    return NextResponse.json(membersWithUrls);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

