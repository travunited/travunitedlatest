import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const promoCodeSchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().optional().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE"]),
  discountValue: z.number().int().nonnegative(),
  minPurchaseAmount: z.number().int().nonnegative().optional().nullable(),
  maxDiscountAmount: z.number().int().nonnegative().optional().nullable(),
  applicableTo: z.enum(["VISAS", "TOURS", "BOTH"]).default("BOTH"),
  visaIds: z.array(z.string()).default([]),
  countryIds: z.array(z.string()).default([]),
  tourIds: z.array(z.string()).default([]),
  maxUses: z.number().int().positive().optional().nullable(),
  maxUsesPerUser: z.number().int().positive().default(1),
  restrictedUserIds: z.array(z.string()).default([]),
  restrictedEmails: z.array(z.string().email()).default([]),
  newUsersOnly: z.boolean().default(false),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  isActive: z.boolean().default(true),
});

// GET - List all promo codes
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // active, inactive, expired, all
    const applicableTo = searchParams.get("applicableTo");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== "all") {
      const now = new Date();
      if (status === "active") {
        where.isActive = true;
        where.validFrom = { lte: now };
        where.validUntil = { gte: now };
      } else if (status === "inactive") {
        where.isActive = false;
      } else if (status === "expired") {
        where.validUntil = { lt: now };
      }
    }

    if (applicableTo && applicableTo !== "all") {
      where.applicableTo = applicableTo;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [promoCodes, total] = await Promise.all([
      prisma.promoCode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: { usages: true },
          },
        },
      }),
      prisma.promoCode.count({ where }),
    ]);

    return NextResponse.json({
      promoCodes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching promo codes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new promo code
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = promoCodeSchema.parse(body);

    // Normalize code to uppercase
    const code = data.code.toUpperCase().trim();

    // Check if code already exists
    const existing = await prisma.promoCode.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A promo code with this code already exists" },
        { status: 400 }
      );
    }

    // Validate dates
    const validFrom = new Date(data.validFrom);
    const validUntil = new Date(data.validUntil);

    if (validUntil <= validFrom) {
      return NextResponse.json(
        { error: "Valid until date must be after valid from date" },
        { status: 400 }
      );
    }

    // Validate discount values
    if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100%" },
        { status: 400 }
      );
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minPurchaseAmount: data.minPurchaseAmount,
        maxDiscountAmount: data.maxDiscountAmount,
        applicableTo: data.applicableTo,
        visaIds: data.visaIds,
        countryIds: data.countryIds,
        tourIds: data.tourIds,
        maxUses: data.maxUses,
        maxUsesPerUser: data.maxUsesPerUser,
        restrictedUserIds: data.restrictedUserIds,
        restrictedEmails: data.restrictedEmails,
        newUsersOnly: data.newUsersOnly,
        validFrom,
        validUntil,
        isActive: data.isActive,
        createdBy: session.user.id,
      },
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.OTHER,
      action: AuditAction.CREATE,
      description: `Created promo code: ${code}`,
      metadata: { promoCodeId: promoCode.id },
    });

    return NextResponse.json(promoCode, { status: 201 });
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

    console.error("Error creating promo code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
