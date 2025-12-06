import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { formatDate } from "./dateFormat";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getSupportAdminEmail,
  getTourAdminEmail,
} from "./admin-contacts";
import { replaceTemplateVariables, getDefaultEmailTemplate, EmailTemplateVariables } from "./email-templates";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[];
  category?: "general" | "visa" | "tours";
}

const EMAIL_CONFIG_KEY = "EMAIL_CONFIG";
const EMAIL_SNIPPETS_KEY = "EMAIL_SNIPPETS";
type EmailCategory = "general" | "visa" | "tours";

type EmailConfig = {
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  emailFromGeneral?: string;
  emailFromVisa?: string;
  emailFromTours?: string;
};

let emailConfigCache: { config: EmailConfig; loadedAt: number } | null = null;
let emailTemplatesCache: { templates: Record<string, string>; loadedAt: number } | null = null;
const EMAIL_CONFIG_CACHE_TTL = 1000 * 60 * 5;

let cachedSESClient: SESClient | null = null;
let cachedSESConfig: { accessKeyId: string; secretAccessKey: string; region: string } | null = null;
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

  // Helper to fix .com domain to .in
  const fixDomain = (email: string | undefined | null): string | undefined => {
    if (!email) return undefined;
    // Replace .com with .in if present
    const fixed = email.replace(/@travunited\.com/g, "@travunited.in").replace(/travunited\.com/g, "travunited.in");
    return fixed || undefined;
  };

  const config: EmailConfig = {
    awsAccessKeyId: value.awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID || undefined,
    awsSecretAccessKey: value.awsSecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || undefined,
    awsRegion: value.awsRegion || process.env.AWS_REGION || process.env.AWS_SES_REGION || "us-east-1",
    emailFromGeneral: fixDomain(value.emailFromGeneral) || fixDomain(process.env.EMAIL_FROM) || "no-reply@travunited.in",
    emailFromVisa:
      fixDomain(value.emailFromVisa) || fixDomain(value.emailFromGeneral) || fixDomain(process.env.EMAIL_FROM) || fixDomain(process.env.EMAIL_FROM_VISA) || "visa@travunited.in",
    emailFromTours:
      fixDomain(value.emailFromTours) || fixDomain(value.emailFromGeneral) || fixDomain(process.env.EMAIL_FROM) || fixDomain(process.env.EMAIL_FROM_TOURS) || "tours@travunited.in",
  };

  emailConfigCache = { config, loadedAt: Date.now() };
  return config;
}

async function getSESClient(
  accessKeyId?: string | null,
  secretAccessKey?: string | null,
  region?: string | null
): Promise<SESClient | null> {
  if (!accessKeyId || !secretAccessKey || !region) {
    return null;
  }

  const configKey = `${accessKeyId}:${secretAccessKey}:${region}`;
  if (
    !cachedSESClient ||
    !cachedSESConfig ||
    cachedSESConfig.accessKeyId !== accessKeyId ||
    cachedSESConfig.secretAccessKey !== secretAccessKey ||
    cachedSESConfig.region !== region
  ) {
    cachedSESClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    cachedSESConfig = { accessKeyId, secretAccessKey, region };
  }

  return cachedSESClient;
}

// Helper function to determine sender email
function determineSenderEmail(config: EmailConfig, category?: EmailCategory): string {
  // Helper to ensure .in domain and fix .com to .in
  const fixDomain = (email: string | undefined | null): string => {
    if (!email) return "";
    // Replace .com with .in if present
    return email.replace(/@travunited\.com/g, "@travunited.in").replace(/travunited\.com/g, "travunited.in");
  };

  if (category === "visa") {
    const email = config.emailFromVisa || config.emailFromGeneral || process.env.EMAIL_FROM || process.env.EMAIL_FROM_VISA || "";
    return fixDomain(email) || "visa@travunited.in";
  }
  if (category === "tours") {
    const email = config.emailFromTours || config.emailFromGeneral || process.env.EMAIL_FROM || process.env.EMAIL_FROM_TOURS || "";
    return fixDomain(email) || "tours@travunited.in";
  }
  const email = config.emailFromGeneral || process.env.EMAIL_FROM || process.env.EMAIL_FROM_GENERAL || "";
  return fixDomain(email) || "no-reply@travunited.in";
}

