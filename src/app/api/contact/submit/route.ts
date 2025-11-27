import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getSupportAdminEmail } from "@/lib/admin-contacts";
export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = contactSchema.parse(body);

    // Save to database
    await prisma.contactMessage.create({
      data: {
        email: data.email,
        subject: `[Contact Form] ${data.subject}`,
        message: `Name: ${data.name}\n${data.phone ? `Phone: ${data.phone}\n` : ''}Email: ${data.email}\n\nMessage:\n${data.message}`,
      },
    });

    // Send email notification to admin inbox (non-blocking - don't fail if email fails)
    try {
      const adminEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>New Contact Form Submission</h1>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Message:</strong></p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            ${data.message.replace(/\n/g, "<br>")}
          </div>
          <p>Please respond to the customer at: <a href="mailto:${data.email}">${data.email}</a></p>
        </div>
      `;

      const adminEmail = getSupportAdminEmail();
      if (!adminEmail) {
        console.warn("Support admin email not configured; skipping contact notification email.");
      } else {
        await sendEmail({
          to: adminEmail,
          subject: `New Contact Form Submission: ${data.subject}`,
          html: adminEmailHtml,
          replyTo: data.email,
          category: "general",
        });
      }
    } catch (emailError) {
      // Log email error but don't fail the request since data is already saved
      console.error("Error sending contact form email notification:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid input. Please check all required fields." },
        { status: 400 }
      );
    }

    console.error("Error submitting contact form:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

