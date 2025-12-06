/**
 * API Route: Send Email
 * POST /api/email/send
 * 
 * Email sending endpoint using AWS SDK
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    // Check authentication for security
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "STAFF_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { to, subject, html, text } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    // Send email via AWS SDK
    const success = await sendEmail({
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });
    
    if (!success) {
      throw new Error("Failed to send email via AWS SDK");
    }

    return NextResponse.json({
      success: true,
      messageId: "sent-via-aws-sdk",
      provider: "aws-sdk",
    });
  } catch (error: any) {
    console.error("Email send error:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        message: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

