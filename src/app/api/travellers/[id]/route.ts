import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
export const dynamic = "force-dynamic";



const travellerSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  passportNumber: z.string().optional().or(z.literal("")),
  passportExpiry: z.string().optional().or(z.literal("")),
});

export async function PUT(
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

    const traveller = await prisma.traveller.findUnique({
      where: { id: params.id },
    });

    if (!traveller || traveller.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Traveller not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const data = travellerSchema.parse(body);

    const updated = await prisma.traveller.update({
      where: { id: params.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        passportNumber: data.passportNumber || null,
        passportExpiry: data.passportExpiry ? new Date(data.passportExpiry) : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating traveller:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const traveller = await prisma.traveller.findUnique({
      where: { id: params.id },
    });

    if (!traveller || traveller.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Traveller not found" },
        { status: 404 }
      );
    }

    await prisma.traveller.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Traveller deleted successfully" });
  } catch (error) {
    console.error("Error deleting traveller:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

