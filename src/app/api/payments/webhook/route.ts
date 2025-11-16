import { NextResponse } from "next/server";
import crypto from "crypto";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sendVisaPaymentSuccessEmail,
  sendTourPaymentSuccessEmail,
} from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Webhook configuration missing" },
        { status: 500 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { event, payload } = body;

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
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          razorpayPaymentId: payment_id,
        },
      });

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
      await logAuditEvent({
        adminId: null,
        entityType: AuditEntityType.PAYMENT,
        entityId: payment.id,
        action: AuditAction.STATUS_CHANGE,
        description: `Payment captured via Razorpay for ${payment.applicationId ? "application" : "booking"} ${payment.applicationId || payment.bookingId}`,
        metadata: {
          applicationId: payment.applicationId,
          bookingId: payment.bookingId,
          amount: payment.amount,
          razorpayOrderId: order_id,
          razorpayPaymentId: payment_id,
        },
      });
    }

    if (event === "payment.failed") {
      const { order_id } = payload.payment.entity;
      await prisma.payment.updateMany({
        where: { razorpayOrderId: order_id },
        data: { status: "FAILED" },
      });

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
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

