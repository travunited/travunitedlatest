import { Resend } from "resend";
import { formatDate } from "./dateFormat";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getSupportAdminEmail,
  getTourAdminEmail,
} from "./admin-contacts";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[];
  category?: "general" | "visa" | "tours";
}

const EMAIL_CONFIG_KEY = "EMAIL_CONFIG";
type EmailCategory = "general" | "visa" | "tours";

type EmailConfig = {
  resendApiKey?: string;
  emailFromGeneral?: string;
  emailFromVisa?: string;
  emailFromTours?: string;
};

let emailConfigCache: { config: EmailConfig; loadedAt: number } | null = null;
const EMAIL_CONFIG_CACHE_TTL = 1000 * 60 * 5;

let cachedResendClient: Resend | null = null;
let cachedResendKey: string | null = null;
let lastEmailError: string | null = null;

async function loadEmailConfig(forceReload = false): Promise<EmailConfig> {
  if (
    !forceReload &&
    emailConfigCache &&
    Date.now() - emailConfigCache.loadedAt < EMAIL_CONFIG_CACHE_TTL
  ) {
    return emailConfigCache.config;
  }

  const row = await prisma.setting.findUnique({
    where: { key: EMAIL_CONFIG_KEY },
  });

  const value =
    row?.value && typeof row.value === "object" && !Array.isArray(row.value)
      ? (row.value as EmailConfig)
      : {};

  const config: EmailConfig = {
    resendApiKey: value.resendApiKey || process.env.RESEND_API_KEY || undefined,
    emailFromGeneral: value.emailFromGeneral || process.env.EMAIL_FROM || undefined,
    emailFromVisa:
      value.emailFromVisa || value.emailFromGeneral || process.env.EMAIL_FROM || undefined,
    emailFromTours:
      value.emailFromTours || value.emailFromGeneral || process.env.EMAIL_FROM || undefined,
  };

  emailConfigCache = { config, loadedAt: Date.now() };
  return config;
}

async function getResendClient(apiKey?: string | null) {
  if (!apiKey) {
    return null;
  }

  if (!cachedResendClient || cachedResendKey !== apiKey) {
    cachedResendClient = new Resend(apiKey);
    cachedResendKey = apiKey;
  }

  return cachedResendClient;
}

export async function refreshEmailConfigCache() {
  emailConfigCache = null;
  cachedResendClient = null;
  cachedResendKey = null;
  await loadEmailConfig(true);
}

export async function getEmailServiceConfig() {
  const config = await loadEmailConfig();
  return {
    resendApiKey: config.resendApiKey ?? null,
    emailFromGeneral: config.emailFromGeneral ?? null,
    emailFromVisa: config.emailFromVisa ?? null,
    emailFromTours: config.emailFromTours ?? null,
  };
}

// Central admin inbox - all admin-related emails go here
const ADMIN_INBOX = getSupportAdminEmail();

/**
 * Resolve the recipient email based on user role and routing rules
 * - Admin users (STAFF_ADMIN, SUPER_ADMIN) → always route to admin inbox
 * - System/admin alerts (forceAdmin=true) → always route to admin inbox
 * - Normal customers → their own email
 */
