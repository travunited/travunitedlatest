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

        // Normalize phone (ensure it has country code, default to 91 for India if 10 digits)
        if (phone.length === 10) {
            phone = `91${phone}`;
        }

        // If type is login, check if user exists
        if (type === "login") {
            const user = await prisma.user.findFirst({
                where: { phone: { contains: phone.slice(-10) } }, // Relaxed check for 10-digit match
            });

            if (!user) {
                return NextResponse.json(
                    { error: "Account not found with this mobile number. Please sign up." },
                    { status: 404 }
                );
            }
        }

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
