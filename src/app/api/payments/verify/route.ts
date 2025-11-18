import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureRazorpayClient } from "@/lib/razorpay-server";
import { z } from "zod";
export const dynamic = "force-dynamic";



const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  bookingId: z.string().optional(),
  applicationId: z.string().optional(),
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, applicationId } = verifySchema.parse(body);

    // Verify signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { error: "Payment verification configuration missing" },
        { status: 500 }
      );
    }

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error("Signature mismatch:", {
        generated: generatedSignature,
        received: razorpay_signature,
      });
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
      },
      include: {
        booking: true,
        application: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    // Verify payment belongs to current user
    if (payment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Verify payment with Razorpay
    const razorpay = ensureRazorpayClient();
    try {
      const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
      
      if (razorpayPayment.status !== "captured" && razorpayPayment.status !== "authorized") {
        return NextResponse.json(
          { error: "Payment not captured" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error verifying payment with Razorpay:", error);
      return NextResponse.json(
        { error: "Failed to verify payment with Razorpay" },
        { status: 500 }
      );
    }

    // Idempotency check: if payment is already completed, return success
    if (payment.status === "COMPLETED") {
      console.log(`Payment ${payment.id} already verified`);
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        applicationId: payment.applicationId,
        message: "Payment already verified",
      });
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    // Update booking status if applicable
    if (payment.bookingId && payment.booking) {
      const booking = payment.booking;
      const isAdvance = payment.amount < booking.totalAmount;

      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: "BOOKED",
        },
      });
    }

    // Update application status if applicable
    if (payment.applicationId && payment.application) {
      await prisma.application.update({
        where: { id: payment.applicationId },
        data: {
          status: "SUBMITTED",
        },
      });
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      bookingId: payment.bookingId,
      applicationId: payment.applicationId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

