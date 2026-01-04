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

        // Allow any phone number that looks reasonable (7 to 15 digits)
        phone = phone.replace(/\D/g, "");

        if (phone.length < 7 || phone.length > 15) {
            return NextResponse.json(
                { error: "Please enter a valid mobile number" },
                { status: 400 }
            );
        }

        // Unified Flow: We allow OTP send for any valid number.
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
