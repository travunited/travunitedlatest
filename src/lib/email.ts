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
  bypassActiveCheck?: boolean; // Set to true to send even to inactive users (e.g., password reset)
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

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const startTime = Date.now();
  lastEmailError = null;
  
  // Convert recipients to array for processing
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  
  // Check if any recipients are inactive (bounced/complained emails)
  // Skip sending to inactive users to prevent bounces (unless bypassActiveCheck is true)
  const activeRecipients: string[] = [];
  for (const recipient of recipients) {
    try {
      // If bypassActiveCheck is true (e.g., for password reset), always send
      if (options.bypassActiveCheck) {
        activeRecipients.push(recipient);
        continue;
      }
      
      const user = await prisma.user.findUnique({
        where: { email: recipient.toLowerCase() },
        select: { isActive: true },
      });
      
      // Only send to active users (inactive users may have bounced/complained)
      if (!user || user.isActive) {
        activeRecipients.push(recipient);
      } else {
        console.log(`[Email] Skipping inactive user: ${recipient} (use bypassActiveCheck=true to override)`);
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
    // Validate HTML content
    if (!finalOptions.html || !finalOptions.html.trim()) {
      const message = "Email HTML content is empty";
      console.error("[Email]", message);
      lastEmailError = message;
      return false;
    }

    // Prepare email parameters for AWS SES
    const textContent = finalOptions.text || stripHtml(finalOptions.html);
    
    const emailParams = {
      Source: from,
      Destination: {
        ToAddresses: activeRecipients,
      },
      Message: {
        Subject: {
          Data: finalOptions.subject || "No Subject",
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: finalOptions.html,
            Charset: "UTF-8",
          },
          Text: {
            Data: textContent || "Email content",
            Charset: "UTF-8",
          },
        },
      },
      ...(finalOptions.replyTo && {
        ReplyToAddresses: Array.isArray(finalOptions.replyTo) ? finalOptions.replyTo : [finalOptions.replyTo],
      }),
    };

    // Validate email parameters
    if (!emailParams.Source || !emailParams.Destination.ToAddresses || emailParams.Destination.ToAddresses.length === 0) {
      const message = "Invalid email parameters: missing source or recipients";
      console.error("[Email]", message, { source: emailParams.Source, recipients: emailParams.Destination.ToAddresses });
      lastEmailError = message;
      return false;
    }

    // Add timeout to AWS SES API call to prevent long delays
    const sendCommand = new SendEmailCommand(emailParams);
    const sendPromise = sesClient.send(sendCommand);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("AWS SES API timeout after 15 seconds")), 15000);
    });
    
    const result = await Promise.race([sendPromise, timeoutPromise]);
    const duration = Date.now() - startTime;

    console.log("[Email] ✅ Sent successfully", {
      to: activeRecipients.join(", "),
      from,
      subject: finalOptions.subject,
      messageId: result.MessageId,
      duration: `${duration}ms`,
      region: config.awsRegion,
    });
    lastEmailError = null; // Clear any previous errors
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    let message = "Unknown error sending email via AWS SES";
    let errorCode = "UNKNOWN";
    
    if (error instanceof Error) {
      message = error.message;
      // Extract AWS error code if available
      if ((error as any).$metadata?.httpStatusCode) {
        errorCode = `HTTP_${(error as any).$metadata.httpStatusCode}`;
      }
      if ((error as any).Code) {
        errorCode = (error as any).Code;
      }
    }
    
    console.error("[Email] ❌ Failed to send email via AWS SES:", {
      error: message,
      errorCode,
      stack: error instanceof Error ? error.stack : undefined,
      to: activeRecipients.join(", "),
      from,
      subject: finalOptions.subject,
      duration: `${duration}ms`,
      hasCredentials: !!(config.awsAccessKeyId && config.awsSecretAccessKey),
      region: config.awsRegion,
      sesErrorDetails: error,
    });
    lastEmailError = `${message} (${errorCode})`;
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
  try {
    console.log("[Password Reset Email] 📧 Starting email send", {
      email,
      resetLinkPreview: resetLink.slice(0, 80) + "...",
      resetLinkFull: resetLink, // Log full link for debugging
      role: role || "not provided",
      timestamp: new Date().toISOString(),
    });

    const subject = "Reset Your Travunited Password";
    
    // Ensure resetLink is a valid URL
    if (!resetLink || !resetLink.startsWith("http")) {
      const error = `Invalid reset link format: ${resetLink}`;
      console.error("[Password Reset Email] ❌ Invalid reset link", { resetLink, error });
      lastEmailError = error;
      return false;
    }
    
    // Escape resetLink for HTML to prevent XSS (but keep original for text version)
    const escapedResetLink = resetLink
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Professional email template with proper reset link
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0066cc 0%, #004499 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Password Reset Request</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hello,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                You requested to reset your password for your Travunited account. Click the button below to set a new password:
              </p>
              
              <!-- Reset Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${resetLink}" style="background-color: #0066cc; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; border: none;">Reset Password</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 24px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              
              <!-- Reset Link -->
              <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; margin: 16px 0;">
                <p style="word-break: break-all; font-size: 12px; color: #555555; margin: 0; font-family: monospace;">
                  ${resetLink}
                </p>
              </div>
              
              <!-- Warning Box -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="color: #856404; font-size: 14px; margin: 0; font-weight: 600;">
                  ⏰ Important: This link will expire in 1 hour.
                </p>
                <p style="color: #856404; font-size: 13px; margin: 8px 0 0 0;">
                  Please reset your password as soon as possible.
                </p>
              </div>
              
              <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
                If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />
              
              <p style="color: #666666; font-size: 12px; margin: 0;">
                Best regards,<br/>
                <strong style="color: #333333;">The Travunited Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `Reset Your Travunited Password

Hello,

You requested to reset your password for your Travunited account. Click the link below to set a new password:

${resetLink}

⏰ Important: This link will expire in 1 hour. Please reset your password as soon as possible.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The Travunited Team`;

    console.log("[Password Reset Email] 📝 Email content prepared", {
      email,
      subject,
      htmlLength: html.length,
      textLength: text.length,
      resetLinkIncluded: html.includes(resetLink) && text.includes(resetLink),
      timestamp: new Date().toISOString(),
    });

    // Use EXACT same pattern as contact form - await sendEmail directly
    // Password reset emails must always go to the user and skip active checks
    const result = await sendEmail({
      to: email,
      subject,
      html,
      text,
      category: "general",
      bypassActiveCheck: true, // Always send password reset emails, even to inactive users
    });
    
    if (result) {
      console.log("[Password Reset Email] ✅ Email sent successfully", {
        email,
        resetLinkPreview: resetLink.slice(0, 80) + "...",
        timestamp: new Date().toISOString(),
      });
    } else {
      const error = getLastEmailError();
      console.error("[Password Reset Email] ❌ Email sending failed", {
        email,
        error: error || "Unknown error",
        resetLinkPreview: resetLink.slice(0, 80) + "...",
        timestamp: new Date().toISOString(),
      });
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Password Reset Email] ❌ Exception in sendPasswordResetEmail", {
      email,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    lastEmailError = `Exception: ${errorMessage}`;
    return false;
  }
}

