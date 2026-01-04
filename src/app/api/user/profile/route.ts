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

        if (validatedData.email) {
            // Check if email is already taken
            const existingUser = await prisma.user.findUnique({
                where: { email: validatedData.email.toLowerCase() },
            });

            if (existingUser && existingUser.id !== session.user.id) {
                return NextResponse.json({ error: "Email already taken" }, { status: 400 });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                ...(validatedData.name && { name: validatedData.name }),
                ...(validatedData.email && {
                    email: validatedData.email.toLowerCase(),
                    emailVerified: false, // Reset verification when email changes
                }),
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
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
        }
        console.error("[Profile Update] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
