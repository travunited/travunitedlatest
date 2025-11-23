import { NextResponse } from "next/server";
import { z } from "zod";
import { sendUserEmail } from "@/lib/email";
export const dynamic = "force-dynamic";


const contactSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = contactSchema.parse(body);

    // Send email notification to admin inbox
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>New Contact Form Submission</h1>
        <p><strong>From:</strong> ${data.email}</p>
        <p><strong>Subject:</strong> ${data.subject}</p>
        <p><strong>Message:</strong></p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          ${data.message.replace(/\n/g, "<br>")}
        </div>
        <p>Please respond to the customer at: <a href="mailto:${data.email}">${data.email}</a></p>
      </div>
    `;

    await sendUserEmail({
      to: "dummy@example.com", // Will be overridden by forceAdmin
      forceAdmin: true, // Route to info@travunited.com
      subject: `Contact Form: ${data.subject}`,
      html: adminEmailHtml,
    });

    // Send confirmation email to customer
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Thank You for Contacting Us</h1>
        <p>We've received your message and will get back to you soon.</p>
        <p><strong>Your message:</strong></p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          ${data.message.replace(/\n/g, "<br>")}
        </div>
        <p>Best regards,<br>The Travunited Team</p>
      </div>
    `;

    await sendUserEmail({
      to: data.email,
      role: "CUSTOMER", // Customer emails go to their own inbox
      subject: "We've received your message",
      html: customerEmailHtml,
    });

    return NextResponse.json(
      { message: "Message sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error submitting contact form:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