export function resolveRecipientEmail(params: {
  userEmail: string;
  userRole?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null;
  forceAdmin?: boolean; // for system/admin-only alerts
}): string {
  // Force admin route (system alerts, contact forms to admin etc.)
  if (params.forceAdmin) {
    return ADMIN_INBOX;
  }

  // If role is an admin, route to central inbox
  if (
    params.userRole === "STAFF_ADMIN" ||
    params.userRole === "SUPER_ADMIN"
  ) {
    return ADMIN_INBOX;
  }

  // Normal customer/user → their own email
  return params.userEmail;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  lastEmailError = null;
  const config = await loadEmailConfig();
  const resendClient = await getResendClient(config.resendApiKey);

  if (!resendClient) {
    const message =
      "Resend client not initialized. Configure RESEND_API_KEY in admin email settings.";
    lastEmailError = message;
    console.warn("[Email]", message);
    return false;
  }

  const determineFromAddress = (category?: EmailCategory) => {
    if (category === "visa") {
      return config.emailFromVisa || config.emailFromGeneral;
    }
    if (category === "tours") {
      return config.emailFromTours || config.emailFromGeneral;
    }
    return config.emailFromGeneral;
  };

  const from =
    (determineFromAddress(options.category) || process.env.EMAIL_FROM || config.emailFromGeneral) ??
    "";

  if (!from) {
    const message =
      "Sender email not configured. Set EMAIL_FROM or configure sender addresses in admin settings.";
    console.error("[Email]", message);
    lastEmailError = message;
    return false;
  }

  try {
    const result = await resendClient.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      reply_to: options.replyTo,
    });

    if (result.error) {
      const message = `[Email] Resend API returned an error: ${JSON.stringify(result.error)}`;
      console.error(message, {
        to: options.to,
        subject: options.subject,
      });
      lastEmailError = result.error?.message || message;
      return false;
    }

    console.log("[Email] Sent successfully", {
      to: options.to,
      subject: options.subject,
      id: result.data?.id,
    });
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error sending email via Resend";
    console.error("[Email] Exception sending email via Resend:", {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      to: options.to,
      subject: options.subject,
      resendError: error,
    });
    lastEmailError = message;
    return false;
  }
}

export function getLastEmailError() {
  return lastEmailError;
}

/**
 * Send email with automatic routing based on user role
 * Use this instead of sendEmail() for all user-facing emails
 */
export async function sendUserEmail(options: {
  to: string;
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null;
  subject: string;
  html: string;
  forceAdmin?: boolean;
  category?: EmailCategory;
}): Promise<boolean> {
  const finalTo = resolveRecipientEmail({
    userEmail: options.to,
    userRole: options.role,
    forceAdmin: options.forceAdmin,
  });

  return sendEmail({
    to: finalTo,
    subject: options.subject,
    html: options.html,
    category: options.category,
  });
}

// Email templates
export async function sendWelcomeEmail(
  email: string,
  name?: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = "Welcome to Travunited!";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Welcome to Travunited${name ? `, ${name}` : ""}!</h1>
      <p>Thank you for joining Travunited. We're here to make your travel dreams come true.</p>
      <p>You can now:</p>
      <ul>
        <li>Apply for visas to multiple countries</li>
        <li>Book amazing tour packages</li>
        <li>Track your applications and bookings</li>
      </ul>
      <p>Get started by browsing our <a href="${process.env.NEXTAUTH_URL}/visas">visa services</a> or <a href="${process.env.NEXTAUTH_URL}/tours">tour packages</a>.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  return sendUserEmail({ to: email, role, subject, html, category: "general" });
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = "Reset Your Travunited Password";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <p><a href="${resetLink}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  // Password reset emails should ALWAYS go to the user's actual email address
  // Never route to admin inbox, even for admin users
  return sendEmail({
    to: email,
    subject,
    html,
    category: "general",
  });
}

export async function sendVisaPaymentSuccessEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  amount: number,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Payment Successful - ${country} ${visaType}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Payment Successful!</h1>
      <p>Your payment for ${country} ${visaType} has been received successfully.</p>
      <p><strong>Amount Paid:</strong> ₹${amount.toLocaleString()}</p>
      <p><strong>Application ID:</strong> ${applicationId.slice(0, 8)}...</p>
      <p>Your application is now submitted and will be processed shortly. You can track the status in your <a href="${process.env.NEXTAUTH_URL}/dashboard/applications/${applicationId}">dashboard</a>.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  return sendUserEmail({ to: email, role, subject, html, category: "visa" });
}

export async function sendVisaPaymentFailedEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  amount: number,
  reason?: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Payment Failed - ${country} ${visaType}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Payment Failed</h1>
      <p>Your payment attempt for ${country} ${visaType} could not be completed.</p>
      <p><strong>Amount:</strong> ₹${amount.toLocaleString()}</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>Please try again from your <a href="${process.env.NEXTAUTH_URL}/dashboard/applications/${applicationId}">application dashboard</a>. If the issue persists, contact support.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;

  return sendUserEmail({ to: email, role, subject, html, category: "visa" });
}

export async function sendVisaStatusUpdateEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  status: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Status Update - ${country} ${visaType}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Application Status Updated</h1>
      <p>Your ${country} ${visaType} application status has been updated to: <strong>${status}</strong></p>
      <p>View details in your <a href="${process.env.NEXTAUTH_URL}/dashboard/applications/${applicationId}">dashboard</a>.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  return sendUserEmail({ to: email, role, subject, html, category: "visa" });
}

export async function sendVisaDocumentRejectedEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  rejectedDocs: Array<{ type: string; reason: string; documentId?: string }>,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Documents Need Re-upload - ${country} ${visaType}`;
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.com";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Documents Rejected</h1>
      <p>Some documents for your ${country} ${visaType} application need to be re-uploaded:</p>
      <ul>
        ${rejectedDocs
          .map(
            (doc) =>
              `<li><strong>${doc.type}:</strong> ${doc.reason}${
                doc.documentId
                  ? `<br/><a href="${baseUrl}/dashboard/applications/${applicationId}?requiredDoc=${doc.documentId}">Re-upload this document</a>`
                  : ""
              }</li>`
          )
          .join("")}
      </ul>
      <p><a href="${baseUrl}/dashboard/applications/${applicationId}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Open Application</a></p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  return sendUserEmail({ to: email, role, subject, html, category: "visa" });
}

export async function sendVisaApprovedEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Visa Approved! - ${country} ${visaType}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>🎉 Your Visa is Approved!</h1>
      <p>Great news! Your ${country} ${visaType} has been approved.</p>
      <p>You can now download your visa from your <a href="${process.env.NEXTAUTH_URL}/dashboard/applications/${applicationId}">dashboard</a>.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  return sendUserEmail({ to: email, role, subject, html, category: "visa" });
}

export async function sendVisaRejectedEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  reason: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Visa Application Update - ${country} ${visaType}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Application Status Update</h1>
      <p>Your ${country} ${visaType} application has been ${reason ? "rejected" : "updated"}.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>View details in your <a href="${process.env.NEXTAUTH_URL}/dashboard/applications/${applicationId}">dashboard</a>.</p>
      <p>If you have questions, please contact our support team.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  return sendUserEmail({ to: email, role, subject, html, category: "visa" });
}

export async function sendTourPaymentSuccessEmail(
  email: string,
  bookingId: string,
  tourName: string,
  amount: number,
  isAdvance: boolean,
  pendingBalance?: number,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Payment Successful - ${tourName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Payment Successful!</h1>
      <p>Your payment for ${tourName} has been received successfully.</p>
      <p><strong>Amount Paid:</strong> ₹${amount.toLocaleString()}</p>
      ${isAdvance && pendingBalance ? `<p><strong>Pending Balance:</strong> ₹${pendingBalance.toLocaleString()}</p>` : ""}
      <p><strong>Booking ID:</strong> ${bookingId.slice(0, 8)}...</p>
      <p>View your booking in your <a href="${process.env.NEXTAUTH_URL}/dashboard/bookings/${bookingId}">dashboard</a>.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  return sendUserEmail({ to: email, role, subject, html, category: "tours" });
}

export async function sendTourPaymentFailedEmail(
  email: string,
  bookingId: string,
  tourName: string,
  amount: number,
  reason?: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Payment Failed - ${tourName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Payment Failed</h1>
      <p>Your payment attempt for ${tourName} could not be completed.</p>
      <p><strong>Amount:</strong> ₹${amount.toLocaleString()}</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>Please try again from your <a href="${process.env.NEXTAUTH_URL}/dashboard/bookings/${bookingId}">booking dashboard</a>. If the issue persists, contact support.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;

  return sendUserEmail({ to: email, role, subject, html, category: "tours" });
}

export async function sendTourConfirmedEmail(
  email: string,
  bookingId: string,
  tourName: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Tour Confirmed! - ${tourName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>🎉 Your Tour is Confirmed!</h1>
      <p>Great news! Your ${tourName} booking has been confirmed.</p>
      <p>You can now download your vouchers and itinerary from your <a href="${process.env.NEXTAUTH_URL}/dashboard/bookings/${bookingId}">dashboard</a>.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  return sendUserEmail({ to: email, role, subject, html, category: "tours" });
}

export async function sendTourPaymentReminderEmail(
  email: string,
  bookingId: string,
  tourName: string,
  pendingBalance: number,
  dueDate?: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Payment Reminder - ${tourName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Payment Reminder</h1>
      <p>This is a reminder that you have a pending balance for ${tourName}.</p>
      <p><strong>Pending Balance:</strong> ₹${pendingBalance.toLocaleString()}</p>
      ${dueDate ? `<p><strong>Due Date:</strong> ${formatDate(dueDate)}</p>` : ""}
      <p><a href="${process.env.NEXTAUTH_URL}/dashboard/bookings/${bookingId}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Pay Now</a></p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  return sendUserEmail({ to: email, role, subject, html, category: "tours" });
}

export async function sendTourStatusUpdateEmail(
  email: string,
  bookingId: string,
  tourName: string,
  status: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Tour Status Update - ${tourName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Status Update</h1>
      <p>Your booking for ${tourName} is now <strong>${status}</strong>.</p>
      <p>You can view full details in your <a href="${process.env.NEXTAUTH_URL}/dashboard/bookings/${bookingId}">dashboard</a>.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;

  return sendUserEmail({ to: email, role, subject, html, category: "tours" });
}

export async function sendTourVouchersReadyEmail(
  email: string,
  bookingId: string,
  tourName: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = `Your Vouchers Are Ready - ${tourName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Vouchers Ready</h1>
      <p>Your vouchers and itinerary for ${tourName} are ready for download.</p>
      <p>Access them from your <a href="${process.env.NEXTAUTH_URL}/dashboard/bookings/${bookingId}">dashboard</a>.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;

  return sendUserEmail({ to: email, role, subject, html, category: "tours" });
}

