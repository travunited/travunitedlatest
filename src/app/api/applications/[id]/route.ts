import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";



export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: resolvedParams.id },
      include: {
        ApplicationTraveller: {
          include: {
            Traveller: true,
          },
        },
        documents: {
          include: {
            VisaDocumentRequirement: true,
            Traveller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        User_Application_userIdToUser: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        Visa: {
          include: {
            Country: true,
          },
        },
        VisaSubType: {
          select: {
            id: true,
            label: true,
            code: true,
          },
        },
        PromoCodeUsage: {
          include: {
            promoCode: true,
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

    const app = application as any;
    const mappedApplication = {
      ...app,
      travellers: app.ApplicationTraveller,
      documents: app.documents,
      user: app.User_Application_userIdToUser,
      visa: app.Visa,
      visaSubType: app.VisaSubType,
      promoCode: app.PromoCodeUsage?.[0]?.promoCode,
      ApplicationTraveller: undefined,
      ApplicationDocument: undefined,
      User_Application_userIdToUser: undefined,
      Visa: undefined,
      VisaSubType: undefined,
      PromoCodeUsage: undefined,
    };

    return NextResponse.json(mappedApplication);
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 15+ uses async params)
    const resolvedParams = await Promise.resolve(params);
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: resolvedParams.id },
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
      where: { id: resolvedParams.id },
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