// Fallback simple OTP email template (used if template loading fails)
const FALLBACK_OTP_TEMPLATE = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #667eea;">Password Reset OTP</h1>
  <p>You requested to reset your password. Use the OTP below to verify your identity:</p>
  <div style="background: #f0f0f0; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
    <p style="font-size: 36px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">{otp}</p>
  </div>
  <p><strong>Important:</strong> This OTP is valid for 10 minutes only. Do not share this OTP with anyone.</p>
  <p>If you didn't request this, please ignore this email.</p>
  <p>Best regards,<br>The Travunited Team</p>
</div>`;

// Fallback simple Registration OTP email template
const FALLBACK_REGISTRATION_OTP_TEMPLATE = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #667eea;">Welcome to Travunited!</h1>
  <p>Hi{name},</p>
  <p>Thank you for registering with Travunited. Use the OTP below to verify your email address:</p>
  <div style="background: #f0f0f0; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
    <p style="font-size: 36px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">{otp}</p>
  </div>
  <p><strong>Important:</strong> This OTP is valid for 10 minutes only. Do not share this OTP with anyone.</p>
  <p>If you didn't create an account with Travunited, please ignore this email.</p>
  <p>Best regards,<br>The Travunited Team</p>
</div>`;

export async function sendRegistrationOTPEmail(
  email: string,
  otp: string,
  name?: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  try {
    console.log("[Email] sendRegistrationOTPEmail called", {
      email,
      otpLength: otp.length,
      name: name || "not provided",
      role: role || "not provided",
    });
    
    const subject = "Verify Your Email - Travunited";
    
    // Load templates and ensure we have a valid template
    let template: string;
    try {
      const templates = await loadEmailTemplates();
      const loadedTemplate = getEmailTemplate("registrationOTPEmail", (templates as any).emailRegistrationOTP || "");
      
      console.log("[Email] Registration OTP template loaded", {
        hasTemplate: !!loadedTemplate,
        templateLength: loadedTemplate?.length || 0,
        hasCustomTemplate: !!(templates as any).emailRegistrationOTP,
        customTemplateLength: (templates as any).emailRegistrationOTP?.length || 0,
      });
      
      // If template is empty or invalid, force use default
      if (!loadedTemplate || !loadedTemplate.trim()) {
        console.warn("[Email] Custom template is empty, using fallback template", {
          templateKey: "registrationOTPEmail",
        });
        template = FALLBACK_REGISTRATION_OTP_TEMPLATE;
      } else {
        template = loadedTemplate;
      }
    } catch (templateError) {
      console.error("[Email] Error loading template, using fallback", {
        error: templateError instanceof Error ? templateError.message : String(templateError),
      });
      template = FALLBACK_REGISTRATION_OTP_TEMPLATE;
    }
    
    // Final safety check - if still empty, use hardcoded fallback
    if (!template || !template.trim()) {
      console.error("[Email] ❌ Registration OTP template is still empty after fallback, using hardcoded fallback", {
        templateKey: "registrationOTPEmail",
      });
      template = FALLBACK_REGISTRATION_OTP_TEMPLATE;
    }
    
    const config = await loadEmailConfig();
    const variables: EmailTemplateVariables = {
      otp,
      name: name || "",
      email,
      companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
    };
    
    let html = replaceTemplateVariables(template, variables);
    
    // Fix name formatting
    if (name) {
      html = html.replace(/{name}/g, ` ${name}`);
    } else {
      html = html.replace(/Hi{name}/g, "Hi");
    }
    
    console.log("[Email] Registration OTP HTML generated", {
      htmlLength: html?.length || 0,
      hasHtml: !!html && html.trim().length > 0,
    });
    
    if (!html || !html.trim()) {
      console.error("[Email] ❌ Generated HTML for Registration OTP is empty", {
        templateLength: template.length,
        variables,
      });
      return false;
    }
    
    // Registration OTP emails should ALWAYS go to the user's actual email address
    // Bypass active check since user is not yet verified
    console.log("[Email] Calling sendEmail for Registration OTP", {
      to: email,
      subject,
      category: "general",
      bypassActiveCheck: true,
      htmlLength: html.length,
    });
    
    const result = await sendEmail({
      to: email,
      subject,
      html,
      category: "general",
      bypassActiveCheck: true, // Always send registration emails, even if user is inactive
    });
    
    console.log("[Email] sendEmail result for Registration OTP", {
      success: result,
      email,
      lastError: result ? null : getLastEmailError(),
    });
    
    return result;
  } catch (error) {
    console.error("[Email] ❌ Exception in sendRegistrationOTPEmail:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      email,
      otpLength: otp?.length || 0,
    });
    return false;
  }
}

