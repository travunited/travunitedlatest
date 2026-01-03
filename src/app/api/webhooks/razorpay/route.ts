import { NextResponse } from "next/server";
import crypto from "crypto";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sendVisaPaymentSuccessEmail,
  sendTourPaymentSuccessEmail,
  sendVisaPaymentFailedEmail,
  sendTourPaymentFailedEmail,
} from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import {
  paymentInclude,
  notifyAdminsOfPaymentSuccess,
  notifyAdminsOfPaymentFailure,
} from "@/lib/payment-helpers";
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
        include: paymentInclude,
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
      const p = payment as any;
      if (payment.applicationId && p.Application) {
        const application = p.Application;
        const user = application.User_Application_userIdToUser;

        await prisma.application.update({
          where: { id: payment.applicationId },
          data: {
            status: "SUBMITTED",
          },
        });

        if (user.email) {
          await sendVisaPaymentSuccessEmail(
            user.email,
            payment.applicationId,
            application.country || "",
            application.visaType || "",
            payment.amount
          );
        }
      }

      // Update booking status if applicable
      if (payment.bookingId && p.Booking) {
        const bookingInclude = p.Booking;
        const user = bookingInclude.User_Booking_userIdToUser;

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

          if (user.email) {
            await sendTourPaymentSuccessEmail(
              user.email,
              payment.bookingId,
              booking.tourName || "",
              payment.amount,
              isAdvance,
              isAdvance ? pendingBalance : undefined
            );
          }
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

      try {
        await notifyAdminsOfPaymentSuccess(payment);
      } catch (adminNotifyError) {
        console.error("Failed to notify admins about payment success:", adminNotifyError);
      }
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

      const failureEntity = payload?.payment?.entity;
      const failureReason =
        failureEntity?.error_description ||
        failureEntity?.description ||
        failureEntity?.notes?.reason ||
        "Payment failed. Please try again.";

      const failedPayments = await prisma.payment.findMany({
        where: { razorpayOrderId: order_id },
        include: paymentInclude,
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

        const amountFormatted = `₹${payment.amount.toLocaleString()}`;
        const baseMessage = `${amountFormatted} payment failed.`;

        if (payment.applicationId && (payment as any).Application) {
          const application = (payment as any).Application;
          const user = application.User_Application_userIdToUser;
          try {
            await notify({
              userId: application.userId,
              type: "VISA_PAYMENT_FAILED",
              title: "Payment Failed",
              message: `${baseMessage} ${failureReason}`,
              link: `/dashboard/applications/${payment.applicationId}`,
              data: {
                applicationId: payment.applicationId,
                amount: payment.amount,
                reason: failureReason,
              },
            });
          } catch (notifyError) {
            console.error("Failed to notify applicant about payment failure:", notifyError);
          }

          if (user?.email) {
            try {
              await sendVisaPaymentFailedEmail(
                user.email,
                payment.applicationId,
                application.country || "",
                application.visaType || "",
                payment.amount,
                failureReason,
                user.role || "CUSTOMER"
              );
            } catch (emailError) {
              console.error("Failed to send visa payment failure email:", emailError);
            }
          }
        } else if (payment.bookingId && (payment as any).Booking) {
          const bookingInclude = (payment as any).Booking;
          const user = bookingInclude.User_Booking_userIdToUser;
          try {
            await notify({
              userId: bookingInclude.userId,
              type: "TOUR_PAYMENT_FAILED",
              title: "Payment Failed",
              message: `${baseMessage} ${failureReason}`,
              link: `/dashboard/bookings/${payment.bookingId}`,
              data: {
                bookingId: payment.bookingId,
                amount: payment.amount,
                reason: failureReason,
              },
            });
          } catch (notifyError) {
            console.error("Failed to notify customer about tour payment failure:", notifyError);
          }

          if (user?.email) {
            try {
              const booking = await prisma.booking.findUnique({
                where: { id: payment.bookingId },
              });
              await sendTourPaymentFailedEmail(
                user.email,
                payment.bookingId,
                booking?.tourName || bookingInclude.Tour?.name || "Tour",
                payment.amount,
                failureReason,
                user.role || "CUSTOMER"
              );
            } catch (emailError) {
              console.error("Failed to send tour payment failure email:", emailError);
            }
          }
        }

        try {
          await notifyAdminsOfPaymentFailure(payment, failureReason);
        } catch (adminNotifyError) {
          console.error("Failed to notify admins about payment failure:", adminNotifyError);
        }
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

