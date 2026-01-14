import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    const body = await req.json();
    const { name, description, sortOrder, isActive } = body;

    // Verify template exists and belongs to the country
    const existingTemplate = await prisma.documentTemplate.findFirst({
      where: {
        id: params.templateId,
        countryId: params.id,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Update template
    const updated = await prisma.documentTemplate.update({
      where: { id: params.templateId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

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

    // Verify template exists and belongs to the country
    const existingTemplate = await prisma.documentTemplate.findFirst({
      where: {
        id: params.templateId,
        countryId: params.id,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Delete template (file will remain in storage, but record is deleted)
    await prisma.documentTemplate.delete({
      where: { id: params.templateId },
    });

    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
