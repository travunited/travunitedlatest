import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureSuperAdmin(session);
    if (authError) return authError;

    const url = new URL(req.url);
    const search = url.searchParams.get("search");
    const status = url.searchParams.get("status");

    const countries = await prisma.country.findMany({
      where: {
        ...(status === "active"
          ? { isActive: true }
          : status === "inactive"
          ? { isActive: false }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
                { region: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            visas: true,
            tours: true,
          },
        },
      },
    });

    return NextResponse.json(countries);
  } catch (error) {
    console.error("Error fetching countries:", error);
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
    const name = (body.name || "").trim();
    const code = (body.code || "").trim();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const country = await prisma.country.create({
      data: {
        name,
        code: code.toUpperCase(),
        region: body.region?.trim() || null,
        flagUrl: body.flagUrl?.trim() || null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(country);
  } catch (error) {
    console.error("Error creating country:", error);
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Country code must be unique" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

