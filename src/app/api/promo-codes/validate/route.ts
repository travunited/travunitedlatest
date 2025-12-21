import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validatePromoCode } from "@/lib/promo-codes";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const validateSchema = z.object({
  code: z.string().min(1, "Promo code is required"),
  amount: z.number().nonnegative("Amount must be non-negative"),
  type: z.enum(["visa", "tour"]),
  applicationId: z.string().optional(),
  bookingId: z.string().optional(),
  visaId: z.string().optional(),
  countryId: z.string().optional(),
  tourId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = validateSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    const result = await validatePromoCode({
      code: data.code,
      amount: data.amount,
      type: data.type,
      userId: session.user.id,
      applicationId: data.applicationId,
      bookingId: data.bookingId,
      visaId: data.visaId,
      countryId: data.countryId,
      tourId: data.tourId,
      userEmail: user?.email,
    });

    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: result.error || "Invalid promo code",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid input",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error("Error validating promo code:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "An error occurred while validating the promo code",
      },
      { status: 500 }
    );
  }
}
