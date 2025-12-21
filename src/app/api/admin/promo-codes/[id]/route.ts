import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updatePromoCodeSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  description: z.string().optional().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE"]).optional(),
  discountValue: z.number().int().nonnegative().optional(),
  minPurchaseAmount: z.number().int().nonnegative().optional().nullable(),
  maxDiscountAmount: z.number().int().nonnegative().optional().nullable(),
  applicableTo: z.enum(["VISAS", "TOURS", "BOTH"]).optional(),
  visaIds: z.array(z.string()).optional(),
  countryIds: z.array(z.string()).optional(),
  tourIds: z.array(z.string()).optional(),
  maxUses: z.number().int().positive().optional().nullable(),
  maxUsesPerUser: z.number().int().positive().optional(),
  restrictedUserIds: z.array(z.string()).optional(),
  restrictedEmails: z.array(z.string().email()).optional(),
  newUsersOnly: z.boolean().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

// GET - Get single promo code
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const promoCode = await prisma.promoCode.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });

    if (!promoCode) {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(promoCode);
  } catch (error) {
    console.error("Error fetching promo code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update promo code
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const promoCode = await prisma.promoCode.findUnique({
      where: { id: params.id },
    });

    if (!promoCode) {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const data = updatePromoCodeSchema.parse(body);

    // If code is being updated, check if new code already exists
    if (data.code && data.code.toUpperCase().trim() !== promoCode.code) {
      const newCode = data.code.toUpperCase().trim();
      const existing = await prisma.promoCode.findUnique({
        where: { code: newCode },
      });

      if (existing) {
        return NextResponse.json(
          { error: "A promo code with this code already exists" },
          { status: 400 }
        );
      }
    }

    // Validate dates if provided
    const validFrom = data.validFrom ? new Date(data.validFrom) : promoCode.validFrom;
    const validUntil = data.validUntil ? new Date(data.validUntil) : promoCode.validUntil;

    if (validUntil <= validFrom) {
      return NextResponse.json(
        { error: "Valid until date must be after valid from date" },
        { status: 400 }
      );
    }

    // Validate discount values
    const discountValue = data.discountValue ?? promoCode.discountValue;
    const discountType = data.discountType ?? promoCode.discountType;
    if (discountType === "PERCENTAGE" && discountValue > 100) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100%" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (data.code) updateData.code = data.code.toUpperCase().trim();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.discountType) updateData.discountType = data.discountType;
    if (data.discountValue !== undefined) updateData.discountValue = data.discountValue;
    if (data.minPurchaseAmount !== undefined) updateData.minPurchaseAmount = data.minPurchaseAmount;
    if (data.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = data.maxDiscountAmount;
    if (data.applicableTo) updateData.applicableTo = data.applicableTo;
    if (data.visaIds) updateData.visaIds = data.visaIds;
    if (data.countryIds) updateData.countryIds = data.countryIds;
    if (data.tourIds) updateData.tourIds = data.tourIds;
    if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
    if (data.maxUsesPerUser !== undefined) updateData.maxUsesPerUser = data.maxUsesPerUser;
    if (data.restrictedUserIds) updateData.restrictedUserIds = data.restrictedUserIds;
    if (data.restrictedEmails) updateData.restrictedEmails = data.restrictedEmails;
    if (data.newUsersOnly !== undefined) updateData.newUsersOnly = data.newUsersOnly;
    if (data.validFrom) updateData.validFrom = validFrom;
    if (data.validUntil) updateData.validUntil = validUntil;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.promoCode.update({
      where: { id: params.id },
      data: updateData,
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.OTHER,
      action: AuditAction.UPDATE,
      description: `Updated promo code: ${updated.code}`,
      metadata: { promoCodeId: updated.id },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error("Error updating promo code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete/deactivate promo code
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const promoCode = await prisma.promoCode.findUnique({
      where: { id: params.id },
    });

    if (!promoCode) {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const updated = await prisma.promoCode.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.OTHER,
      action: AuditAction.DELETE,
      description: `Deactivated promo code: ${promoCode.code}`,
      metadata: { promoCodeId: promoCode.id },
    });

    return NextResponse.json({ message: "Promo code deactivated", promoCode: updated });
  } catch (error) {
    console.error("Error deleting promo code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
