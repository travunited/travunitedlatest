import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all career positions (admin view - includes inactive)
export async function GET(req: Request) {
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

        const positions = await prisma.career.findMany({
            orderBy: [
                { sortOrder: "asc" },
                { createdAt: "desc" }
            ],
        });

        return NextResponse.json(positions);
    } catch (error) {
        console.error("Error fetching career positions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST - Create new career position
export async function POST(req: Request) {
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

        const body = await req.json();
        const { title, location, type, department, description, isActive, sortOrder } = body;

        // Validation
        if (!title || !location || !type || !department) {
            return NextResponse.json(
                { error: "Missing required fields: title, location, type, department" },
                { status: 400 }
            );
        }

        const position = await prisma.career.create({
            data: {
                title,
                location,
                type,
                department,
                description: description || null,
                isActive: isActive !== undefined ? isActive : true,
                sortOrder: sortOrder || 0,
            },
        });

        return NextResponse.json(position, { status: 201 });
    } catch (error) {
        console.error("Error creating career position:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
