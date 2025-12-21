/**
 * Email Template System
 * Supports dynamic templates with variable replacement
 */

export interface EmailTemplateVariables {
  // User variables
  name?: string;
  email?: string;
  
  // Application variables
  applicationId?: string;
  country?: string;
  visaType?: string;
  status?: string;
  amount?: number;
  reason?: string;
  promoCode?: string;
  discountAmount?: number;
  
  // Booking variables
  bookingId?: string;
  tourName?: string;
  pendingBalance?: number;
  dueDate?: string;
  isAdvance?: boolean;
  
  // Document variables
  rejectedDocs?: Array<{ type: string; reason: string; documentId?: string }>;
  
  // Link variables
  resetLink?: string;
  verificationLink?: string;
  dashboardUrl?: string;
  applicationUrl?: string;
  documentsUrl?: string;
  bookingUrl?: string;
  googleReviewUrl?: string;
  
  // OTP variables
  otp?: string;
  
  // Company variables
  companyName?: string;
  supportEmail?: string;
  supportPhone?: string;
  
  // Corporate lead variables
  companyNameLead?: string;
  contactName?: string;
  message?: string;
  createdAt?: Date;
  
  // Admin variables
  role?: string;
  tempPassword?: string;
  loginUrl?: string;
  
  // Career application variables
  positionTitle?: string;
  statusColor?: string;
  statusMessage?: string;
  applicationIdShort?: string;
  nextStepsSection?: string;
}

/**
 * Replace template variables in a string
 * Supports variables like {name}, {applicationId}, {amount}, etc.
 */
export function replaceTemplateVariables(
  template: string,
  variables: EmailTemplateVariables
): string {
  if (!template) return template;
  
  let result = template;
  const baseUrl = process.env.NEXTAUTH_URL || "https://travunited.com";
  
  // Replace common variables
  const replacements: Record<string, string> = {
    "{name}": variables.name || "",
    "{email}": variables.email || "",
    "{applicationId}": variables.applicationId || "",
    "{applicationIdShort}": variables.applicationIdShort || (variables.applicationId ? variables.applicationId.slice(0, 8) + "..." : ""),
    "{country}": variables.country || "",
    "{visaType}": variables.visaType || "",
    "{status}": variables.status || "",
    "{amount}": variables.amount ? `₹${variables.amount.toLocaleString()}` : "",
    "{reason}": variables.reason || "",
    "{bookingId}": variables.bookingId || "",
    "{bookingIdShort}": variables.bookingId ? variables.bookingId.slice(0, 8) + "..." : "",
    "{tourName}": variables.tourName || "",
    "{pendingBalance}": variables.pendingBalance ? `₹${variables.pendingBalance.toLocaleString()}` : "",
    "{dueDate}": variables.dueDate || "",
    "{promoCode}": variables.promoCode || "",
    "{discountAmount}": variables.discountAmount ? `₹${(variables.discountAmount / 100).toLocaleString()}` : "",
    "{resetLink}": variables.resetLink || "",
    "{verificationLink}": variables.verificationLink || "",
    "{dashboardUrl}": variables.dashboardUrl || `${baseUrl}/dashboard`,
    "{applicationUrl}": variables.applicationUrl || (variables.applicationId ? `${baseUrl}/dashboard/applications/${variables.applicationId}` : ""),
    "{bookingUrl}": variables.bookingUrl || (variables.bookingId ? `${baseUrl}/dashboard/bookings/${variables.bookingId}` : ""),
    "{googleReviewUrl}": variables.googleReviewUrl || "",
    "{companyName}": variables.companyName || "Travunited",
    "{supportEmail}": variables.supportEmail || "support@travunited.in",
    "{supportPhone}": variables.supportPhone || "",
    "{contactName}": variables.contactName || "",
    "{companyNameLead}": variables.companyNameLead || "",
    "{message}": variables.message || "",
    "{role}": variables.role || "",
    "{tempPassword}": variables.tempPassword || "",
    "{loginUrl}": variables.loginUrl || `${baseUrl}/admin/login`,
    "{otp}": variables.otp || "",
    "{positionTitle}": variables.positionTitle || "",
    "{statusColor}": variables.statusColor || "#6b7280",
    "{statusMessage}": variables.statusMessage || "",
    "{nextStepsSection}": variables.nextStepsSection || "",
  };
  
  // Replace all variables
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  
  // Handle conditional sections
  // {reason} - only show if reason exists
  if (variables.reason) {
    result = result.replace(/{reason}/g, `<p><strong>Reason:</strong> ${variables.reason}</p>`);
  } else {
    result = result.replace(/{reason}/g, "");
  }
  
  // {promoCode} - only show if promo code exists
  if (variables.promoCode && variables.discountAmount) {
    result = result.replace(/{promoCode}/g, `<p style="color: #059669;"><strong>Promo Code Applied:</strong> ${variables.promoCode} - You saved ${variables.discountAmount}</p>`);
  } else {
    result = result.replace(/{promoCode}/g, "");
  }
  
  // {pendingBalance} - only show if pendingBalance exists
  if (variables.pendingBalance !== undefined && variables.pendingBalance !== null) {
    result = result.replace(/{pendingBalance}/g, `<p><strong>Pending Balance:</strong> ₹${variables.pendingBalance.toLocaleString()}</p>`);
  } else {
    result = result.replace(/{pendingBalance}/g, "");
  }
  
  // {dueDate} - only show if dueDate exists
  if (variables.dueDate) {
    result = result.replace(/{dueDate}/g, `<p><strong>Due Date:</strong> ${variables.dueDate}</p>`);
  } else {
    result = result.replace(/{dueDate}/g, "");
  }
  
  // {tempPasswordSection} - handled in sendAdminWelcomeEmail function
  // {messageSection} - handled in sendCorporateLeadAdminEmail function
  // {supportPhoneSection} - handled in sendCorporateLeadConfirmationEmail function
  
  // Handle rejected documents list
  if (variables.rejectedDocs && variables.rejectedDocs.length > 0) {
    const docsList = variables.rejectedDocs
      .map((doc) => {
        const docUrl = doc.documentId && variables.applicationId
          ? `${baseUrl}/dashboard/applications/${variables.applicationId}?requiredDoc=${doc.documentId}`
          : "";
        return `<li><strong>${doc.type}:</strong> ${doc.reason}${docUrl ? `<br/><a href="${docUrl}">Re-upload this document</a>` : ""}</li>`;
      })
      .join("");
    result = result.replace(/{rejectedDocsList}/g, `<ul>${docsList}</ul>`);
  } else {
    result = result.replace(/{rejectedDocsList}/g, "");
  }
  
  // Handle date formatting
  if (variables.createdAt) {
    const date = new Date(variables.createdAt);
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    result = result.replace(/{createdAt}/g, formattedDate);
  }
  
  // Handle name formatting - add comma and space if name exists
  if (variables.name) {
    result = result.replace(/{name}/g, `, ${variables.name}`);
  } else {
    result = result.replace(/{name}/g, "");
  }
  
  return result;
}

