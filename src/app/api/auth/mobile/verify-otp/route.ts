import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMsg91Token, verifyOtp } from "@/lib/sms";
import { z } from "zod";

const verifyOtpSchema = z.object({
    phone: z.string().min(10).max(15).optional(),
    otp: z.string().length(6).optional(),
    accessToken: z.string().optional(),
    name: z.string().optional(),
}).refine(data => (data.phone && data.otp) || data.accessToken, {
    message: "Either phone and otp, or accessToken must be provided",
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validatedData = verifyOtpSchema.parse(body);
        let { phone, otp, accessToken, name } = validatedData;

        let success = false;
        let verifiedPhone = "";

        if (accessToken) {
            const result = await verifyMsg91Token(accessToken);
            success = result.success;
            if (success && result.phone) {
                verifiedPhone = result.phone;
            }
        } else if (phone && otp) {
            // Traditional OTP verification
            verifiedPhone = phone.replace(/\D/g, "");
            if (verifiedPhone.length === 10) {
                verifiedPhone = `91${verifiedPhone}`;
            }
            success = await verifyOtp(verifiedPhone, otp);
        }

        if (success && verifiedPhone) {
            const normalizedPhone = verifiedPhone.replace(/\D/g, "");
            if (normalizedPhone.length === 10) {
                verifiedPhone = `91${normalizedPhone}`;
            } else {
                verifiedPhone = normalizedPhone;
            }

            // Find or create user
            let user = await prisma.user.findFirst({
                where: { phone: verifiedPhone }
            });

            if (!user) {
                user = await (prisma.user as any).create({
                    data: {
                        phone: verifiedPhone,
                        name: name || null,
                        role: "CUSTOMER",
                        phoneVerified: true,
                        isActive: true,
                        email: null,
                        passwordHash: null,
                    }
                });
            }

            if (!user) {
                return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
            }

            if (!user.isActive) {
                return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
            }

            return NextResponse.json({
                message: "Verified successfully",
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                }
            });
        } else {
            return NextResponse.json(
                { error: "Verification failed. Please try again." },
                { status: 401 }
            );
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
        }
        console.error("[VerifyOTP] Unexpected error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
