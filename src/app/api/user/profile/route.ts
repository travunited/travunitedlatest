import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const profileSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
});

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = profileSchema.parse(body);

        // Get current user to check if email is changing
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (validatedData.email) {
            const normalizedEmail = validatedData.email.toLowerCase();
            
            // Check if email is already taken
            const existingUser = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (existingUser && existingUser.id !== session.user.id) {
                return NextResponse.json({ error: "Email already taken" }, { status: 400 });
            }

            // Check if email is actually changing (not just updating from placeholder)
            const isEmailChanging = currentUser.email !== normalizedEmail;
            const hadPlaceholderEmail = currentUser.email?.includes("@user.travunited") || false;

            // Update user with new email and reset verification
            const updatedUser = await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    ...(validatedData.name && { name: validatedData.name }),
                    email: normalizedEmail,
                    emailVerified: false, // Reset verification when email changes
                    registrationOtp: null,
                    registrationOtpExpires: null,
                },
            });

            // Send OTP email if email is changing or if user had placeholder email
            if (isEmailChanging || hadPlaceholderEmail) {
                try {
                    const crypto = await import("crypto");
                    const otp = crypto.randomInt(100000, 999999).toString();
                    const otpExpires = new Date();
                    otpExpires.setMinutes(otpExpires.getMinutes() + 10); // Valid for 10 minutes

                    // Update user with OTP
                    await prisma.user.update({
                        where: { id: session.user.id },
                        data: {
                            registrationOtp: otp,
                            registrationOtpExpires: otpExpires,
                        },
                    });

                    // Send OTP email
                    const { sendRegistrationOTPEmail } = await import("@/lib/email");
                    await sendRegistrationOTPEmail(
                        normalizedEmail,
                        otp,
                        updatedUser.name || undefined,
                        updatedUser.role
                    );
                } catch (error) {
                    console.error("[Profile Update] Failed to send OTP email:", error);
                    // Don't fail the update if email sending fails
                }
            }

            return NextResponse.json({
                message: "Profile updated successfully. Please check your email for verification OTP.",
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                },
                otpSent: isEmailChanging || hadPlaceholderEmail,
            });
        } else {
            // Only updating name
            const updatedUser = await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    ...(validatedData.name && { name: validatedData.name }),
                },
            });

            return NextResponse.json({
                message: "Profile updated successfully",
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                },
            });
        }
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
        }
        console.error("[Profile Update] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
