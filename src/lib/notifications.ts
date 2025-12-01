import { prisma } from "./prisma";
import { sendUserEmail } from "./email";
import { UserRole, Prisma } from "@prisma/client";

export type NotificationType =
  // Customer - Visa
  | "VISA_APPLICATION_SUBMITTED"
  | "VISA_STATUS_CHANGED"
  | "VISA_DOCUMENT_REJECTED"
  | "VISA_DOCUMENT_UPLOADED"
  | "VISA_DOCUMENT_REQUIRED"
  | "VISA_PAYMENT_SUCCESS"
  | "VISA_PAYMENT_FAILED"
  | "VISA_READY"
  // Customer - Tours
  | "TOUR_BOOKING_CREATED"
  | "TOUR_BOOKING_CONFIRMED"
  | "TOUR_BOOKING_CANCELLED"
  | "TOUR_BOOKING_UPDATED"
  | "TOUR_BOOKING_STATUS_UPDATE"
  | "TOUR_BOOKING_DOCUMENT_UPLOADED"
  | "TOUR_BOOKING_DOCUMENT_REJECTED"
  | "TOUR_PAYMENT_SUCCESS"
  | "TOUR_PAYMENT_FAILED"
  | "TOUR_VOUCHERS_READY"
  | "CUSTOM_TOUR_REQUEST"
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
  | "ADMIN_SUPPORT_MESSAGE_NEW"
  // Admin - System/Config
  | "ADMIN_VISA_PACKAGE_CHANGED"
  | "ADMIN_VISA_PACKAGE_CREATED"
  | "ADMIN_VISA_DOCUMENT_UPLOADED"
  | "ADMIN_TOUR_PACKAGE_CHANGED"
  | "ADMIN_TOUR_PACKAGE_CREATED"
  | "ADMIN_TOUR_DOCUMENT_UPLOADED"
  | "ADMIN_BULK_IMPORT_COMPLETED"
  // Admin - Payments & Refunds
  | "ADMIN_REFUND_REQUESTED"
  | "ADMIN_REFUND_PROCESSED"
  | "ADMIN_PAYMENT_RECEIVED"
  | "ADMIN_PAYMENT_FAILED"
  | "ADMIN_PAYMENT_WEBHOOK_ERROR"
  // Admin - Account & Security
  | "ADMIN_ACCOUNT_CREATED"
  | "ADMIN_ROLE_CHANGED"
  | "ADMIN_ACCOUNT_LOCKED";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface NotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
  sendEmail?: boolean;
  roleScope?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN";
  priority?: NotificationPriority;
  actionLabel?: string; // e.g., "View Application", "Download Voucher"
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
        data: data ? (data as Prisma.InputJsonValue) : Prisma.JsonNull,
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
          select: { email: true, name: true, role: true },
        });

        if (user?.email) {
          const emailSent = await sendNotificationEmail({
            to: user.email,
            name: user.name || undefined,
            role: user.role,
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
 * Send notification email via AWS SES with role-based routing
 */
async function sendNotificationEmail({
  to,
  name,
  role,
  type,
  title,
  message,
  link,
  data,
}: {
  to: string;
  name?: string;
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null;
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

  // Determine if this is an admin notification (force admin routing)
  const forceAdmin = type.startsWith("ADMIN_");

  return sendUserEmail({
    to,
    role: forceAdmin ? undefined : role, // For admin notifications, use forceAdmin instead
    subject: title,
    html,
    forceAdmin,
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

  // Determine icon and color based on notification type
  let icon = "🔔";
  let color = "#0066cc";
  if (type.includes("VISA")) {
    icon = "🛂";
    color = "#2563eb";
  } else if (type.includes("TOUR")) {
    icon = "✈️";
    color = "#16a34a";
  } else if (type.includes("PAYMENT")) {
    icon = "💳";
    color = "#9333ea";
  } else if (type.includes("ADMIN")) {
    icon = "⚙️";
    color = "#ea580c";
  } else if (type.includes("ACCOUNT")) {
    icon = "🔒";
    color = "#dc2626";
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); padding: 30px 40px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 10px;">${icon}</div>
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${title}</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">${greeting}</p>
                  <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">${message}</p>
                  ${additionalInfo ? `<div style="background-color: #f9fafb; border-left: 4px solid ${color}; padding: 16px; margin: 20px 0; border-radius: 4px;">${additionalInfo}</div>` : ""}
                  
                  ${link ? `
                    <div style="margin: 30px 0; text-align: center;">
                      <a href="${link}" style="background-color: ${color}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                        View Details
                      </a>
                    </div>
                  ` : ""}
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                    Best regards,<br>
                    <strong style="color: #374151;">The Travunited Team</strong>
                  </p>
                  <p style="margin: 20px 0 0 0;">
                    <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/notifications" style="color: ${color}; text-decoration: none; font-size: 14px;">
                      Manage notification preferences →
                    </a>
                  </p>
                </td>
              </tr>
            </table>
            
            <!-- Footer Text -->
            <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
              <tr>
                <td style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                  <p style="margin: 0;">This is an automated notification from Travunited.</p>
                  <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} Travunited. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
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
    search?: string;
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
    search,
  } = options;

  const skip = (page - 1) * limit;

  const where: any = {
    userId,
  };

  // Filter by read status
  if (unreadOnly) {
    where.readAt = null;
  }

  // Search functionality
  if (search && search.trim()) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { message: { contains: search, mode: "insensitive" } },
    ];
  }

  // Filter by type category
  if (filter && filter !== "all") {
    const typeFilters: Record<string, string[]> = {
      visa: [
        "VISA_APPLICATION_SUBMITTED",
        "VISA_STATUS_CHANGED",
        "VISA_DOCUMENT_REJECTED",
        "VISA_DOCUMENT_UPLOADED",
        "VISA_DOCUMENT_REQUIRED",
        "VISA_PAYMENT_SUCCESS",
        "VISA_PAYMENT_FAILED",
        "VISA_READY",
      ],
      tour: [
        "TOUR_BOOKING_CREATED",
        "TOUR_BOOKING_CONFIRMED",
        "TOUR_BOOKING_CANCELLED",
        "TOUR_BOOKING_UPDATED",
        "TOUR_BOOKING_STATUS_UPDATE",
        "TOUR_BOOKING_DOCUMENT_UPLOADED",
        "TOUR_BOOKING_DOCUMENT_REJECTED",
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
        "ADMIN_PAYMENT_RECEIVED",
        "ADMIN_PAYMENT_FAILED",
      ],
      system: [
        "ADMIN_APPLICATION_ASSIGNED",
        "ADMIN_BOOKING_ASSIGNED",
        "ADMIN_CORPORATE_LEAD_NEW",
        "ADMIN_SUPPORT_MESSAGE_NEW",
        "ADMIN_VISA_PACKAGE_CHANGED",
        "ADMIN_VISA_PACKAGE_CREATED",
        "ADMIN_VISA_DOCUMENT_UPLOADED",
        "ADMIN_TOUR_PACKAGE_CHANGED",
        "ADMIN_TOUR_PACKAGE_CREATED",
        "ADMIN_TOUR_DOCUMENT_UPLOADED",
        "ADMIN_BULK_IMPORT_COMPLETED",
        "ADMIN_PAYMENT_RECEIVED",
        "ADMIN_PAYMENT_FAILED",
        "ADMIN_PAYMENT_WEBHOOK_ERROR",
        "ADMIN_ACCOUNT_CREATED",
        "ADMIN_ROLE_CHANGED",
        "ADMIN_ACCOUNT_LOCKED",
      ],
    };

    if (typeFilters[filter]) {
      if (where.OR) {
        // Combine search with type filter
        where.AND = [
          { OR: where.OR },
          { type: { in: typeFilters[filter] } },
        ];
        delete where.OR;
      } else {
        where.type = { in: typeFilters[filter] };
      }
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

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    return false;
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return true;
}

/**
 * Delete multiple notifications
 */
export async function deleteNotifications(
  notificationIds: string[],
  userId: string
): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: {
      id: { in: notificationIds },
      userId,
    },
  });

  return result.count;
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string): Promise<{
  total: number;
  unread: number;
  byCategory: Record<string, number>;
  recentCount: number; // Last 7 days
}> {
  const [total, unread, recent, allNotifications] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      select: { type: true },
    }),
  ]);

  // Count by category
  const byCategory: Record<string, number> = {};
  allNotifications.forEach((n) => {
    const category = getNotificationCategory(n.type);
    byCategory[category] = (byCategory[category] || 0) + 1;
  });

  return {
    total,
    unread,
    byCategory,
    recentCount: recent,
  };
}

/**
 * Helper to get notification category from type
 */
function getNotificationCategory(type: string): string {
  if (type.includes("VISA")) return "visa";
  if (type.includes("TOUR")) return "tour";
  if (type.includes("PAYMENT")) return "payment";
  if (type.includes("ADMIN")) return "system";
  if (type.includes("ACCOUNT")) return "account";
  return "other";
}

