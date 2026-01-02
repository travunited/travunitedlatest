import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOtp } from "@/lib/sms";
import { prisma } from "@/lib/prisma";

const sendOtpSchema = z.object({
    phone: z.string().min(10).max(15),
    type: z.enum(["login", "signup"]).optional().default("login"),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validatedData = sendOtpSchema.parse(body);
        let { phone, type } = validatedData;

        // Strict 10-digit normalization for Indian numbers (+91 by default)
        // Remove any non-digits first
        phone = phone.replace(/\D/g, "");

        if (phone.length === 10) {
            phone = `91${phone}`;
        } else if (phone.length === 12 && phone.startsWith("91")) {
            // Already has 91, keep it
        } else {
            return NextResponse.json(
                { error: "Please enter a valid 10-digit mobile number" },
                { status: 400 }
            );
        }

        // Unified Flow: We allow OTP send for any valid 10-digit number.
        // If it's a new number, it will be auto-registered during verification.

        const success = await sendOtp(phone);

        if (success) {
            return NextResponse.json({ message: "OTP sent successfully" });
        } else {
            return NextResponse.json(
                { error: "Failed to send OTP. Please try again later." },
                { status: 500 }
            );
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid mobile number", details: error.errors },
                { status: 400 }
            );
        }
        console.error("[SendOTP] Unexpected error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
