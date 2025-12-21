import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureRazorpayClient } from "@/lib/razorpay-server";
import { logAuditEvent } from "@/lib/audit";
import { handlePaymentSuccess } from "@/lib/payment-helpers";
export const dynamic = "force-dynamic";



const orderSchema = z.object({
  amount: z.number().nonnegative(), // Allow 0 for free bookings
  applicationId: z.string().optional(),
  bookingId: z.string().optional(),
  paymentType: z.enum(["full", "advance"]).optional(),
  promoCodeId: z.string().optional(),
  discountAmount: z.number().nonnegative().optional(),
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
    
    // Convert amount to number if it's a string
    if (body.amount && typeof body.amount === 'string') {
      body.amount = parseFloat(body.amount);
    }
    
    const { amount, applicationId, bookingId, paymentType, promoCodeId, discountAmount } = orderSchema.parse(body);

    if (!applicationId && !bookingId) {
      return NextResponse.json(
        { error: "applicationId or bookingId is required" },
        { status: 400 }
      );
    }

    // Handle free bookings/applications (amount <= 0)
    if (amount <= 0) {
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
          select: { userId: true, policyAccepted: true, policyAcceptedAt: true },
        });
        if (!booking || booking.userId !== session.user.id) {
          return NextResponse.json(
            { error: "Booking not found" },
            { status: 404 }
          );
        }
        if (!booking.policyAccepted) {
          return NextResponse.json(
            { error: "Refund & cancellation policy must be accepted before payment." },
            { status: 400 }
          );
        }
      }

      // Create free payment record
      const payment = await prisma.payment.create({
        data: {
          userId: session.user.id,
          applicationId: applicationId || null,
          bookingId: bookingId || null,
          amount: 0,
          currency: "INR",
          status: "COMPLETED",
          provider: "NONE",
          method: "FREE",
          promoCodeId: promoCodeId || null,
          discountAmount: discountAmount || 0,
          metadata: {
            note: "Free booking/application - no payment required",
            paymentType: paymentType || null,
          },
        } as any, // Type assertion needed until Prisma client is regenerated
      });

      // Record promo code usage for free payments if promo code was applied
      if (promoCodeId && discountAmount && discountAmount > 0) {
        try {
          const { recordPromoCodeUsage } = await import("@/lib/promo-codes");
          await recordPromoCodeUsage({
            promoCodeId,
            userId: session.user.id,
            originalAmount: discountAmount, // Original amount was the discount amount for free items
            discountAmount: discountAmount,
            finalAmount: 0,
            applicationId: applicationId || undefined,
            bookingId: bookingId || undefined,
            paymentId: payment.id,
          });
        } catch (error) {
          console.error("Error recording promo code usage:", error);
        }
      }

      // Update booking/application status
      if (applicationId) {
        await prisma.application.update({
          where: { id: applicationId },
          data: {
            status: "SUBMITTED",
            totalAmount: 0,
          },
        });
      }

      if (bookingId) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "BOOKED",
          },
        });
      }

      // Run post-payment success workflow
      await handlePaymentSuccess({
        paymentId: payment.id,
        bookingId: bookingId || null,
        applicationId: applicationId || null,
      });

      // Log audit event
      await logAuditEvent({
        adminId: session.user.id,
        entityType: AuditEntityType.PAYMENT,
        entityId: payment.id,
        action: AuditAction.CREATE,
        description: `Free payment processed for ${applicationId ? "application" : "booking"} ${applicationId || bookingId}`,
        metadata: {
          applicationId,
          bookingId,
          amount: 0,
          provider: "NONE",
          method: "FREE",
          isFree: true,
        },
      });

      // Return success response for free booking
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        amount: 0,
        currency: "INR",
        isFree: true,
        message: "Free booking confirmed - no payment required",
      });
    }

    // Normal payment flow (amount > 0)
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
        select: { userId: true, policyAccepted: true, policyAcceptedAt: true },
      });
      if (!booking || booking.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }
      if (!booking.policyAccepted) {
        return NextResponse.json(
          { error: "Refund & cancellation policy must be accepted before payment." },
          { status: 400 }
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
        provider: "RAZORPAY",
        promoCodeId: promoCodeId || null,
        discountAmount: discountAmount || 0,
      } as any,
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
      console.error("Payment order validation error:", error.errors);
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating payment order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

