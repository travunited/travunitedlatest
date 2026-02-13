import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET active career positions (public endpoint)
export async function GET() {
    try {
        const positions = await prisma.career.findMany({
            where: {
                isActive: true,
            },
            orderBy: [
                { sortOrder: "asc" },
                { createdAt: "desc" }
            ],
            select: {
                id: true,
                title: true,
                location: true,
                type: true,
                department: true,
                description: true,
            },
        });

        return NextResponse.json(positions);
    } catch (error) {
        console.error("Error fetching active career positions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
