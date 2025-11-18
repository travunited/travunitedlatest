import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { UserRole } from "@prisma/client";

export type NotificationType =
  // Customer - Visa
  | "VISA_APPLICATION_SUBMITTED"
  | "VISA_STATUS_CHANGED"
  | "VISA_DOCUMENT_REJECTED"
  | "VISA_DOCUMENT_REQUIRED"
  | "VISA_PAYMENT_SUCCESS"
  | "VISA_PAYMENT_FAILED"
  | "VISA_READY"
  // Customer - Tours
  | "TOUR_BOOKING_CONFIRMED"
  | "TOUR_BOOKING_CANCELLED"
  | "TOUR_BOOKING_UPDATED"
  | "TOUR_PAYMENT_SUCCESS"
  | "TOUR_PAYMENT_FAILED"
  | "TOUR_VOUCHERS_READY"
  // Customer - Account & Security
  | "ACCOUNT_NEW_DEVICE_LOGIN"
  | "ACCOUNT_PASSWORD_CHANGED"
  | "ACCOUNT_EMAIL_VERIFIED"
  | "ACCOUNT_RESET_PASSWORD_REQUEST"
  // Admin - Workload
  | "ADMIN_APPLICATION_ASSIGNED"
  | "ADMIN_BOOKING_ASSIGNED"
  | "ADMIN_CORPORATE_LEAD_NEW"
  | "ADMIN_UNASSIGNED_APPLICATIONS"
  // Admin - System/Config
  | "ADMIN_VISA_PACKAGE_CHANGED"
  | "ADMIN_VISA_PACKAGE_CREATED"
  | "ADMIN_TOUR_PACKAGE_CHANGED"
  | "ADMIN_TOUR_PACKAGE_CREATED"
  | "ADMIN_BULK_IMPORT_COMPLETED"
  // Admin - Payments & Refunds
  | "ADMIN_REFUND_REQUESTED"
  | "ADMIN_REFUND_PROCESSED"
  | "ADMIN_PAYMENT_WEBHOOK_ERROR"
  // Admin - Account & Security
  | "ADMIN_ACCOUNT_CREATED"
  | "ADMIN_ROLE_CHANGED"
  | "ADMIN_ACCOUNT_LOCKED";

export interface NotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
  sendEmail?: boolean;
  roleScope?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN";
}

/**
 * Central notification service
 * Creates in-app notification and optionally sends email
 */
export async function notify(params: NotificationParams): Promise<void> {
  const {
    userId,
    type,
    title,
    message,
    link,
    data,
    sendEmail: shouldSendEmail = false,
    roleScope,
  } = params;

  try {
    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link: link || null,
        data: data ?? null,
        roleScope: roleScope || null,
        channelInApp: true,
        channelEmail: shouldSendEmail,
      },
    });

    // Send email if requested
    if (shouldSendEmail) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (user?.email) {
          const emailSent = await sendNotificationEmail({
            to: user.email,
            name: user.name || undefined,
            type,
            title,
            message,
            link,
            data,
          });

          // Update notification with email status
          if (emailSent) {
            await prisma.notification.update({
              where: { id: notification.id },
              data: { channelEmail: true },
            });
          }
        }
      } catch (error) {
        console.error(`Failed to send email for notification ${notification.id}:`, error);
        // Don't throw - notification was created successfully
      }
    }
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
}

/**
 * Send notification email via Resend
 */
async function sendNotificationEmail({
  to,
  name,
  type,
  title,
  message,
  link,
  data,
}: {
  to: string;
  name?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
}): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const fullLink = link ? `${baseUrl}${link}` : `${baseUrl}/notifications`;

  // Generate email HTML based on notification type
  const html = generateEmailTemplate({
    name,
    type,
    title,
    message,
    link: fullLink,
    data,
  });

  return sendEmail({
    to,
    subject: title,
    html,
  });
}

/**
 * Generate email HTML template for notifications
 */
