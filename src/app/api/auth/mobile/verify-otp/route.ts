import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/sms";
import { prisma } from "@/lib/prisma";

const verifyOtpSchema = z.object({
    phone: z.string().min(10).max(15),
    otp: z.string().length(6),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validatedData = verifyOtpSchema.parse(body);
        let { phone, otp } = validatedData;

        // Normalize phone
        if (phone.length === 10) {
            phone = `91${phone}`;
        }

        const success = await verifyOtp(phone, otp);

        if (success) {
            // Find the user to return user info if needed by client (though mostly handled by NextAuth)
            const user = await prisma.user.findFirst({
                where: { phone: { contains: phone.slice(-10) } },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    phone: true,
                }
            });

            return NextResponse.json({
                message: "OTP verified successfully",
                success: true,
                user: user || null
            });
        } else {
            return NextResponse.json(
                { error: "Invalid OTP. Please try again." },
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
