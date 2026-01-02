import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/sms";
import { prisma } from "@/lib/prisma";

const verifyOtpSchema = z.object({
    phone: z.string().min(10).max(15).optional(),
    otp: z.string().length(6).optional(),
    accessToken: z.string().optional(),
}).refine(data => (data.phone && data.otp) || data.accessToken, {
    message: "Either phone and otp, or accessToken must be provided",
    path: ["otp"],
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validatedData = verifyOtpSchema.parse(body);
        let { phone, otp, accessToken } = validatedData;

        let success = false;
        let verifiedPhone = phone || "";

        if (accessToken) {
            const { verifyMsg91Token } = await import("@/lib/sms");
            const result = await verifyMsg91Token(accessToken);
            success = result.success;
            if (success && result.phone) {
                verifiedPhone = result.phone;
            }
        } else if (phone && otp) {
            // Normalize phone
            verifiedPhone = phone.replace(/\D/g, "");
            if (verifiedPhone.length === 10) {
                verifiedPhone = `91${verifiedPhone}`;
            }
            success = await verifyOtp(verifiedPhone, otp);
        }

        if (success) {
            // Normalize verifiedPhone to match how it's stored (numeric)
            const normalizedPhone = verifiedPhone.replace(/\D/g, "");

            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { phone: normalizedPhone },
                        { phone: normalizedPhone.startsWith("91") ? normalizedPhone.substring(2) : normalizedPhone }
                    ]
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    phone: true,
                }
            });

            return NextResponse.json({
                message: "Verified successfully",
                success: true,
                user: user || null
            });
        } else {
            return NextResponse.json(
                { error: "Verification failed. Please try again." },
                { status: 400 }
            );
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid input", details: error.errors },
                { status: 400 }
            );
        }
        console.error("[VerifyOTP] Unexpected error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
