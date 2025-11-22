import { Resend } from "resend";
import { formatDate } from "./dateFormat";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (resendClient && emailFrom) {
    try {
      await resendClient.emails.send({
        from: emailFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || stripHtml(options.html),
      });
      return true;
    } catch (error) {
      console.error("Error sending email via Resend:", error);
      return false;
    }
  }

  console.warn("Resend is not configured. Falling back to console logging.");
  console.log("📧 Email would be sent:", {
    to: options.to,
    subject: options.subject,
  });
  return true;
}

// Email templates
export async function sendWelcomeEmail(email: string, name?: string) {
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
  
  return sendEmail({ to: email, subject, html });
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
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
  
  return sendEmail({ to: email, subject, html });
}

export async function sendVisaPaymentSuccessEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  amount: number
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
  
  return sendEmail({ to: email, subject, html });
}

export async function sendVisaStatusUpdateEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  status: string
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
  
  return sendEmail({ to: email, subject, html });
}

export async function sendVisaDocumentRejectedEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  rejectedDocs: Array<{ type: string; reason: string }>
) {
  const subject = `Documents Need Re-upload - ${country} ${visaType}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Documents Rejected</h1>
      <p>Some documents for your ${country} ${visaType} application need to be re-uploaded:</p>
      <ul>
        ${rejectedDocs.map(doc => `<li><strong>${doc.type}:</strong> ${doc.reason}</li>`).join("")}
      </ul>
      <p><a href="${process.env.NEXTAUTH_URL}/dashboard/applications/${applicationId}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Re-upload Documents</a></p>
      <p>Best regards,<br>The Travunited Team</p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, html });
}

export async function sendVisaApprovedEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string
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
  
  return sendEmail({ to: email, subject, html });
}

export async function sendVisaRejectedEmail(
  email: string,
  applicationId: string,
  country: string,
  visaType: string,
  reason: string
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
  
  return sendEmail({ to: email, subject, html });
}

export async function sendTourPaymentSuccessEmail(
  email: string,
  bookingId: string,
  tourName: string,
  amount: number,
  isAdvance: boolean,
  pendingBalance?: number
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
  
  return sendEmail({ to: email, subject, html });
}

export async function sendTourConfirmedEmail(
  email: string,
  bookingId: string,
  tourName: string
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
  
  return sendEmail({ to: email, subject, html });
}

export async function sendTourPaymentReminderEmail(
  email: string,
  bookingId: string,
  tourName: string,
  pendingBalance: number,
  dueDate?: string
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
  
  return sendEmail({ to: email, subject, html });
}

export async function sendTourStatusUpdateEmail(
  email: string,
  bookingId: string,
  tourName: string,
  status: string
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

  return sendEmail({ to: email, subject, html });
}

export async function sendTourVouchersReadyEmail(
  email: string,
  bookingId: string,
  tourName: string
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

  return sendEmail({ to: email, subject, html });
}

export async function sendEmailVerificationEmail(email: string, verificationLink: string, name?: string) {
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
  
  return sendEmail({ to: email, subject, html });
}

