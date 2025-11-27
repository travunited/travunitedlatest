import { prisma } from "@/lib/prisma";
import { sendTourPaymentSuccessEmail, sendVisaPaymentSuccessEmail } from "@/lib/email";
import { notify } from "@/lib/notifications";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType } from "@prisma/client";

/**
 * Handles post-payment success workflow for both paid and free bookings/applications
 * This includes:
 * - Updating booking/application status
 * - Sending confirmation emails
 * - Sending notifications
 * - Logging audit events
 */
export async function handlePaymentSuccess({
  paymentId,
  bookingId,
  applicationId,
}: {
  paymentId: string;
  bookingId?: string | null;
  applicationId?: string | null;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: {
        include: {
          user: {
            select: { email: true, name: true, id: true, role: true },
          },
          tour: {
            select: { name: true },
          },
        },
      },
      application: {
        include: {
          user: {
            select: { email: true, name: true, id: true, role: true },
          },
        },
      },
      user: {
        select: { id: true, email: true, name: true, role: true },
      },
    },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Handle booking payment success
  if (bookingId && payment.booking) {
    // Update booking status to BOOKED
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "BOOKED",
      },
    });

    // Send email notification
    try {
      await sendTourPaymentSuccessEmail(
        payment.booking.user.email,
        bookingId,
        payment.booking.tourName || payment.booking.tour?.name || "Tour",
        payment.amount,
        false // isAdvance - for free bookings, this is always false
      );
    } catch (emailError) {
      console.error("Error sending tour payment success email:", emailError);
      // Don't fail the whole process if email fails
    }

    // Send in-app notification
    try {
      await notify({
        userId: payment.booking.userId,
        type: "TOUR_PAYMENT_SUCCESS",
        title: payment.amount === 0 ? "Booking Confirmed!" : "Payment Successful",
        message:
          payment.amount === 0
            ? `Your free booking for ${payment.booking.tourName || "tour"} has been confirmed.`
            : `Payment of ₹${payment.amount.toLocaleString()} received for your tour booking. Your booking is now confirmed.`,
        link: `/dashboard/bookings/${bookingId}`,
        data: {
          bookingId,
          amount: payment.amount,
        },
      });
    } catch (notifyError) {
      console.error("Error sending notification:", notifyError);
      // Don't fail the whole process if notification fails
    }

    // Log audit event
    try {
      await logAuditEvent({
        adminId: payment.userId,
        entityType: AuditEntityType.BOOKING,
        entityId: bookingId,
        action: AuditAction.CREATE,
        description: `Booking confirmed${payment.amount === 0 ? " (FREE)" : ""} - ${payment.booking.tourName}`,
        metadata: {
          bookingId,
          amount: payment.amount,
          provider: (payment as any).provider || null,
          method: (payment as any).method || null,
          isFree: payment.amount === 0,
        },
      });
    } catch (auditError) {
      console.error("Error logging audit event:", auditError);
      // Don't fail the whole process if audit logging fails
    }
  }

  // Handle application payment success
  if (applicationId && payment.application) {
    // Update application status to SUBMITTED
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: "SUBMITTED",
      },
    });

    // Send email notification
    try {
      await sendVisaPaymentSuccessEmail(
        payment.application.user.email,
        applicationId,
        payment.application.country || "",
        payment.application.visaType || "",
        payment.amount,
        payment.application.user.role || "CUSTOMER"
      );
    } catch (emailError) {
      console.error("Error sending visa payment success email:", emailError);
      // Don't fail the whole process if email fails
    }

    // Send in-app notification
    try {
      await notify({
        userId: payment.application.userId,
        type: "VISA_PAYMENT_SUCCESS",
        title: payment.amount === 0 ? "Application Submitted!" : "Payment Successful",
        message:
          payment.amount === 0
            ? `Your free visa application for ${payment.application.country} ${payment.application.visaType} has been submitted.`
            : `Payment of ₹${payment.amount.toLocaleString()} received for your visa application. Your application has been submitted.`,
        link: `/dashboard/applications/${applicationId}`,
        data: {
          applicationId,
          amount: payment.amount,
        },
      });
    } catch (notifyError) {
      console.error("Error sending notification:", notifyError);
      // Don't fail the whole process if notification fails
    }

    // Log audit event
    try {
      await logAuditEvent({
        adminId: payment.userId,
        entityType: AuditEntityType.APPLICATION,
        entityId: applicationId,
        action: AuditAction.CREATE,
        description: `Application submitted${payment.amount === 0 ? " (FREE)" : ""} - ${payment.application.country} ${payment.application.visaType}`,
        metadata: {
          applicationId,
          amount: payment.amount,
          provider: (payment as any).provider || null,
          method: (payment as any).method || null,
          isFree: payment.amount === 0,
        },
      });
    } catch (auditError) {
      console.error("Error logging audit event:", auditError);
      // Don't fail the whole process if audit logging fails
    }
  }
}