export async function sendEmailVerificationEmail(
  email: string,
  verificationLink: string,
  name?: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = "Verify Your Travunited Email";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Verify Your Email Address</h1>
      <p>Hi${name ? ` ${name}` : ""},</p>
      <p>Thank you for signing up with Travunited! Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationLink}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a></p>
      <p>This link will expire in 7 days.</p>
      <p>If you didn't create an account, please ignore this email.</p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  return sendUserEmail({ to: email, role, subject, html, category: "general" });
}

/**
 * Send admin notification email for new corporate lead
 */
export async function sendCorporateLeadAdminEmail(
  leadData: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string | null;
    message: string | null;
    createdAt: Date;
  }
) {
  const adminRecipient =
    getTourAdminEmail() || getSupportAdminEmail() || ADMIN_INBOX;

  const subject = `New Corporate Lead - ${leadData.companyName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #0066cc;">New Corporate Lead</h1>
      <p>A new corporate lead has been submitted through the corporate page.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #333;">Lead Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Company Name:</td>
            <td style="padding: 8px 0;">${leadData.companyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Contact Person:</td>
            <td style="padding: 8px 0;">${leadData.contactName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Email:</td>
            <td style="padding: 8px 0;"><a href="mailto:${leadData.email}">${leadData.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
            <td style="padding: 8px 0;">${leadData.phone || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Submitted:</td>
            <td style="padding: 8px 0;">${formatDate(leadData.createdAt.toString())}</td>
          </tr>
        </table>
        
        ${leadData.message ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
            <strong>Requirement/Message:</strong>
            <div style="background-color: white; padding: 10px; border-radius: 3px; margin-top: 8px; white-space: pre-wrap;">${leadData.message.replace(/\n/g, "<br>")}</div>
          </div>
        ` : ""}
      </div>
      
      <p style="margin-top: 20px;">
        <a href="${process.env.NEXTAUTH_URL}/admin/corporate-leads" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View in Admin Panel</a>
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This is an automated notification from Travunited.
      </p>
    </div>
  `;

  // Send directly to admin inbox, not routed through sendUserEmail
  return sendEmail({
    to: adminRecipient,
    subject,
    html,
    category: "general",
  });
}

/**
 * Send confirmation email to user after corporate lead submission
 */
export async function sendCorporateLeadConfirmationEmail(
  userEmail: string,
  companyName: string,
  contactName: string
) {
  const subject = "We received your corporate request";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #0066cc;">Thank You for Your Interest!</h1>
      
      <p>Dear ${contactName},</p>
      
      <p>We have received your corporate travel inquiry for <strong>${companyName}</strong>. Our corporate travel team is reviewing your requirements and will get back to you within 24 hours.</p>
      
      <p>In the meantime, if you have any urgent questions, feel free to contact us directly:</p>
      <ul>
        <li><strong>Email:</strong> <a href="mailto:corporate@travunited.com">corporate@travunited.com</a></li>
        <li><strong>Phone:</strong> <a href="tel:+916360392398">+91 63603 92398</a></li>
      </ul>
      
      <p>We look forward to helping your organization with its travel needs!</p>
      
      <p>Best regards,<br>The Travunited Corporate Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
        <p>This is an automated confirmation email. Please do not reply to this message.</p>
      </div>
    </div>
  `;

  // Send directly to user's email
  return sendEmail({
    to: userEmail,
    subject,
    html,
    category: "general",
  });
}

