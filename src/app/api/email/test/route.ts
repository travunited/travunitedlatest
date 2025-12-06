/**
 * API Route: Test Email
 * POST /api/email/test
 * 
 * Test endpoint to send a test email and verify configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "STAFF_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { to } = body;

    // Default to admin email or session user email
    const testEmail = to || session.user.email || process.env.ADMIN_EMAIL;

    if (!testEmail) {
      return NextResponse.json(
        { error: "No recipient email provided" },
        { status: 400 }
      );
    }

    // Send test email
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { color: #10b981; font-weight: bold; font-size: 24px; }
            .info { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Email Test Successful!</h1>
            </div>
            <div class="content">
              <p class="success">✓ Your email configuration is working!</p>
              <p>This is a test email from <strong>TravUnited</strong> email system.</p>
              
              <div class="info">
                <strong>Configuration Details:</strong>
                <ul>
                  <li>Provider: <strong>AWS SDK</strong></li>
                  <li>From: <strong>${process.env.EMAIL_FROM || "no-reply@travunited.in"}</strong></li>
                  <li>Sent: <strong>${new Date().toLocaleString()}</strong></li>
                </ul>
              </div>

              <p>If you received this email, your email system is configured correctly and ready to send:</p>
              <ul>
                <li>✉️ Booking confirmations</li>
                <li>🔐 Password resets</li>
                <li>📧 Contact form responses</li>
                <li>🎫 Tour notifications</li>
                <li>📋 Application updates</li>
              </ul>

              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Configure SNS webhook for bounce/complaint handling</li>
                <li>Monitor SES sending metrics in AWS Console</li>
                <li>Customize email templates in Admin Settings</li>
              </ol>

              <div class="footer">
                <p>TravUnited - Making travel easier</p>
                <p>This is an automated test email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via AWS SDK
    const success = await sendEmail({
      to: [testEmail],
      subject: `✓ TravUnited Email Test - ${new Date().toLocaleTimeString()}`,
      html: testHtml,
      text: `Email test successful! Your AWS SDK configuration is working. Sent at ${new Date().toLocaleString()}`,
    });
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send email via AWS SDK. Check your AWS credentials.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}`,
      messageId: "sent-via-aws-sdk",
      provider: "aws-sdk",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Test email error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send test email",
        message: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Email test endpoint. Use POST method with optional 'to' parameter.",
    usage: "POST /api/email/test with body: { to: 'email@example.com' }",
  });
}