export async function refreshEmailConfigCache() {
  emailConfigCache = null;
  emailTemplatesCache = null;
  cachedSESClient = null;
  cachedSESConfig = null;
  await loadEmailConfig(true);
}

async function loadEmailTemplates(forceReload = false): Promise<Record<string, string>> {
  if (
    !forceReload &&
    emailTemplatesCache &&
    Date.now() - emailTemplatesCache.loadedAt < EMAIL_CONFIG_CACHE_TTL
  ) {
    return emailTemplatesCache.templates;
  }

  const row = await prisma.setting.findUnique({
    where: { key: EMAIL_SNIPPETS_KEY },
  });

  const templates =
    row?.value && typeof row.value === "object" && !Array.isArray(row.value)
      ? (row.value as Record<string, string>)
      : {};

  emailTemplatesCache = { templates, loadedAt: Date.now() };
  return templates;
}

function getEmailTemplate(templateKey: string, customTemplate?: string): string {
  // Use custom template if provided, otherwise use default
  return customTemplate && customTemplate.trim() 
    ? customTemplate 
    : getDefaultEmailTemplate(templateKey);
}

export async function getEmailServiceConfig() {
  const config = await loadEmailConfig();
  return {
    awsAccessKeyId: config.awsAccessKeyId ?? null,
    awsSecretAccessKey: config.awsSecretAccessKey ? "***configured***" : null,
    awsRegion: config.awsRegion ?? null,
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
  const startTime = Date.now();
  lastEmailError = null;
  
  // Convert recipients to array for processing
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  
  // Check if any recipients are inactive (bounced/complained emails)
  // Skip sending to inactive users to prevent bounces
  const activeRecipients: string[] = [];
  for (const recipient of recipients) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: recipient.toLowerCase() },
        select: { isActive: true },
      });
      
      // Only send to active users (inactive users may have bounced/complained)
      if (!user || user.isActive) {
        activeRecipients.push(recipient);
      } else {
        console.log(`[Email] Skipping inactive user: ${recipient}`);
      }
    } catch (error) {
      // If user lookup fails, still try to send (might be external email)
      activeRecipients.push(recipient);
    }
  }
  
  // If no active recipients, skip sending
  if (activeRecipients.length === 0) {
    console.log(`[Email] No active recipients, skipping email send`);
    return false;
  }
  
  // Update options with active recipients only
  const finalOptions = {
    ...options,
    to: activeRecipients.length === 1 ? activeRecipients[0] : activeRecipients,
  };
  
  // Use AWS SDK for email sending
  console.log("[Email] Using AWS SDK provider for email sending");
  
  // Load config with timeout to prevent delays
  let config: EmailConfig;
  try {
    const configPromise = loadEmailConfig();
    const configTimeout = new Promise<EmailConfig>((_, reject) => {
      setTimeout(() => reject(new Error("Email config load timeout after 5 seconds")), 5000);
    });
    config = await Promise.race([configPromise, configTimeout]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Email] Failed to load email config:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    lastEmailError = `Failed to load email configuration: ${errorMessage}`;
    return false;
  }
  
  // Check if AWS credentials are configured
  if (!config.awsAccessKeyId || !config.awsSecretAccessKey || !config.awsRegion) {
    const message = "Email credentials not configured. Set AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION) in environment variables.";
    lastEmailError = message;
    console.error("[Email]", message, {
      hasAccessKeyId: !!config.awsAccessKeyId,
      hasSecretAccessKey: !!config.awsSecretAccessKey,
      hasRegion: !!config.awsRegion,
    });
    return false;
  }
  
  const sesClient = await getSESClient(
    config.awsAccessKeyId,
    config.awsSecretAccessKey,
    config.awsRegion
  );

  if (!sesClient) {
    const message = "AWS SES client not initialized. Check AWS credentials configuration.";
    lastEmailError = message;
    console.error("[Email]", message, {
      hasAccessKeyId: !!config.awsAccessKeyId,
      hasSecretAccessKey: !!config.awsSecretAccessKey,
      hasRegion: !!config.awsRegion,
    });
    return false;
  }

  const from = determineSenderEmail(config, finalOptions.category);

  if (!from) {
    const message = "Sender email not configured. Set EMAIL_FROM in environment variables or configure sender addresses in admin settings.";
    console.error("[Email]", message, {
      category: options.category,
      emailFromGeneral: config.emailFromGeneral,
      emailFromVisa: config.emailFromVisa,
      emailFromTours: config.emailFromTours,
      envEmailFrom: process.env.EMAIL_FROM,
    });
    lastEmailError = message;
    return false;
  }
  
  console.log("[Email] Sending email", {
    to: activeRecipients.join(", "),
    from,
    subject: finalOptions.subject,
    category: finalOptions.category || "general",
    hasCredentials: !!(config.awsAccessKeyId && config.awsSecretAccessKey),
    region: config.awsRegion,
  });

  try {
    // Prepare email parameters for AWS SES
    const emailParams = {
      Source: from,
      Destination: {
        ToAddresses: activeRecipients,
      },
      Message: {
        Subject: {
          Data: finalOptions.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: finalOptions.html,
            Charset: "UTF-8",
          },
          Text: {
            Data: finalOptions.text || stripHtml(finalOptions.html),
            Charset: "UTF-8",
          },
        },
      },
      ...(finalOptions.replyTo && {
        ReplyToAddresses: Array.isArray(finalOptions.replyTo) ? finalOptions.replyTo : [finalOptions.replyTo],
      }),
    };

    // Add timeout to AWS SES API call to prevent long delays
    const sendCommand = new SendEmailCommand(emailParams);
    const sendPromise = sesClient.send(sendCommand);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("AWS SES API timeout after 10 seconds")), 10000);
    });
    
    const result = await Promise.race([sendPromise, timeoutPromise]);
    const duration = Date.now() - startTime;

    console.log("[Email] Sent successfully", {
      to: activeRecipients.join(", "),
      subject: finalOptions.subject,
      messageId: result.MessageId,
      duration: `${duration}ms`,
    });
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : "Unknown error sending email via AWS SES";
    console.error("[Email] Exception sending email via AWS SES:", {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      to: activeRecipients.join(", "),
      subject: finalOptions.subject,
      duration: `${duration}ms`,
      sesError: error,
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
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("welcomeEmail", templates.emailWelcome);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    name: name || "",
    email,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
    dashboardUrl: `${baseUrl}/dashboard`,
  };
  
  let html = replaceTemplateVariables(template, variables);
  
  // Fix name formatting - replaceTemplateVariables adds ", Name" if name exists
  if (name) {
    html = html.replace(/{companyName}, {name}!/g, `${variables.companyName}, ${name}!`);
  } else {
    html = html.replace(/{companyName}{name}!/g, `${variables.companyName}!`);
  }
  
  const subject = "Welcome to Travunited!";
  
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
      <p style="margin-top: 20px; font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size: 11px; color: #999; word-break: break-all;">${resetLink}</p>
      <p>This link will expire in 24 hours.</p>
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

export async function sendPasswordResetOTPEmail(
  email: string,
  otp: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const subject = "Your Password Reset OTP";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Password Reset OTP</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">You requested to reset your password. Use the OTP below to verify your identity:</p>
        
        <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
          <p style="font-size: 36px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin: 20px 0;">
          <strong>Important:</strong>
        </p>
        <ul style="font-size: 14px; color: #666; margin: 10px 0; padding-left: 20px;">
          <li>This OTP is valid for <strong>10 minutes</strong> only</li>
          <li>Do not share this OTP with anyone</li>
          <li>If you didn't request this, please ignore this email</li>
        </ul>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="font-size: 13px; color: #856404; margin: 0;">
            <strong>Security Tip:</strong> Travunited will never ask for your OTP via phone or email. Only enter it on our official website.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Best regards,<br>
          <strong>The Travunited Team</strong>
        </p>
      </div>
    </div>
  `;
  
  // Password reset OTP emails should ALWAYS go to the user's actual email address
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
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("visaPaymentSuccessEmail", templates.emailVisaPaymentSuccess);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    applicationId,
    country,
    visaType,
    amount,
    applicationUrl: `${baseUrl}/dashboard/applications/${applicationId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Payment Successful - ${country} ${visaType}`;
  
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
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("visaPaymentFailedEmail", templates.emailVisaPaymentFailed);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    applicationId,
    country,
    visaType,
    amount,
    reason,
    applicationUrl: `${baseUrl}/dashboard/applications/${applicationId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Payment Failed - ${country} ${visaType}`;

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
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("visaStatusUpdateEmail", templates.emailVisaStatusUpdate);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    applicationId,
    country,
    visaType,
    status,
    applicationUrl: `${baseUrl}/dashboard/applications/${applicationId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Status Update - ${country} ${visaType}`;
  
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
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("visaDocumentRejectedEmail", templates.emailVisaDocumentRejected);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    applicationId,
    country,
    visaType,
    rejectedDocs: rejectedDocs.map(doc => ({
      ...doc,
      documentId: doc.documentId,
    })),
    applicationUrl: `${baseUrl}/dashboard/applications/${applicationId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Documents Need Re-upload - ${country} ${visaType}`;
  
  return sendUserEmail({ to: email, role, subject, html, category: "visa" });
}

export async function sendVisaApprovedEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("visaApprovedEmail", templates.emailVisaApproved);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    applicationId,
    country,
    visaType,
    applicationUrl: `${baseUrl}/dashboard/applications/${applicationId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Visa Approved! - ${country} ${visaType}`;
  
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
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("visaRejectedEmail", templates.emailVisaRejected);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    applicationId,
    country,
    visaType,
    reason,
    applicationUrl: `${baseUrl}/dashboard/applications/${applicationId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Visa Application Update - ${country} ${visaType}`;
  
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
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("tourPaymentSuccessEmail", templates.emailTourPaymentSuccess);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    bookingId,
    tourName,
    amount,
    isAdvance,
    pendingBalance,
    bookingUrl: `${baseUrl}/dashboard/bookings/${bookingId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Payment Successful - ${tourName}`;
  
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
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("tourPaymentFailedEmail", templates.emailTourPaymentFailed);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    bookingId,
    tourName,
    amount,
    reason,
    bookingUrl: `${baseUrl}/dashboard/bookings/${bookingId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Payment Failed - ${tourName}`;

  return sendUserEmail({ to: email, role, subject, html, category: "tours" });
}

export async function sendTourConfirmedEmail(
  email: string,
  bookingId: string,
  tourName: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("tourConfirmedEmail", templates.emailTourConfirmed);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    bookingId,
    tourName,
    bookingUrl: `${baseUrl}/dashboard/bookings/${bookingId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Tour Confirmed! - ${tourName}`;
  
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
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("tourPaymentReminderEmail", templates.emailTourPaymentReminder);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    bookingId,
    tourName,
    pendingBalance,
    dueDate: dueDate ? formatDate(dueDate) : undefined,
    bookingUrl: `${baseUrl}/dashboard/bookings/${bookingId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Payment Reminder - ${tourName}`;
  
  return sendUserEmail({ to: email, role, subject, html, category: "tours" });
}

export async function sendTourStatusUpdateEmail(
  email: string,
  bookingId: string,
  tourName: string,
  status: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("tourStatusUpdateEmail", templates.emailTourStatusUpdate);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    bookingId,
    tourName,
    status,
    bookingUrl: `${baseUrl}/dashboard/bookings/${bookingId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Tour Status Update - ${tourName}`;

  return sendUserEmail({ to: email, role, subject, html, category: "tours" });
}

export async function sendTourVouchersReadyEmail(
  email: string,
  bookingId: string,
  tourName: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("tourVouchersReadyEmail", templates.emailTourVouchersReady);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    bookingId,
    tourName,
    bookingUrl: `${baseUrl}/dashboard/bookings/${bookingId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Your Vouchers Are Ready - ${tourName}`;

  return sendUserEmail({ to: email, role, subject, html, category: "tours" });
}

export async function sendEmailVerificationEmail(
  email: string,
  verificationLink: string,
  name?: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("emailVerificationEmail", templates.emailVerification);
  const config = await loadEmailConfig();
  
  const variables: EmailTemplateVariables = {
    email,
    name: name || "",
    verificationLink,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  let html = replaceTemplateVariables(template, variables);
  
  // Fix name formatting - if name exists, it will be ", Name", otherwise empty
  if (name) {
    // Name is already formatted with comma in replaceTemplateVariables
    html = html.replace(/Hi, {name}/g, `Hi ${name}`);
  } else {
    html = html.replace(/Hi{name}/g, "Hi");
  }
  
  // Replace companyName placeholder again after name processing
  html = html.replace(/{companyName}/g, variables.companyName || "Travunited");
  const subject = "Verify Your Travunited Email";
  
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

  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("corporateLeadAdminEmail", templates.emailCorporateLeadAdmin);
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email: leadData.email,
    companyNameLead: leadData.companyName,
    contactName: leadData.contactName,
    message: leadData.message || "",
    createdAt: leadData.createdAt,
    dashboardUrl: `${baseUrl}/admin/corporate-leads`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  let html = replaceTemplateVariables(template, variables);
  
  // Handle conditional message section
  if (leadData.message) {
    const messageSection = `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
            <strong>Requirement/Message:</strong>
            <div style="background-color: white; padding: 10px; border-radius: 3px; margin-top: 8px; white-space: pre-wrap;">${leadData.message.replace(/\n/g, "<br>")}</div>
    </div>`;
    html = html.replace(/{messageSection}/g, messageSection);
  } else {
    html = html.replace(/{messageSection}/g, "");
  }
  const subject = `New Corporate Lead - ${leadData.companyName}`;

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
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("corporateLeadConfirmationEmail", templates.emailCorporateLeadConfirmation);
  const config = await loadEmailConfig();
  
  const variables: EmailTemplateVariables = {
    email: userEmail,
    companyNameLead: companyName,
    contactName,
    supportEmail: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "corporate@travunited.in",
    supportPhone: "+91 63603 92398",
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  let html = replaceTemplateVariables(template, variables);
  
  // Handle conditional support phone section
  if (variables.supportPhone) {
    const phoneSection = `<li><strong>Phone:</strong> <a href="tel:${variables.supportPhone}">${variables.supportPhone}</a></li>`;
    html = html.replace(/{supportPhoneSection}/g, phoneSection);
  } else {
    html = html.replace(/{supportPhoneSection}/g, "");
  }
  const subject = "We received your corporate request";

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
  const templates = await loadEmailTemplates();
  let template = getEmailTemplate("adminWelcomeEmail", templates.emailAdminWelcome);
  const config = await loadEmailConfig();
  
  const roleDisplay = role === "SUPER_ADMIN" ? "Super Admin" : "Staff Admin";
  const companyName = config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited";
  
  const variables: EmailTemplateVariables = {
    email,
    name,
    role: roleDisplay,
    tempPassword: tempPassword || "",
    loginUrl,
    companyName,
  };
  
  // Handle conditional password section
  let html = replaceTemplateVariables(template, variables);
  
  if (tempPassword) {
    const passwordSection = `<div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #856404;">Your Temporary Password</h3>
      <p style="font-size: 18px; font-weight: bold; color: #856404; font-family: monospace; letter-spacing: 2px; margin: 10px 0;">${tempPassword}</p>
      <p style="margin-bottom: 0; color: #856404;"><strong>Please change this password immediately after your first login.</strong></p>
    </div>`;
    html = html.replace(/{tempPasswordSection}/g, passwordSection);
  } else {
    const noPasswordSection = `<div style="background-color: #d1ecf1; border: 1px solid #0c5460; border-radius: 5px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #0c5460;">Please use the password provided by your administrator or request a password reset.</p>
    </div>`;
    html = html.replace(/{tempPasswordSection}/g, noPasswordSection);
  }
  const subject = "Welcome to Travunited Admin Panel";

  // Send directly to admin's email (not routed through admin inbox)
  return sendEmail({
    to: email,
    subject,
    html,
    category: "general",
  });
}

