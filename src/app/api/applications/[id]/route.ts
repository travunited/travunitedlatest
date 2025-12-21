import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



export async function GET(
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

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        travellers: {
          include: {
            traveller: true,
          },
        },
        documents: {
          include: {
            traveller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        visa: {
          include: {
            country: true,
          },
        },
        visaSubType: {
          select: {
            id: true,
            label: true,
            code: true,
          },
        },
        promoCode: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    if (!application || application.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const application = await prisma.application.findUnique({
      where: { id: params.id },
    });

    if (!application || application.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Only allow editing if status is DRAFT or PAYMENT_PENDING
    const editableStatuses = ["DRAFT", "PAYMENT_PENDING"];
    if (!editableStatuses.includes(application.status)) {
      return NextResponse.json(
        { error: "This application can no longer be edited. Please contact support if you need to make changes." },
        { status: 400 }
      );
    }

    const body = await req.json();
    
    // Only allow updating certain fields
    const allowedUpdates: any = {};
    if (body.totalAmount !== undefined) allowedUpdates.totalAmount = body.totalAmount;
    if (body.currency !== undefined) allowedUpdates.currency = body.currency;
    if (body.notes !== undefined) allowedUpdates.notes = body.notes;

    const updated = await prisma.application.update({
      where: { id: params.id },
      data: allowedUpdates,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

