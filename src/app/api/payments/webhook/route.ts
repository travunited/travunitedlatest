import { NextResponse } from "next/server";
import crypto from "crypto";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sendVisaPaymentSuccessEmail,
  sendTourPaymentSuccessEmail,
} from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
import { notify } from "@/lib/notifications";
export const dynamic = "force-dynamic";


export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    console.log("Webhook received:", {
      hasSignature: !!signature,
      hasSecret: !!webhookSecret,
      bodyLength: rawBody.length,
    });

    if (!signature || !webhookSecret) {
      console.error("Webhook configuration missing");
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
                select: { email: true, name: true, id: true, role: true },
              },
            },
          },
          booking: {
            include: {
              user: {
                select: { email: true, name: true, id: true, role: true },
              },
            },
          },
          user: {
            select: { id: true },
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
          payment.amount,
          payment.application.user.role || "CUSTOMER"
        );
        await notify({
          userId: payment.application.userId,
          type: "VISA_PAYMENT_SUCCESS",
          title: "Payment Successful",
          message: `Payment of ₹${payment.amount.toLocaleString()} received for your visa application. Your application has been submitted.`,
          link: `/dashboard/applications/${payment.applicationId}`,
          data: {
            applicationId: payment.applicationId,
            amount: payment.amount,
            country: payment.application.country,
            visaType: payment.application.visaType,
          },
          sendEmail: false, // Email already sent above
        });
        // Notify customer about application submission
        await notify({
          userId: payment.application.userId,
          type: "VISA_APPLICATION_SUBMITTED",
          title: "Visa Application Submitted",
          message: `Your visa application for ${payment.application.country || ""} ${payment.application.visaType || ""} has been submitted successfully.`,
          link: `/dashboard/applications/${payment.applicationId}`,
          data: {
            applicationId: payment.applicationId,
            country: payment.application.country,
            visaType: payment.application.visaType,
          },
          sendEmail: false, // Email already sent above
        });
      }

      if (payment.bookingId && payment.booking) {
        const booking = await prisma.booking.findUnique({
          where: { id: payment.bookingId },
          include: {
            user: {
              select: { email: true, id: true, role: true },
            },
          },
        });

        if (booking && booking.user) {
          const isAdvance = payment.amount < booking.totalAmount;
          const pendingBalance = booking.totalAmount - payment.amount;

          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: "BOOKED",
            },
          });

          await sendTourPaymentSuccessEmail(
            booking.user.email,
            payment.bookingId,
            booking.tourName || "",
            payment.amount,
            isAdvance,
            isAdvance ? pendingBalance : undefined,
            booking.user.role || "CUSTOMER"
          );
          await notify({
            userId: booking.userId,
            type: isAdvance ? "TOUR_PAYMENT_SUCCESS" : "TOUR_BOOKING_CONFIRMED",
            title: isAdvance ? "Advance Payment Received" : "Tour Booking Confirmed",
            message: isAdvance
              ? `Advance payment of ₹${payment.amount.toLocaleString()} received for ${booking.tourName || ""}. Pending balance: ₹${pendingBalance.toLocaleString()}`
              : `Your tour booking "${booking.tourName || ""}" is confirmed.`,
            link: `/dashboard/bookings/${payment.bookingId}`,
            data: {
              bookingId: payment.bookingId,
              amount: payment.amount,
              tourName: booking.tourName,
              isAdvance,
              pendingBalance: isAdvance ? pendingBalance : undefined,
            },
            sendEmail: false, // Email already sent above
          });
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
        include: {
          application: {
            include: {
              user: {
                select: { id: true },
              },
            },
          },
          booking: {
            include: {
              user: {
                select: { id: true },
              },
            },
          },
        },
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

        // Notify user about payment failure
        if (payment.applicationId && payment.application) {
          await notify({
            userId: payment.application.userId,
            type: "VISA_PAYMENT_FAILED",
            title: "Payment Failed",
            message: `Your payment attempt for ₹${payment.amount.toLocaleString()} failed. Please try again.`,
            link: `/dashboard/applications/${payment.applicationId}`,
            data: {
              applicationId: payment.applicationId,
              amount: payment.amount,
            },
            sendEmail: true,
          });
        }

        if (payment.bookingId && payment.booking) {
          await notify({
            userId: payment.booking.userId,
            type: "TOUR_PAYMENT_FAILED",
            title: "Payment Failed",
            message: `Your payment attempt for ₹${payment.amount.toLocaleString()} failed. Please try again.`,
            link: `/dashboard/bookings/${payment.bookingId}`,
            data: {
              bookingId: payment.bookingId,
              amount: payment.amount,
            },
            sendEmail: true,
          });
        }
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

