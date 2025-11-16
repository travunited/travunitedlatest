import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const country = await prisma.country.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { visas: true, tours: true } },
      },
    });

    if (!country) {
      return NextResponse.json(
        { error: "Country not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(country);
  } catch (error) {
    console.error("Error fetching country:", error);
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
    const name = (body.name || "").trim();
    const code = (body.code || "").trim();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const country = await prisma.country.update({
      where: { id: params.id },
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
    console.error("Error updating country:", error);
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const authError = ensureSuperAdmin(session);
    if (authError) return authError;

    const country = await prisma.country.findUnique({
      where: { id: params.id },
      include: { _count: { select: { visas: true, tours: true } } },
    });

    if (!country) {
      return NextResponse.json(
        { error: "Country not found" },
        { status: 404 }
      );
    }

    if (country._count.visas > 0 || country._count.tours > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete country while visas or tours are linked. Deactivate instead.",
        },
        { status: 400 }
      );
    }

    await prisma.country.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting country:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