/**
 * Get default email template for a given template key
 */
export function getDefaultEmailTemplate(templateKey: string): string {
  const defaults: Record<string, string> = {
    // General emails
    welcomeEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Welcome to {companyName}{name}!</h1>
  <p>Thank you for joining {companyName}. We're here to make your travel dreams come true.</p>
  <p>You can now:</p>
  <ul>
    <li>Apply for visas to multiple countries</li>
    <li>Book amazing tour packages</li>
    <li>Track your applications and bookings</li>
  </ul>
  <p>Get started by browsing our <a href="{dashboardUrl}">dashboard</a>.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    passwordResetEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Password Reset Request</h1>
  <p>You requested to reset your password. Click the link below to set a new password:</p>
  <p><a href="{resetLink}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
  <p style="margin-top: 20px; font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
  <p style="font-size: 11px; color: #999; word-break: break-all;">{resetLink}</p>
  <p>This link will expire in 24 hours.</p>
  <p>If you didn't request this, please ignore this email.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    passwordResetOTPEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Password Reset OTP</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">You requested to reset your password. Use the OTP below to verify your identity:</p>
    
    <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
      <p style="font-size: 12px; color: #666; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
      <p style="font-size: 36px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">{otp}</p>
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
        <strong>Security Tip:</strong> {companyName} will never ask for your OTP via phone or email. Only enter it on our official website.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>The {companyName} Team</strong>
    </p>
  </div>
</div>`,

    registrationOTPEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Welcome to {companyName}!</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi{name},</p>
    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Thank you for registering with {companyName}. Use the OTP below to verify your email address:</p>
    
    <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
      <p style="font-size: 12px; color: #666; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
      <p style="font-size: 36px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">{otp}</p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin: 20px 0;">
      <strong>Important:</strong>
    </p>
    <ul style="font-size: 14px; color: #666; margin: 10px 0; padding-left: 20px;">
      <li>This OTP is valid for <strong>10 minutes</strong> only</li>
      <li>Do not share this OTP with anyone</li>
      <li>You must verify your email before you can login</li>
    </ul>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-size: 13px; color: #856404; margin: 0;">
        <strong>Security Tip:</strong> {companyName} will never ask for your OTP via phone or email. Only enter it on our official website.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      If you didn't create an account with {companyName}, please ignore this email.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      Best regards,<br>
      <strong>The {companyName} Team</strong>
    </p>
  </div>
</div>`,

    emailVerificationEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Verify Your Email Address</h1>
  <p>Hi{name},</p>
  <p>Thank you for signing up with {companyName}! Please verify your email address by clicking the link below:</p>
  <p><a href="{verificationLink}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a></p>
  <p>This link will expire in 7 days.</p>
  <p>If you didn't create an account, please ignore this email.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    // Visa emails
    visaPaymentSuccessEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Payment Successful!</h1>
  <p>Your payment for {country} {visaType} has been received successfully.</p>
  <p><strong>Amount Paid:</strong> {amount}</p>
  {promoCode}
  <p><strong>Application ID:</strong> {applicationIdShort}</p>
  <p>Your application is now submitted and will be processed shortly. You can track the status in your <a href="{applicationUrl}">dashboard</a>.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    visaPaymentFailedEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Payment Failed</h1>
  <p>Your payment attempt for {country} {visaType} could not be completed.</p>
  <p><strong>Amount:</strong> {amount}</p>
  {reason}
  <p>Please try again from your <a href="{applicationUrl}">application dashboard</a>. If the issue persists, contact support.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    visaStatusUpdateEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Application Status Updated</h1>
  <p>Your {country} {visaType} application status has been updated to: <strong>{status}</strong></p>
  <p>View details in your <a href="{applicationUrl}">dashboard</a>.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    visaDocumentRejectedEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Documents Rejected</h1>
  <p>Some documents for your {country} {visaType} application need to be re-uploaded:</p>
  {rejectedDocsList}
  <p><a href="{applicationUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Open Application</a></p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    visaApprovedEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>🎉 Your Visa is Approved!</h1>
  <p>Great news! Your {country} {visaType} has been approved.</p>
  <p>You can now download your visa from your <a href="{applicationUrl}">dashboard</a>.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    visaRejectedEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Application Status Update</h1>
  <p>Your {country} {visaType} application has been rejected.</p>
  {reason}
  <p>View details in your <a href="{applicationUrl}">dashboard</a>.</p>
  <p>If you have questions, please contact our support team.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    // Visa Feedback Email - Sent to users after visa approval (24+ hours after approval)
    // Variables: {country}, {visaType}, {googleReviewUrl}, {companyName}, {applicationUrl}
    visaFeedbackEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1f2937; margin-bottom: 20px;">🌟 We'd Love Your Feedback!</h1>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hi there,
    </p>
    
    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      We hope you're enjoying your {country} {visaType}! Your experience matters to us, and we'd be incredibly grateful if you could take a moment to share your feedback.
    </p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #92400e; font-size: 15px; line-height: 1.6; margin: 0;">
        <strong>⭐ Your feedback helps us serve you better!</strong><br>
        Share your experience by rating us on Google.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{googleReviewUrl}" 
         style="display: inline-block; background-color: #4285f4; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(66, 133, 244, 0.3);">
        Rate Us on Google ⭐
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 24px; margin-bottom: 12px;">
      Your feedback helps us improve our services and helps future travelers make informed decisions.
    </p>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
      Thank you for choosing {companyName}. We appreciate your time!
    </p>
    
    <p style="color: #374151; font-size: 15px; margin-top: 30px; margin-bottom: 0;">
      Best regards,<br>
      <strong>The {companyName} Team</strong>
    </p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        View your visa application: <a href="{applicationUrl}" style="color: #4285f4; text-decoration: none;">{applicationUrl}</a>
      </p>
    </div>
  </div>
</div>`,

    // Tour emails
    tourPaymentSuccessEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Payment Successful!</h1>
  <p>Your payment for {tourName} has been received successfully.</p>
  <p><strong>Amount Paid:</strong> {amount}</p>
  {promoCode}
  {pendingBalance}
  <p><strong>Booking ID:</strong> {bookingIdShort}</p>
  <p>View your booking in your <a href="{bookingUrl}">dashboard</a>.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    tourPaymentFailedEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Payment Failed</h1>
  <p>Your payment attempt for {tourName} could not be completed.</p>
  <p><strong>Amount:</strong> {amount}</p>
  {reason}
  <p>Please try again from your <a href="{bookingUrl}">booking dashboard</a>. If the issue persists, contact support.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    tourConfirmedEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>🎉 Your Tour is Confirmed!</h1>
  <p>Great news! Your {tourName} booking has been confirmed.</p>
  <p>You can now download your vouchers and itinerary from your <a href="{bookingUrl}">dashboard</a>.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    tourPaymentReminderEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Payment Reminder</h1>
  <p>This is a reminder that you have a pending balance for {tourName}.</p>
  <p><strong>Pending Balance:</strong> {pendingBalance}</p>
  {dueDate}
  <p><a href="{bookingUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Pay Now</a></p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    tourStatusUpdateEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Status Update</h1>
  <p>Your booking for {tourName} is now <strong>{status}</strong>.</p>
  <p>You can view full details in your <a href="{bookingUrl}">dashboard</a>.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    tourVouchersReadyEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Vouchers Ready</h1>
  <p>Your vouchers and itinerary for {tourName} are ready for download.</p>
  <p>Access them from your <a href="{bookingUrl}">dashboard</a>.</p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    // Admin emails
    adminWelcomeEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #0066cc;">Welcome to {companyName} Admin Panel!</h1>
  <p>Dear {name},</p>
  <p>Your admin account has been successfully created for the {companyName} platform.</p>
  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #333;">Account Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 120px;">Email:</td>
        <td style="padding: 8px 0;">{email}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Role:</td>
        <td style="padding: 8px 0;">{role}</td>
      </tr>
    </table>
  </div>
  {tempPasswordSection}
  <p style="margin-top: 30px; text-align: center;">
    <a href="{loginUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Log In to Admin Panel</a>
  </p>
  <p>Best regards,<br>The {companyName} Team</p>
</div>`,

    corporateLeadAdminEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #0066cc;">New Corporate Lead</h1>
  <p>A new corporate lead has been submitted through the corporate page.</p>
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h2 style="margin-top: 0; color: #333;">Lead Details</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 150px;">Company Name:</td>
        <td style="padding: 8px 0;">{companyNameLead}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Contact Person:</td>
        <td style="padding: 8px 0;">{contactName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Email:</td>
        <td style="padding: 8px 0;"><a href="mailto:{email}">{email}</a></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Submitted:</td>
        <td style="padding: 8px 0;">{createdAt}</td>
      </tr>
    </table>
    {messageSection}
  </div>
  <p style="margin-top: 20px;">
    <a href="{dashboardUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View in Admin Panel</a>
  </p>
  <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated notification from {companyName}.</p>
</div>`,

    corporateLeadConfirmationEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #0066cc;">Thank You for Your Interest!</h1>
  <p>Dear {contactName},</p>
  <p>We have received your corporate travel inquiry for <strong>{companyNameLead}</strong>. Our corporate travel team is reviewing your requirements and will get back to you within 24 hours.</p>
  <p>In the meantime, if you have any urgent questions, feel free to contact us directly:</p>
  <ul>
    <li><strong>Email:</strong> <a href="mailto:{supportEmail}">{supportEmail}</a></li>
    {supportPhoneSection}
  </ul>
  <p>We look forward to helping your organization with its travel needs!</p>
  <p>Best regards,<br>The {companyName} Corporate Team</p>
</div>`,

    careerApplicationStatusEmail: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Application Status Update</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Dear {name},</p>
    
    <div style="background: white; padding: 20px; border-left: 4px solid {statusColor}; margin: 20px 0;">
      <p style="margin: 0;">{statusMessage}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <span style="display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; background-color: {statusColor};">{status}</span>
    </div>

    <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Position:</strong> {positionTitle}</p>
      <p style="margin: 5px 0;"><strong>Application ID:</strong> {applicationIdShort}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> {status}</p>
    </div>

    {nextStepsSection}

    <p>If you have any questions, please feel free to reach out to us at <a href="mailto:careers@travunited.in">careers@travunited.in</a>.</p>

    <p>Thank you for your interest in joining {companyName}!</p>

    <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p><strong>{companyName}</strong> - Making travel easier</p>
      <p>This is an automated email. Please do not reply directly to this message.</p>
    </div>
  </div>
</div>`,
  };
  
  return defaults[templateKey] || "";
}

