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

    // Filter out submissions with missing email (shouldn't happen, but safety check)
    // Map to include formType (defaulting to HELP for existing entries) and serialize dates
    const mappedSubmissions = submissions
      .filter((submission) => submission.email != null && submission.email.trim() !== "")
      .map((submission) => ({
        id: submission.id,
        name: submission.name,
        email: submission.email,
        phone: submission.phone,
        subject: submission.subject,
        message: submission.message,
        formType: "HELP", // Default form type
        createdAt: submission.createdAt.toISOString(),
        updatedAt: submission.updatedAt.toISOString(),
      }));

    return NextResponse.json(mappedSubmissions);
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: errorMessage,
        ...(process.env.NODE_ENV === "development" && errorStack ? { details: errorStack } : {})
      },
      { status: 500 }
    );
  }
}

