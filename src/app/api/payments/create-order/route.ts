import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureRazorpayClient } from "@/lib/razorpay-server";
import { logAuditEvent } from "@/lib/audit";
export const dynamic = "force-dynamic";



const orderSchema = z.object({
  amount: z.number().positive(),
  applicationId: z.string().optional(),
  bookingId: z.string().optional(),
  paymentType: z.enum(["full", "advance"]).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { amount, applicationId, bookingId, paymentType } = orderSchema.parse(body);

    if (!applicationId && !bookingId) {
      return NextResponse.json(
        { error: "applicationId or bookingId is required" },
        { status: 400 }
      );
    }

    const razorpayKeyId =
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
      return NextResponse.json(
        { error: "Razorpay key is not configured" },
        { status: 500 }
      );
    }

    // Ensure entities belong to current user
    if (applicationId) {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { userId: true },
      });
      if (!application || application.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }
    }

    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { userId: true },
      });
      if (!booking || booking.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }
    }

    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        applicationId: applicationId || null,
        bookingId: bookingId || null,
        amount,
        currency: "INR",
        status: "PENDING",
      },
    });

    if (applicationId) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: "PAYMENT_PENDING",
          totalAmount: amount,
        },
      });
    }

    if (bookingId) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "PAYMENT_PENDING",
        },
      });
    }

    const razorpay = ensureRazorpayClient();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: payment.id,
      notes: {
        applicationId: applicationId || "",
        bookingId: bookingId || "",
        paymentType: paymentType || "",
      },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayOrderId: order.id,
      },
    });

    await logAuditEvent({
      adminId: session.user.id,
      entityType: AuditEntityType.PAYMENT,
      entityId: payment.id,
      action: AuditAction.CREATE,
      description: `Payment initiated for ${applicationId ? "application" : "booking"} ${applicationId || bookingId}`,
      metadata: {
        applicationId,
        bookingId,
        amount,
        currency: "INR",
        razorpayOrderId: order.id,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      paymentId: payment.id,
      amount: order.amount, // amount in paise
      currency: order.currency,
      keyId: razorpayKeyId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating payment order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

