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
      // Filter logic if needed
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

    // Convert to CSV
    const headers = ["Email", "Subject", "Message", "Form Type", "Submitted On"];
    const rows = submissions.map((submission) => [
      submission.email,
      submission.subject,
      submission.message.replace(/"/g, '""'), // Escape quotes
      "HELP",
      new Date(submission.createdAt).toISOString(),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=form-submissions-${new Date().toISOString().split("T")[0]}.csv`,
      },
    });
  } catch (error) {
    console.error("Error exporting form submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

