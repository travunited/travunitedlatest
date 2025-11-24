import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const formType = searchParams.get("formType");
    const search = searchParams.get("search");

    const where: any = {};

    if (formType && formType !== "ALL") {
      // For now, all ContactMessage entries are from HELP form
      // We can add formType field later if needed
      // For now, we'll treat all as HELP/SUPPORT
    }

    if (search) {
      where.OR = [
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          subject: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          message: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const submissions = await prisma.contactMessage.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Map to include formType (defaulting to HELP for existing entries)
    const mappedSubmissions = submissions.map((submission) => ({
      ...submission,
      formType: "HELP", // Default form type
    }));

    return NextResponse.json(mappedSubmissions);
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

