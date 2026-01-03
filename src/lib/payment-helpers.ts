import { prisma } from "@/lib/prisma";
import {
  sendTourPaymentSuccessEmail,
  sendVisaPaymentSuccessEmail,
  sendEmail,
} from "@/lib/email";
import { notify, notifyMultiple } from "@/lib/notifications";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction, AuditEntityType, Prisma } from "@prisma/client";
import {
  getAdminUserIds,
  getTourAdminEmail,
  getVisaAdminEmail,
} from "@/lib/admin-contacts";

/**
 * Handles post-payment success workflow for both paid and free bookings/applications
 * This includes:
 * - Updating booking/application status
 * - Sending confirmation emails
 * - Sending notifications
 * - Logging audit events
 */
export const paymentInclude = {
  Booking: {
    include: {
      User_Booking_userIdToUser: {
        select: { email: true, name: true, id: true, role: true },
      },
      Tour: {
        select: { name: true },
      },
    },
  },
  Application: {
    include: {
      User_Application_userIdToUser: {
        select: { email: true, name: true, id: true, role: true },
      },
    },
  },
  User: {
    select: { id: true, email: true, name: true, role: true },
  },
} as const;

export type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: typeof paymentInclude;
}>;

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
    include: paymentInclude,
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Handle booking payment success
  if (bookingId && (payment as any).Booking) {
    const booking = (payment as any).Booking;
    const user = booking.User_Booking_userIdToUser;
    const tour = booking.Tour;
    // Update booking status to BOOKED
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "BOOKED",
      },
    });

    // Send email notification
    try {
      if (user.email) {
        await sendTourPaymentSuccessEmail(
          user.email,
          bookingId,
          booking.tourName || tour?.name || "Tour",
          payment.amount,
          false // isAdvance - for free bookings, this is always false
        );
      }
    } catch (emailError) {
      console.error("Error sending tour payment success email:", emailError);
      // Don't fail the whole process if email fails
    }

    // Send in-app notification
    try {
      await notify({
        userId: booking.userId,
        type: "TOUR_PAYMENT_SUCCESS",
        title: payment.amount === 0 ? "Booking Confirmed!" : "Payment Successful",
        message:
          payment.amount === 0
            ? `Your free booking for ${booking.tourName || "tour"} has been confirmed.`
            : `Payment of ₹${payment.amount.toLocaleString()} received for your tour booking. Your booking now confirmed.`,
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
        description: `Booking confirmed${payment.amount === 0 ? " (FREE)" : ""} - ${booking.tourName}`,
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
  if (applicationId && (payment as any).Application) {
    const application = (payment as any).Application;
    const user = application.User_Application_userIdToUser;
    // Update application status to SUBMITTED
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: "SUBMITTED",
      },
    });

    // Send email notification
    try {
      if (user.email) {
        await sendVisaPaymentSuccessEmail(
          user.email,
          applicationId,
          application.country || "",
          application.visaType || "",
          payment.amount,
          user.role || "CUSTOMER"
        );
      }
    } catch (emailError) {
      console.error("Error sending visa payment success email:", emailError);
      // Don't fail the whole process if email fails
    }

    // Send in-app notification
    try {
      await notify({
        userId: application.userId,
        type: "VISA_PAYMENT_SUCCESS",
        title: payment.amount === 0 ? "Application Submitted!" : "Payment Successful",
        message:
          payment.amount === 0
            ? `Your free visa application for ${application.country} ${application.visaType} has been submitted.`
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
        description: `Application submitted${payment.amount === 0 ? " (FREE)" : ""} - ${application.country} ${application.visaType}`,
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

  try {
    await notifyAdminsOfPaymentSuccess(payment);
  } catch (adminNotifyError) {
    console.error("Error notifying admins of payment success:", adminNotifyError);
  }
}

export async function notifyAdminsOfPaymentSuccess(payment: PaymentWithRelations) {
  const context = buildPaymentContext(payment);
  if (!context) {
    return;
  }

  try {
    const adminIds = await getAdminUserIds();
    if (adminIds.length) {
      await notifyMultiple(adminIds, {
        type: "ADMIN_PAYMENT_RECEIVED",
        title: "Payment received",
        message: `₹${payment.amount.toLocaleString()} received for ${context.label} ${context.reference}.`,
        link: context.adminLink,
        data: {
          amount: payment.amount,
          bookingId: payment.bookingId,
          applicationId: payment.applicationId,
        },
      });
    }
  } catch (error) {
    console.error("Failed to notify admins in-app about payment success:", error);
  }

  if (!context.adminEmail) {
    return;
  }

  try {
    await sendEmail({
      to: context.adminEmail,
      subject: `Payment received - ${context.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment received</h2>
          <p><strong>Amount:</strong> ₹${payment.amount.toLocaleString()}</p>
          <p><strong>${context.label}:</strong> ${context.reference}</p>
          <p><strong>Customer:</strong> ${context.customer}</p>
          <p>
            <a href="${process.env.NEXTAUTH_URL || "https://travunited.com"}${context.adminLink}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;">
              View details
            </a>
          </p>
        </div>
      `,
      category: context.category,
    });
  } catch (error) {
    console.error("Failed to send admin payment success email:", error);
  }
}

export async function notifyAdminsOfPaymentFailure(
  payment: PaymentWithRelations,
  reason: string
) {
  const context = buildPaymentContext(payment);
  if (!context) {
    return;
  }

  try {
    const adminIds = await getAdminUserIds();
    if (adminIds.length) {
      await notifyMultiple(adminIds, {
        type: "ADMIN_PAYMENT_FAILED",
        title: "Payment failed",
        message: `Payment of ₹${payment.amount.toLocaleString()} for ${context.label} ${context.reference} failed.`,
        link: context.adminLink,
        data: {
          amount: payment.amount,
          bookingId: payment.bookingId,
          applicationId: payment.applicationId,
          reason,
        },
      });
    }
  } catch (error) {
    console.error("Failed to notify admins in-app about payment failure:", error);
  }

  if (!context.adminEmail) {
    return;
  }

  try {
    await sendEmail({
      to: context.adminEmail,
      subject: `Payment failed - ${context.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment failed</h2>
          <p><strong>Amount:</strong> ₹${payment.amount.toLocaleString()}</p>
          <p><strong>${context.label}:</strong> ${context.reference}</p>
          <p><strong>Customer:</strong> ${context.customer}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>
            <a href="${process.env.NEXTAUTH_URL || "https://travunited.com"}${context.adminLink}" style="display:inline-block;padding:10px 16px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;">
              Review payment
            </a>
          </p>
        </div>
      `,
      category: context.category,
    });
  } catch (error) {
    console.error("Failed to send admin payment failure email:", error);
  }
}

function buildPaymentContext(payment: PaymentWithRelations) {
  const p = payment as any;
  if (p.Application) {
    const application = p.Application;
    const user = application.User_Application_userIdToUser || p.User;
    return {
      label: "Application",
      reference: payment.applicationId,
      customer:
        user?.name ||
        user?.email ||
        "Customer",
      adminLink: `/admin/applications/${payment.applicationId}`,
      adminEmail: getVisaAdminEmail(),
      category: "visa" as const,
      subject: `${application.country || ""} ${application.visaType || ""
        }`.trim() || `Application ${payment.applicationId}`,
    };
  }

  if (p.Booking) {
    const booking = p.Booking;
    const user = booking.User_Booking_userIdToUser || p.User;
    return {
      label: "Booking",
      reference: payment.bookingId,
      customer:
        user?.name ||
        user?.email ||
        "Customer",
      adminLink: `/admin/bookings/${payment.bookingId}`,
      adminEmail: getTourAdminEmail(),
      category: "tours" as const,
      subject: booking.tourName || booking.Tour?.name || `Booking ${payment.bookingId}`,
    };
  }

  return null;
}

