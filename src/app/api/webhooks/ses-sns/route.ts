/**
 * API Route: SES SNS Webhook
 * POST /api/webhooks/ses-sns
 * 
 * Handles Amazon SES bounce and complaint notifications via SNS
 * Configure this endpoint in AWS SNS topic subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Types for SNS messages
interface SNSMessage {
  Type: string;
  MessageId: string;
  TopicArn?: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
  SubscribeURL?: string;
  Token?: string;
}

interface SESBounceNotification {
  notificationType: "Bounce";
  bounce: {
    bounceType: "Undetermined" | "Permanent" | "Transient";
    bounceSubType: string;
    bouncedRecipients: Array<{
      emailAddress: string;
      action?: string;
      status?: string;
      diagnosticCode?: string;
    }>;
    timestamp: string;
    feedbackId: string;
  };
  mail: {
    timestamp: string;
    source: string;
    sourceArn: string;
    messageId: string;
    destination: string[];
  };
}

interface SESComplaintNotification {
  notificationType: "Complaint";
  complaint: {
    complainedRecipients: Array<{
      emailAddress: string;
    }>;
    timestamp: string;
    feedbackId: string;
    complaintFeedbackType?: string;
  };
  mail: {
    timestamp: string;
    source: string;
    sourceArn: string;
    messageId: string;
    destination: string[];
  };
}

type SESNotification = SESBounceNotification | SESComplaintNotification;

/**
 * Log email bounce/complaint to database
 */
async function logEmailEvent(
  type: "bounce" | "complaint",
  email: string,
  details: any
): Promise<void> {
  try {
    // Check if event already exists
    const existing = await prisma.email_events.findUnique({
      where: {
        email_type: {
          email: email.toLowerCase(),
          type,
        },
      },
    });

    if (existing) {
      // Update existing event
      await prisma.email_events.update({
        where: {
          id: existing.id,
        },
        data: {
          count: existing.count + 1,
          last_occurred: new Date(),
          details: details as any,
        },
      });
    } else {
      // Create new event
      await prisma.email_events.create({
        data: {
          id: `${email.toLowerCase()}-${type}-${Date.now()}`,
          type,
          email: email.toLowerCase(),
          details: details as any,
          count: 1,
        },
      });
    }

    console.log(`[SES] ${type.toUpperCase()} logged for ${email}`);
  } catch (error) {
    console.error(`[SES] Failed to log ${type} for ${email}:`, error);
    // Log to console as fallback
    console.log(`[SES] ${type.toUpperCase()} for ${email}:`, details);
  }
}

/**
 * Handle bounce notification
 */
async function handleBounce(notification: SESBounceNotification): Promise<void> {
  const { bounce } = notification;

  console.log(`[SES] Bounce notification received:`, {
    type: bounce.bounceType,
    subType: bounce.bounceSubType,
    recipients: bounce.bouncedRecipients.length,
  });

  for (const recipient of bounce.bouncedRecipients) {
    const email = recipient.emailAddress;

    await logEmailEvent("bounce", email, {
      bounceType: bounce.bounceType,
      bounceSubType: bounce.bounceSubType,
      diagnosticCode: recipient.diagnosticCode,
      timestamp: bounce.timestamp,
    });

    // If it's a permanent bounce, mark the email as invalid and prevent future emails
    if (bounce.bounceType === "Permanent") {
      console.log(`[SES] Permanent bounce detected for ${email} - blocking future emails`);

      try {
        // Update user record to prevent future emails
        await prisma.user.updateMany({
          where: { email: email.toLowerCase() },
          data: {
            isActive: false, // Deactivate account to prevent emails
          }
        });

        // Log to audit trail
        console.log(`[SES] User ${email} deactivated due to permanent bounce`);
      } catch (error) {
        console.error(`[SES] Failed to update user for bounce:`, error);
      }
    }
  }
}

/**
 * Handle complaint notification
 */
async function handleComplaint(notification: SESComplaintNotification): Promise<void> {
  const { complaint } = notification;

  console.log(`[SES] Complaint notification received:`, {
    type: complaint.complaintFeedbackType,
    recipients: complaint.complainedRecipients.length,
  });

  for (const recipient of complaint.complainedRecipients) {
    const email = recipient.emailAddress;

    await logEmailEvent("complaint", email, {
      complaintFeedbackType: complaint.complaintFeedbackType,
      timestamp: complaint.timestamp,
    });

    console.log(`[SES] Complaint from ${email} - unsubscribing immediately`);

    try {
      // Immediately deactivate user to stop all future emails
      await prisma.user.updateMany({
        where: { email: email.toLowerCase() },
        data: {
          isActive: false, // Deactivate to prevent all future emails
        }
      });

      // Log to audit trail
      console.log(`[SES] User ${email} deactivated due to spam complaint`);

      // Note: In a production system, you might want to:
      // 1. Create an admin notification
      // 2. Add to suppression list
      // 3. Log to separate complaints table
    } catch (error) {
      console.error(`[SES] Failed to update user for complaint:`, error);
    }
  }
}

/**
 * Main webhook handler
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const snsMessage: SNSMessage = JSON.parse(body);

    console.log(`[SES SNS] Received ${snsMessage.Type} message`);

    // Handle subscription confirmation
    if (snsMessage.Type === "SubscriptionConfirmation") {
      console.log("[SES SNS] Subscription confirmation received");

      if (snsMessage.SubscribeURL) {
        try {
          // Auto-confirm the subscription
          const response = await fetch(snsMessage.SubscribeURL);
          if (response.ok) {
            console.log("[SES SNS] Subscription confirmed successfully");
          } else {
            console.error("[SES SNS] Failed to confirm subscription:", response.status);
          }
        } catch (error) {
          console.error("[SES SNS] Error confirming subscription:", error);
        }
      }

      return NextResponse.json({ message: "Subscription confirmation processed" });
    }

    // Handle notification
    if (snsMessage.Type === "Notification") {
      const notification: SESNotification = JSON.parse(snsMessage.Message);

      if (notification.notificationType === "Bounce") {
        await handleBounce(notification as SESBounceNotification);
      } else if (notification.notificationType === "Complaint") {
        await handleComplaint(notification as SESComplaintNotification);
      } else {
        console.log("[SES SNS] Unknown notification type:", (notification as any).notificationType);
      }

      return NextResponse.json({ message: "Notification processed" });
    }

    // Handle unsubscribe confirmation
    if (snsMessage.Type === "UnsubscribeConfirmation") {
      console.log("[SES SNS] Unsubscribe confirmation received");
      return NextResponse.json({ message: "Unsubscribe confirmation processed" });
    }

    return NextResponse.json({ message: "Unknown message type" });
  } catch (error: any) {
    console.error("[SES SNS] Webhook error:", error);

    // Return 200 anyway to prevent SNS from retrying
    // Log the error for investigation
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        message: error.message
      },
      { status: 200 } // Return 200 to prevent retries
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "SES SNS Webhook endpoint",
    usage: "Configure this URL in AWS SNS topic subscription",
    endpoint: "/api/webhooks/ses-sns",
    method: "POST",
  });
}

