import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { notifyMultiple } from "@/lib/notifications";
import { AuditAction, AuditEntityType } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
import { getSupportAdminEmail } from "@/lib/admin-contacts";
import crypto from "crypto";
export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phone: z.string().min(5, "Phone must be at least 5 characters").optional(),
  subject: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    // Handle both JSON and form data
    let body;
    const contentType = req.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      try {
        body = await req.json();
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError);
        return NextResponse.json(
          { ok: false, error: "Invalid JSON format. Please ensure you're sending JSON data." },
          { status: 400 }
        );
      }
    } else if (contentType?.includes("application/x-www-form-urlencoded")) {
      // Handle URL-encoded form data as fallback
      const formData = await req.formData();
      body = {
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone") || undefined,
        subject: formData.get("subject"),
        message: formData.get("message"),
      };
    } else {
      return NextResponse.json(
        { ok: false, error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    // Validate input
    const data = contactSchema.parse(body);

    // Save to database
    const contactMessage = await prisma.contactMessage.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
      },
    });

    // Log audit event (non-blocking)
    try {
      await logAuditEvent({
        adminId: null,
        entityType: AuditEntityType.OTHER,
        entityId: contactMessage.id,
        action: AuditAction.CREATE,
        description: `New help/support message from ${data.email}: ${data.subject}`,
        metadata: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          subject: data.subject,
        },
      });
    } catch (auditError) {
      console.error("Failed to log audit event:", auditError);
      // Don't fail the request if audit logging fails
    }

    // Send email notification to admin inbox with proper format
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0066cc;">New Help/Support Message</h1>
        <p>A new support message has been submitted through the help page.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #333;">Message Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Name:</td>
              <td style="padding: 8px 0;">${data.name}</td>
            </tr>
            ${data.phone ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
              <td style="padding: 8px 0;">${data.phone}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">From:</td>
              <td style="padding: 8px 0;"><a href="mailto:${data.email}">${data.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Subject:</td>
              <td style="padding: 8px 0;">${data.subject}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Submitted:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
            <strong>Message:</strong>
            <div style="background-color: white; padding: 10px; border-radius: 3px; margin-top: 8px; white-space: pre-wrap;">${data.message.replace(/\n/g, "<br>")}</div>
          </div>
        </div>
        
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/admin/form-submissions" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View in Admin Panel</a>
        </p>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Please reply directly to: <a href="mailto:${data.email}">${data.email}</a>
        </p>
      </div>
    `;

    // Send email with proper subject format: [Support] <subject> - <user email>
    const supportEmail = getSupportAdminEmail();
    if (!supportEmail) {
      console.warn("Support admin email not configured; skipping help contact email.");
    } else {
      try {
        await sendEmail({
          to: supportEmail,
          replyTo: data.email, // Set reply-to to user's email
          subject: `[Support] ${data.subject} - ${data.email}`,
          html: adminEmailHtml,
          category: "general",
        });
      } catch (emailError) {
        console.error("Error sending email for support message:", emailError);
        // Don't fail the request if email fails - message is already saved
      }
    }

    // Notify admins in-app (non-blocking)
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: {
            in: ["STAFF_ADMIN", "SUPER_ADMIN"],
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (admins.length > 0) {
        await notifyMultiple(
          admins.map((a) => a.id),
          {
            type: "ADMIN_SUPPORT_MESSAGE_NEW",
            title: "New support message",
            message: `New support message from ${data.email}: ${data.subject}`,
            link: `/admin/form-submissions`,
            data: {
              messageId: contactMessage.id,
              email: data.email,
              subject: data.subject,
            },
            sendEmail: false, // Email already sent separately
          }
        );
      }
    } catch (notifyError) {
      console.error("Error notifying admins:", notifyError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      ok: true,
      message: "Sent successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((e) => e.message).join(", ");
      return NextResponse.json(
        { ok: false, error: `Invalid input: ${errorMessages}` },
        { status: 400 }
      );
    }

    console.error("Error submitting contact form:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

