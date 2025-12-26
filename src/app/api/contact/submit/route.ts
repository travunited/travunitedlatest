import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getSupportAdminEmail } from "@/lib/admin-contacts";
import crypto from "crypto";
export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

export async function POST(req: Request) {
  try {
    // Accept JSON or form submissions
    const contentType = req.headers.get("content-type") || "";
    let body: any;
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      body = {
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone") || undefined,
        subject: form.get("subject"),
        message: form.get("message"),
      };
    } else {
      return NextResponse.json(
        { success: false, error: "Content-Type must be application/json or form-data" },
        { status: 400 }
      );
    }

    // Validate input
    const data = contactSchema.parse(body);

    // Persist message
    await prisma.contactMessage.create({
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

    // Notify admin (non-blocking)
    try {
      const adminEmail = getSupportAdminEmail();
      if (!adminEmail) {
        console.warn("Support admin email not configured; skipping contact notification email.");
      } else {
        const adminEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>New Contact Form Submission</h1>
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ""}
            <p><strong>Subject:</strong> ${data.subject}</p>
            <p><strong>Message:</strong></p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              ${data.message.replace(/\n/g, "<br>")}
            </div>
            <p>Please respond to the customer at: <a href="mailto:${data.email}">${data.email}</a></p>
          </div>
        `;

        await sendEmail({
          to: adminEmail,
          subject: `New Contact Form Submission: ${data.subject}`,
          html: adminEmailHtml,
          replyTo: data.email,
          category: "general",
        });
      }
    } catch (emailError) {
      console.error("Error sending contact form email notification:", emailError);
      // Do not fail the request since the message is already saved
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((e) => e.message).join(", ");
      return NextResponse.json(
        { success: false, error: `Invalid input: ${errorMessages}` },
        { status: 400 }
      );
    }

    console.error("Error submitting contact form:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

