import { NextResponse } from "next/server";
import { z } from "zod";

const contactSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = contactSchema.parse(body);

    // In production, you would:
    // 1. Save to database
    // 2. Send email notification to support team
    // 3. Send confirmation email to customer

    console.log("Support contact received:", data);

    // For now, just return success
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

