import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH - Update career position
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const isSuperAdmin = session.user.role === "SUPER_ADMIN";
        if (!isSuperAdmin) {
            return NextResponse.json(
                { error: "Forbidden - Super Admin access required" },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await req.json();
        const { title, location, type, department, description, isActive, sortOrder } = body;

        // Check if position exists
        const existing = await prisma.career.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Career position not found" },
                { status: 404 }
            );
        }

        // Update position
        const position = await prisma.career.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(location !== undefined && { location }),
                ...(type !== undefined && { type }),
                ...(department !== undefined && { department }),
                ...(description !== undefined && { description }),
                ...(isActive !== undefined && { isActive }),
                ...(sortOrder !== undefined && { sortOrder }),
            },
        });

        return NextResponse.json(position);
    } catch (error) {
        console.error("Error updating career position:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE - Delete career position
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const isSuperAdmin = session.user.role === "SUPER_ADMIN";
        if (!isSuperAdmin) {
            return NextResponse.json(
                { error: "Forbidden - Super Admin access required" },
                { status: 403 }
            );
        }

        const { id } = params;

        // Check if position exists
        const existing = await prisma.career.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Career position not found" },
                { status: 404 }
            );
        }

        await prisma.career.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting career position:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
