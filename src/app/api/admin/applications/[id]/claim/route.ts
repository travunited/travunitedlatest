import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const application = await prisma.application.findUnique({
      where: { id: params.id },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.processedById) {
      return NextResponse.json(
        { error: "Application already assigned" },
        { status: 400 }
      );
    }

    // Claim the application
    await prisma.application.update({
      where: { id: params.id },
      data: {
        processedById: session.user.id,
        status: "IN_PROCESS",
      },
    });

    return NextResponse.json({ message: "Application claimed successfully" });
  } catch (error) {
    console.error("Error claiming application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

