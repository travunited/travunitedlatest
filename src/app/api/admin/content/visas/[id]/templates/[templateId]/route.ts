import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE - Delete a template
export async function DELETE(
    req: Request,
    { params }: { params: { id: string; templateId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin =
            session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";

        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Verify template belongs to this visa
        const template = await prisma.documentTemplate.findUnique({
            where: {
                id: params.templateId,
            },
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        if (template.visaId !== params.id) {
            return NextResponse.json(
                { error: "Template does not belong to this visa" },
                { status: 400 }
            );
        }

        // Delete record from database
        // Note: In a real production environment, you might also want to delete the file from MinIO.
        // For now, we'll keep the file or rely on a separate cleanup process.
        await prisma.documentTemplate.delete({
            where: {
                id: params.templateId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting template:", error);
        return NextResponse.json(
            { error: "Internal server error", message: error.message },
            { status: 500 }
        );
    }
}

// PUT - Update a template
export async function PUT(
    req: Request,
    { params }: { params: { id: string; templateId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin =
            session?.user?.role === "STAFF_ADMIN" || session?.user?.role === "SUPER_ADMIN";

        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { name, description, sortOrder, isActive } = await req.json();

        const template = await prisma.documentTemplate.update({
            where: {
                id: params.templateId,
            },
            data: {
                name,
                description,
                sortOrder,
                isActive,
            },
        });

        return NextResponse.json(template);
    } catch (error: any) {
        console.error("Error updating template:", error);
        return NextResponse.json(
            { error: "Internal server error", message: error.message },
            { status: 500 }
        );
    }
}
