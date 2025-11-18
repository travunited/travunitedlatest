import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
export const dynamic = "force-dynamic";



export async function PUT(
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

    const body = await req.json();
    const { isVisible } = body;

    const review = await prisma.review.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        isVisible: true,
        type: true,
        rating: true,
        userId: true,
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.review.update({
      where: { id: params.id },
      data: { isVisible },
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.REVIEW,
      entityId: params.id,
      action: isVisible ? AuditAction.UPDATE : AuditAction.HIDE,
      description: `${isVisible ? "Restored" : "Hid"} ${review.type.toLowerCase()} review (${review.rating}/5)`,
      metadata: {
        reviewerId: review.userId,
        previousVisibility: review.isVisible,
        newVisibility: isVisible,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating review visibility:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
