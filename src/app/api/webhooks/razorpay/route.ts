import { NextResponse } from "next/server";
import crypto from "crypto";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sendVisaPaymentSuccessEmail,
  sendTourPaymentSuccessEmail,
} from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
export const dynamic = "force-dynamic";


export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    
    // Use the provided webhook secret
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "TRAVunited@@@1234";

    console.log("Razorpay webhook received:", {
      hasSignature: !!signature,
      hasSecret: !!webhookSecret,
      bodyLength: rawBody.length,
      timestamp: new Date().toISOString(),
    });

    if (!signature) {
      console.error("Missing webhook signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return NextResponse.json(
        { error: "Webhook configuration missing" },
        { status: 500 }
      );
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Invalid webhook signature:", {
        expected: expectedSignature.substring(0, 20) + "...",
        received: signature.substring(0, 20) + "...",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { event, payload } = body;

    console.log("Webhook event:", event, {
      order_id: payload?.payment?.entity?.order_id,
      payment_id: payload?.payment?.entity?.payment_id,
    });

    // Handle payment.captured event
    if (event === "payment.captured") {
      const { payment_id, order_id } = payload.payment.entity;

      const payment = await prisma.payment.findFirst({
        where: {
          razorpayOrderId: order_id,
        },
        include: {
          application: {
            include: {
              user: {
                select: { email: true, name: true },
              },
            },
          },
          booking: {
            include: {
              user: {
                select: { email: true, name: true },
              },
            },
          },
        },
      });

      if (!payment) {
        console.error("Payment not found for order_id:", order_id);
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      // Idempotency check: if payment is already completed, skip processing
      if (payment.status === "COMPLETED") {
        console.log(`Payment ${payment.id} already completed, skipping webhook processing`);
        return NextResponse.json({ received: true, message: "Payment already processed" });
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          razorpayPaymentId: payment_id,
        },
      });

      // Update application status if applicable
      if (payment.applicationId && payment.application) {
        await prisma.application.update({
          where: { id: payment.applicationId },
          data: {
            status: "SUBMITTED",
          },
        });

        await sendVisaPaymentSuccessEmail(
          payment.application.user.email,
          payment.applicationId,
          payment.application.country || "",
          payment.application.visaType || "",
          payment.amount
        );
      }

      // Update booking status if applicable
      if (payment.bookingId && payment.booking) {
        const booking = await prisma.booking.findUnique({
          where: { id: payment.bookingId },
        });

        if (booking) {
          const isAdvance = payment.amount < booking.totalAmount;
          const pendingBalance = booking.totalAmount - payment.amount;

          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: "BOOKED",
            },
          });

          await sendTourPaymentSuccessEmail(
            payment.booking.user.email,
            payment.bookingId,
            booking.tourName || "",
            payment.amount,
            isAdvance,
            isAdvance ? pendingBalance : undefined
          );
        }
      }

      // Log audit event
      await logAuditEvent({
        adminId: null,
        entityType: AuditEntityType.PAYMENT,
        entityId: payment.id,
        action: AuditAction.STATUS_CHANGE,
        description: `Payment captured via Razorpay webhook for ${payment.applicationId ? "application" : "booking"} ${payment.applicationId || payment.bookingId}`,
        metadata: {
          applicationId: payment.applicationId,
          bookingId: payment.bookingId,
          amount: payment.amount,
          razorpayOrderId: order_id,
          razorpayPaymentId: payment_id,
        },
      });

      console.log(`Successfully processed payment.captured for payment ${payment.id}`);
    }

    // Handle payment.failed event
    if (event === "payment.failed") {
      const { order_id, payment_id } = payload.payment.entity;
      console.log("Payment failed webhook:", { order_id, payment_id });

      // Only update if not already completed (idempotency)
      const updated = await prisma.payment.updateMany({
        where: { 
          razorpayOrderId: order_id,
          status: { not: "COMPLETED" }, // Don't override completed payments
        },
        data: { status: "FAILED" },
      });

      console.log(`Updated ${updated.count} payment(s) to FAILED status`);

      const failedPayments = await prisma.payment.findMany({
        where: { razorpayOrderId: order_id },
        select: { id: true, applicationId: true, bookingId: true, amount: true },
      });

      for (const payment of failedPayments) {
        await logAuditEvent({
          adminId: null,
          entityType: AuditEntityType.PAYMENT,
          entityId: payment.id,
          action: AuditAction.UPDATE,
          description: `Payment failed for ${payment.applicationId ? "application" : "booking"} ${payment.applicationId || payment.bookingId}`,
          metadata: {
            applicationId: payment.applicationId,
            bookingId: payment.bookingId,
            amount: payment.amount,
            razorpayOrderId: order_id,
            razorpayPaymentId: payment_id,
          },
        });
      }
    }

    // Handle order.paid event (alternative event name)
    if (event === "order.paid") {
      const { id: order_id } = payload.order.entity;
      console.log("Order paid webhook:", { order_id });

      const payment = await prisma.payment.findFirst({
        where: {
          razorpayOrderId: order_id,
        },
      });

      if (payment && payment.status !== "COMPLETED") {
        // Fetch payment details from Razorpay if needed
        // For now, we'll rely on payment.captured event
        console.log(`Order ${order_id} paid, but waiting for payment.captured event`);
      }
    }

    return NextResponse.json({ received: true, event });
  } catch (error) {
    console.error("Error processing Razorpay webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also handle GET requests for webhook verification/testing
export async function GET() {
  return NextResponse.json({ 
    message: "Razorpay webhook endpoint is active",
    webhookUrl: "https://travunited.com/api/webhooks/razorpay",
    timestamp: new Date().toISOString(),
  });
}