function generateEmailTemplate({
  name,
  type,
  title,
  message,
  link,
  data,
}: {
  name?: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  data?: Record<string, any>;
}): string {
  const greeting = name ? `Hi ${name},` : "Hi there,";

  // Add context-specific details based on type
  let additionalInfo = "";
  if (data) {
    if (data.applicationId) {
      additionalInfo += `<p><strong>Application ID:</strong> ${data.applicationId}</p>`;
    }
    if (data.bookingId) {
      additionalInfo += `<p><strong>Booking ID:</strong> ${data.bookingId}</p>`;
    }
    if (data.amount) {
      additionalInfo += `<p><strong>Amount:</strong> ₹${Number(data.amount).toLocaleString()}</p>`;
    }
    if (data.status) {
      additionalInfo += `<p><strong>Status:</strong> ${data.status}</p>`;
    }
    if (data.reason) {
      additionalInfo += `<p><strong>Reason:</strong> ${data.reason}</p>`;
    }
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #0066cc; margin: 0;">${title}</h1>
      </div>
      
      <div style="padding: 20px 0;">
        <p>${greeting}</p>
        <p>${message}</p>
        ${additionalInfo}
      </div>

      ${link ? `
        <div style="margin: 30px 0;">
          <a href="${link}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Details
          </a>
        </div>
      ` : ""}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
        <p>Best regards,<br>The Travunited Team</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/notifications" style="color: #0066cc;">
            Manage notification preferences
          </a>
        </p>
      </div>
    </div>
  `;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    return false;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });

  return true;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Send notification to multiple users
 */
export async function notifyMultiple(
  userIds: string[],
  params: Omit<NotificationParams, "userId">
): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  // Create notifications for all users
  const notifications = await Promise.all(
    userIds.map((userId) =>
      notify({
        ...params,
        userId,
      })
    )
  );
}

/**
 * Get notifications for a user with filters and pagination
 */
export async function getNotifications(
  userId: string,
  options: {
    filter?: "all" | "visa" | "tour" | "payment" | "system";
    unreadOnly?: boolean;
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  notifications: any[];
  total: number;
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const {
    filter = "all",
    unreadOnly = false,
    page = 1,
    limit = 20,
  } = options;

  const skip = (page - 1) * limit;

  const where: any = {
    userId,
  };

  // Filter by read status
  if (unreadOnly) {
    where.readAt = null;
  }

  // Filter by type category
  if (filter && filter !== "all") {
    const typeFilters: Record<string, string[]> = {
      visa: [
        "VISA_APPLICATION_SUBMITTED",
        "VISA_STATUS_CHANGED",
        "VISA_DOCUMENT_REJECTED",
        "VISA_DOCUMENT_REQUIRED",
        "VISA_PAYMENT_SUCCESS",
        "VISA_PAYMENT_FAILED",
        "VISA_READY",
      ],
      tour: [
        "TOUR_BOOKING_CONFIRMED",
        "TOUR_BOOKING_CANCELLED",
        "TOUR_BOOKING_UPDATED",
        "TOUR_PAYMENT_SUCCESS",
        "TOUR_PAYMENT_FAILED",
        "TOUR_VOUCHERS_READY",
      ],
      payment: [
        "VISA_PAYMENT_SUCCESS",
        "VISA_PAYMENT_FAILED",
        "TOUR_PAYMENT_SUCCESS",
        "TOUR_PAYMENT_FAILED",
        "ADMIN_REFUND_REQUESTED",
        "ADMIN_REFUND_PROCESSED",
      ],
      system: [
        "ADMIN_APPLICATION_ASSIGNED",
        "ADMIN_BOOKING_ASSIGNED",
        "ADMIN_CORPORATE_LEAD_NEW",
        "ADMIN_VISA_PACKAGE_CHANGED",
        "ADMIN_VISA_PACKAGE_CREATED",
        "ADMIN_TOUR_PACKAGE_CHANGED",
        "ADMIN_TOUR_PACKAGE_CREATED",
        "ADMIN_BULK_IMPORT_COMPLETED",
        "ADMIN_PAYMENT_WEBHOOK_ERROR",
        "ADMIN_ACCOUNT_CREATED",
        "ADMIN_ROLE_CHANGED",
        "ADMIN_ACCOUNT_LOCKED",
      ],
    };

    if (typeFilters[filter]) {
      where.type = { in: typeFilters[filter] };
    }
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    }),
  ]);

  return {
    notifications,
    total,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