/**
 * Send welcome email to newly created admin user
 * Includes temporary password or password reset link
 */
export async function sendAdminWelcomeEmail(
  email: string,
  name: string,
  role: string,
  tempPassword: string | null,
  loginUrl: string
) {
  const subject = "Welcome to Travunited Admin Panel";
  const resetPasswordUrl = `${loginUrl}?reset=true`;
  
  const passwordSection = tempPassword
    ? `
      <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #856404;">Your Temporary Password</h3>
        <p style="font-size: 18px; font-weight: bold; color: #856404; font-family: monospace; letter-spacing: 2px; margin: 10px 0;">
          ${tempPassword}
        </p>
        <p style="margin-bottom: 0; color: #856404;">
          <strong>Please change this password immediately after your first login.</strong>
        </p>
      </div>
    `
    : `
      <div style="background-color: #d1ecf1; border: 1px solid #0c5460; border-radius: 5px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #0c5460;">
          Please use the password provided by your administrator or request a password reset.
        </p>
      </div>
    `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #0066cc;">Welcome to Travunited Admin Panel!</h1>
      
      <p>Dear ${name},</p>
      
      <p>Your admin account has been successfully created for the Travunited platform.</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Account Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 120px;">Email:</td>
            <td style="padding: 8px 0;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Role:</td>
            <td style="padding: 8px 0;">${role === "SUPER_ADMIN" ? "Super Admin" : "Staff Admin"}</td>
          </tr>
        </table>
      </div>
      
      ${passwordSection}
      
      <div style="margin: 30px 0;">
        <p><strong>Getting Started:</strong></p>
        <ol style="line-height: 1.8;">
          <li>Log in to the admin panel using your email and ${tempPassword ? "the temporary password above" : "your password"}</li>
          <li>Once logged in, navigate to your account settings</li>
          <li>Change your password to something secure and memorable</li>
        </ol>
      </div>
      
      <p style="margin-top: 30px; text-align: center;">
        <a href="${loginUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Log In to Admin Panel
        </a>
      </p>
      
      <p style="margin-top: 20px;">
        <a href="${resetPasswordUrl}" style="color: #0066cc; text-decoration: underline;">
          Or reset your password here
        </a>
      </p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
        <p><strong>Security Reminder:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Never share your login credentials with anyone</li>
          <li>Use a strong, unique password</li>
          <li>Log out when finished, especially on shared devices</li>
          <li>Contact support immediately if you notice any suspicious activity</li>
        </ul>
        <p style="margin-top: 15px;">
          If you did not expect this email, please contact <a href="mailto:${ADMIN_INBOX}">${ADMIN_INBOX}</a> immediately.
        </p>
      </div>
    </div>
  `;

  // Send directly to admin's email (not routed through admin inbox)
  return sendEmail({
    to: email,
    subject,
    html,
    category: "general",
  });
}

