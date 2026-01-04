import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMsg91Token } from "@/lib/sms";
import { encode } from "next-auth/jwt";

export const dynamic = "force-dynamic";

/**
 * MANDATORY SECURE FLOW: Verify MSG91 Access Token and Login/Signup User
 * This route is dedicated to MSG91 Mobile OTP verification.
 */
export async function POST(req: Request) {
    try {
        const { accessToken, name } = await req.json();

        if (!accessToken) {
            return NextResponse.json(
                { error: "Missing accessToken" },
                { status: 400 }
            );
        }

        // 1. Verify token with MSG91 (SERVER-SIDE ONLY)
        const verification = await verifyMsg91Token(accessToken);

        if (!verification.success || !verification.phone) {
            return NextResponse.json(
                { error: verification.message || "OTP verification failed" },
                { status: 401 }
            );
        }

        let phone = verification.phone.replace(/\D/g, "");

        // 2. Find or create user
        let user = await prisma.user.findFirst({
            where: { phone },
        });

        if (!user) {
            // Auto-create for unified login/signup
            user = await (prisma.user as any).create({
                data: {
                    phone,
                    name: name || null,
                    role: "CUSTOMER",
                    phoneVerified: true,
                    isActive: true,
                    email: null,
                    passwordHash: null,
                },
            });
        }

        if (!user) {
            return NextResponse.json(
                { error: "Failed to create or find user" },
                { status: 500 }
            );
        }

        if (!user.isActive) {
            return NextResponse.json(
                { error: "Account is inactive" },
                { status: 403 }
            );
        }

        // 3. Create a session token manually (Bypassing NextAuth authorize)
        const secret = process.env.NEXTAUTH_SECRET || "455112A2GSu4oHCET6949181cP1"; // Use fallback if env missing for now

        const token = await encode({
            token: {
                id: user.id,
                name: user.name,
                email: user.email || `${phone}@travunited.com`,
                role: user.role,
                sub: user.id
            },
            secret,
            maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        // 4. Return success and set the cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role,
            },
        });

        const cookieName = process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token";

        response.cookies.set(cookieName, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 30 * 24 * 60 * 60,
        });

        return response;

    } catch (error) {
        console.error("Mobile OTP verification error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
