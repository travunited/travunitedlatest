import { NextResponse } from "next/server";
import crypto from "crypto";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sendVisaPaymentSuccessEmail,
  sendVisaPaymentFailedEmail,
  sendTourPaymentSuccessEmail,
  sendTourPaymentFailedEmail,
} from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
import { notify, notifyMultiple } from "@/lib/notifications";
import { getAdminUserIds } from "@/lib/admin-contacts";
import { recordPromoCodeUsage } from "@/lib/promo-codes";
export const dynamic = "force-dynamic";


export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Webhook received (logging removed for production - uncomment for debugging)
    // console.log("Webhook received:", { hasSignature: !!signature, hasSecret: !!webhookSecret, bodyLength: rawBody.length });

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

    // Webhook event (logging removed for production - uncomment for debugging if needed)

    if (event === "payment.captured") {
      const { payment_id, order_id } = payload.payment.entity;

      const payment = await prisma.payment.findFirst({
        where: {
          razorpayOrderId: order_id,
        },
        include: {
          Application: {
            include: {
              User_Application_userIdToUser: {
                select: { email: true, name: true, id: true, role: true },
              },
            },
          },
          Booking: {
            include: {
              User_Booking_userIdToUser: {
                select: { email: true, id: true, role: true },
              },
            },
          },
          User: {
            select: { id: true },
          },
          PromoCode: {
            select: { code: true },
          },
        } as any,
      });

      if (!payment) {
        console.error("Payment not found for order_id:", order_id);
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      // Idempotency check: if payment is already completed, skip processing
      if (payment.status === "COMPLETED") {
        // Payment already processed (logging removed for production)
        return NextResponse.json({ received: true, message: "Payment already processed" });
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          razorpayPaymentId: payment_id,
        },
      });

      // Record promo code usage if promo code was applied
      const p = payment as any;
      if (p.promoCodeId && p.discountAmount && p.discountAmount > 0) {
        try {
          // Get the original amount before discount
          const originalAmount = p.amount + (p.discountAmount || 0);

          // Idempotency is handled in recordPromoCodeUsage function
          await recordPromoCodeUsage({
            promoCodeId: p.promoCodeId,
            userId: p.userId,
            originalAmount: originalAmount,
            discountAmount: p.discountAmount,
            finalAmount: p.amount,
            applicationId: p.applicationId || undefined,
            bookingId: p.bookingId || undefined,
            paymentId: p.id,
          });
        } catch (error) {
          // Log error but don't fail the webhook processing
          console.error("Error recording promo code usage:", error);
        }
      }

      if (payment.applicationId && (payment as any).Application) {
        const application = (payment as any).Application;
        const user = application.User_Application_userIdToUser;
        const promoCodeCode = (payment as any).PromoCode?.code || null;

        // Update status to DOCUMENTS_PENDING - documents will be uploaded after payment
        await prisma.application.update({
          where: { id: payment.applicationId },
          data: {
            status: "DOCUMENTS_PENDING",
          },
        });

        // Send payment success email with instructions to upload documents
        await sendVisaPaymentSuccessEmail(
          user.email,
          payment.applicationId,
          application.country || "",
          application.visaType || "",
          payment.amount,
          user.role || "CUSTOMER",
          promoCodeCode,
          (payment as any).discountAmount || null
        );

        // Send notification to upload documents
        await notify({
          userId: application.userId,
          type: "VISA_PAYMENT_SUCCESS",
          title: "Payment Successful - Upload Documents",
          message: `Payment of ₹${payment.amount.toLocaleString()} received. Please upload required documents to complete your application.`,
          link: `/dashboard/applications/${payment.applicationId}/documents`,
          data: {
            applicationId: payment.applicationId,
            amount: payment.amount,
            country: application.country,
            visaType: application.visaType,
          },
          sendEmail: false, // Email already sent above
        });

        // Notify admins about payment success and pending documents
        const adminIds = await getAdminUserIds();
        if (adminIds.length > 0) {
          await notifyMultiple(adminIds, {
            type: "ADMIN_APPLICATION_ASSIGNED",
            title: "Payment Received - Documents Pending",
            message: `Payment received for ${application.country || ""} ${application.visaType || ""} application. Waiting for document upload.`,
            link: `/admin/applications/${payment.applicationId}`,
            data: {
              applicationId: payment.applicationId,
              country: application.country,
              visaType: application.visaType,
            },
            sendEmail: false,
            roleScope: "STAFF_ADMIN",
          });
        }
      }

      if (payment.bookingId && (payment as any).Booking) {
        const booking = await prisma.booking.findUnique({
          where: { id: payment.bookingId },
          include: {
            User_Booking_userIdToUser: {
              select: { email: true, id: true, role: true },
            },
            PromoCodeUsage: {
              include: { promoCode: { select: { code: true } } }
            },
          } as any,
        });

        if (booking && (booking as any).User_Booking_userIdToUser) {
          const user = (booking as any).User_Booking_userIdToUser;
          const isAdvance = payment.amount < (booking as any).totalAmount;
          const pendingBalance = (booking as any).totalAmount - payment.amount;
          const promoCodeCode = (payment as any).PromoCode?.code || (booking as any).PromoCodeUsage?.[0]?.promoCode?.code || null;

          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: "BOOKED",
            },
          });

          await sendTourPaymentSuccessEmail(
            user.email,
            payment.bookingId,
            (booking as any).tourName || "",
            payment.amount,
            isAdvance,
            isAdvance ? pendingBalance : undefined,
            user.role || "CUSTOMER",
            promoCodeCode,
            (payment as any).discountAmount || null
          );
          await notify({
            userId: (booking as any).userId,
            type: isAdvance ? "TOUR_PAYMENT_SUCCESS" : "TOUR_BOOKING_CONFIRMED",
            title: isAdvance ? "Advance Payment Received" : "Tour Booking Confirmed",
            message: isAdvance
              ? `Advance payment of ₹${payment.amount.toLocaleString()} received for ${(booking as any).tourName || ""}. Pending balance: ₹${pendingBalance.toLocaleString()}`
              : `Your tour booking "${(booking as any).tourName || ""}" is confirmed.`,
            link: `/dashboard/bookings/${payment.bookingId}`,
            data: {
              bookingId: payment.bookingId,
              amount: payment.amount,
              tourName: (booking as any).tourName,
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
      // Payment failed webhook (logging removed for production - uncomment for debugging if needed)

      // Only update if not already completed (idempotency)
      const updated = await prisma.payment.updateMany({
        where: {
          razorpayOrderId: order_id,
          status: { not: "COMPLETED" }, // Don't override completed payments
        },
        data: { status: "FAILED" },
      });

      // Updated payments to FAILED status (logging removed for production)

      const failedPayments = await prisma.payment.findMany({
        where: { razorpayOrderId: order_id },
        include: {
          Application: {
            include: {
              User_Application_userIdToUser: {
                select: { id: true },
              },
            },
          },
          Booking: {
            include: {
              User_Booking_userIdToUser: {
                select: { id: true },
              },
            },
          },
        } as any,
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

        // Notify user about payment failure and send email
        if (payment.applicationId && (payment as any).Application) {
          const application = await prisma.application.findUnique({
            where: { id: payment.applicationId },
            include: {
              User_Application_userIdToUser: {
                select: { email: true, role: true },
              },
            } as any,
          });

          if (application && (application as any).User_Application_userIdToUser) {
            const user = (application as any).User_Application_userIdToUser;
            try {
              await sendVisaPaymentFailedEmail(
                user.email,
                payment.applicationId,
                application.country || "",
                application.visaType || "",
                payment.amount,
                "Payment was declined or failed. Please try again with a different payment method.",
                user.role || "CUSTOMER"
              );
            } catch (emailError) {
              console.error("Error sending visa payment failed email:", emailError);
            }
          }

          await notify({
            userId: (payment as any).Application.userId,
            type: "VISA_PAYMENT_FAILED",
            title: "Payment Failed",
            message: `Your payment attempt for ₹${payment.amount.toLocaleString()} failed. Please try again.`,
            link: `/dashboard/applications/${payment.applicationId}`,
            data: {
              applicationId: payment.applicationId,
              amount: payment.amount,
            },
            sendEmail: false, // Email already sent above
          });
        }

        if (payment.bookingId && (payment as any).Booking) {
          const booking = await prisma.booking.findUnique({
            where: { id: payment.bookingId },
            include: {
              User_Booking_userIdToUser: {
                select: { email: true, role: true },
              },
            } as any,
          });

          if (booking && (booking as any).User_Booking_userIdToUser) {
            const user = (booking as any).User_Booking_userIdToUser;
            try {
              await sendTourPaymentFailedEmail(
                user.email,
                payment.bookingId,
                (booking as any).tourName || "",
                payment.amount,
                "Payment was declined or failed. Please try again with a different payment method.",
                user.role || "CUSTOMER"
              );
            } catch (emailError) {
              console.error("Error sending tour payment failed email:", emailError);
            }
          }

          await notify({
            userId: (payment as any).Booking.userId,
            type: "TOUR_PAYMENT_FAILED",
            title: "Payment Failed",
            message: `Your payment attempt for ₹${payment.amount.toLocaleString()} failed. Please try again.`,
            link: `/dashboard/bookings/${payment.bookingId}`,
            data: {
              bookingId: payment.bookingId,
              amount: payment.amount,
            },
            sendEmail: false, // Email already sent above
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