export async function sendPasswordResetOTPEmail(
  email: string,
  otp: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  try {
    console.log("[Email] sendPasswordResetOTPEmail called", {
      email,
      otpLength: otp.length,
      role: role || "not provided",
    });
    
    const subject = "Your Password Reset OTP";
    
    // Load templates and ensure we have a valid template
    let template: string;
    try {
      const templates = await loadEmailTemplates();
      const loadedTemplate = getEmailTemplate("passwordResetOTPEmail", templates.emailPasswordResetOTP);
      
      console.log("[Email] Password Reset OTP template loaded", {
        hasTemplate: !!loadedTemplate,
        templateLength: loadedTemplate?.length || 0,
        hasCustomTemplate: !!templates.emailPasswordResetOTP,
        customTemplateLength: templates.emailPasswordResetOTP?.length || 0,
      });
      
      // If template is empty or invalid, force use default
      if (!loadedTemplate || !loadedTemplate.trim()) {
        console.warn("[Email] Custom template is empty, forcing default template", {
          templateKey: "passwordResetOTPEmail",
        });
        template = getDefaultEmailTemplate("passwordResetOTPEmail");
      } else {
        template = loadedTemplate;
      }
    } catch (templateError) {
      console.error("[Email] Error loading template, using default", {
        error: templateError instanceof Error ? templateError.message : String(templateError),
      });
      template = getDefaultEmailTemplate("passwordResetOTPEmail");
    }
    
    // Final safety check - if still empty, use hardcoded fallback
    if (!template || !template.trim()) {
      console.error("[Email] ❌ Password Reset OTP template is still empty after fallback, using hardcoded fallback", {
        templateKey: "passwordResetOTPEmail",
      });
      template = FALLBACK_OTP_TEMPLATE;
    }
    
    const variables: EmailTemplateVariables = {
      otp,
      companyName: "Travunited",
    };
    
    const html = replaceTemplateVariables(template, variables);
    
    console.log("[Email] Password Reset OTP HTML generated", {
      htmlLength: html?.length || 0,
      hasHtml: !!html && html.trim().length > 0,
      templateUsed: template.substring(0, 50) + "...", // First 50 chars for debugging
    });
    
    if (!html || !html.trim()) {
      console.error("[Email] ❌ Generated HTML for Password Reset OTP is empty", {
        templateLength: template.length,
        variables,
        templatePreview: template.substring(0, 100),
      });
      return false;
    }
    
    // Password reset OTP emails should ALWAYS go to the user's actual email address
    // Bypass active check to ensure password reset emails are sent even if user is inactive
    console.log("[Email] Calling sendEmail for Password Reset OTP", {
      to: email,
      subject,
      category: "general",
      bypassActiveCheck: true,
      htmlLength: html.length,
    });
    
    const result = await sendEmail({
      to: email,
      subject,
      html,
      category: "general",
      bypassActiveCheck: true, // Always send password reset emails, even to inactive users
    });
    
    console.log("[Email] sendEmail result for Password Reset OTP", {
      success: result,
      email,
      lastError: result ? null : getLastEmailError(),
    });
    
    return result;
  } catch (error) {
    console.error("[Email] ❌ Exception in sendPasswordResetOTPEmail:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      email,
      otpLength: otp?.length || 0,
    });
    return false;
  }
}

export async function sendVisaPaymentSuccessEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  amount: number,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null,
  promoCode?: string | null,
  discountAmount?: number | null
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
    documentsUrl: `${baseUrl}/dashboard/applications/${applicationId}/documents`, // Link to document upload page
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
    promoCode: promoCode || undefined,
    discountAmount: discountAmount || undefined,
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `Payment Successful - Upload Documents to Complete Application`;
  
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

export async function sendVisaFeedbackEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  googleReviewUrl: string,
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null
) {
  const templates = await loadEmailTemplates();
  const template = getEmailTemplate("visaFeedbackEmail", (templates as any).emailVisaFeedback || "");
  const config = await loadEmailConfig();
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
  
  const variables: EmailTemplateVariables = {
    email,
    applicationId,
    country,
    visaType,
    googleReviewUrl,
    applicationUrl: `${baseUrl}/dashboard/applications/${applicationId}`,
    companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
  };
  
  const html = replaceTemplateVariables(template, variables);
  const subject = `We'd Love Your Feedback - ${country} ${visaType}`;
  
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
  role?: UserRole | "CUSTOMER" | "STAFF_ADMIN" | "SUPER_ADMIN" | null,
  promoCode?: string | null,
  discountAmount?: number | null
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
    promoCode: promoCode || undefined,
    discountAmount: discountAmount || undefined,
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
 * Send career application status update email to candidate
 */
export async function sendCareerApplicationStatusEmail(
  candidateEmail: string,
  candidateName: string,
  positionTitle: string,
  status: string,
  applicationId: string
) {
  try {
    const templates = await loadEmailTemplates();
    const template = getEmailTemplate("careerApplicationStatusEmail", templates.emailCareerApplicationStatus);
    const config = await loadEmailConfig();
    const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.in";
    
    // Status-specific messages
    const statusMessages: Record<string, { subject: string; message: string; color: string }> = {
      SHORTLISTED: {
        subject: `Congratulations! You've been shortlisted for ${positionTitle}`,
        message: `Great news! We're pleased to inform you that your application for the position of <strong>${positionTitle}</strong> has been shortlisted. Our team will be in touch with you soon regarding the next steps in the hiring process.`,
        color: "#10b981", // green
      },
      REVIEWED: {
        subject: `Application Update: ${positionTitle}`,
        message: `Your application for the position of <strong>${positionTitle}</strong> has been reviewed. We'll keep you updated on the status of your application.`,
        color: "#3b82f6", // blue
      },
      REJECTED: {
        subject: `Application Update: ${positionTitle}`,
        message: `Thank you for your interest in the position of <strong>${positionTitle}</strong>. After careful consideration, we have decided to move forward with other candidates at this time. We appreciate your interest in Travunited and wish you the best in your job search.`,
        color: "#ef4444", // red
      },
      ON_HOLD: {
        subject: `Application Update: ${positionTitle}`,
        message: `Your application for the position of <strong>${positionTitle}</strong> is currently on hold. We'll review it again and get back to you soon.`,
        color: "#f59e0b", // amber
      },
    };

    const statusInfo = statusMessages[status] || {
      subject: `Application Status Update: ${positionTitle}`,
      message: `Your application status for the position of <strong>${positionTitle}</strong> has been updated to <strong>${status}</strong>.`,
      color: "#6b7280", // gray
    };

    const variables: EmailTemplateVariables = {
      name: candidateName,
      positionTitle,
      status: status.replace("_", " "),
      statusColor: statusInfo.color,
      statusMessage: statusInfo.message,
      applicationId,
      applicationIdShort: applicationId.slice(0, 8) + "...",
      companyName: config.emailFromGeneral?.match(/<(.+)>/)?.[1] || "Travunited",
    };

    let html = replaceTemplateVariables(template, variables);
    
    // Handle conditional next steps section for shortlisted candidates
    if (status === "SHORTLISTED") {
      const nextStepsSection = `<p style="background: #ecfdf5; padding: 15px; border-radius: 5px; border-left: 4px solid #10b981; margin: 20px 0;">
        <strong>Next Steps:</strong> Our hiring team will contact you shortly to schedule the next round of interviews. Please keep an eye on your email and phone for further communication.
      </p>`;
      html = html.replace(/{nextStepsSection}/g, nextStepsSection);
    } else {
      html = html.replace(/{nextStepsSection}/g, "");
    }

    if (!html || !html.trim()) {
      console.error("[Email] Generated HTML for Career Application Status is empty");
      return false;
    }

    return await sendEmail({
      to: candidateEmail,
      subject: statusInfo.subject,
      html,
      text: `Dear ${candidateName},\n\n${statusInfo.message.replace(/<[^>]*>/g, "")}\n\nPosition: ${positionTitle}\nApplication ID: ${applicationId.slice(0, 8)}...\nStatus: ${status.replace("_", " ")}\n\nThank you for your interest in Travunited!`,
      category: "general",
    });
  } catch (error) {
    console.error("[Email] Error sending career application status email:", error);
    return false;
  }
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

