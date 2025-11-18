import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { AuditAction, AuditEntityType, ReviewType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
export const dynamic = "force-dynamic";



const reviewSchema = z.object({
  type: z.enum(["visa", "tour"]),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10),
  title: z.string().min(3).max(120).optional(),
  applicationId: z.string().optional(),
  bookingId: z.string().optional(),
});

const FINAL_VISA_STATUSES = ["APPROVED", "REJECTED"];
const FINAL_TOUR_STATUSES = ["COMPLETED"];

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const reviews = await prisma.review.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        type: true,
        title: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    const formatted = reviews.map((review) => ({
      ...review,
      title:
        review.title ||
        (review.type === "VISA" ? "Visa Service Review" : "Tour Experience Review"),
      type: review.type.toLowerCase(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = reviewSchema.parse(body);

    if (data.type === "visa" && !data.applicationId) {
      return NextResponse.json(
        { error: "applicationId is required for visa reviews" },
        { status: 400 }
      );
    }

    if (data.type === "tour" && !data.bookingId) {
      return NextResponse.json(
        { error: "bookingId is required for tour reviews" },
        { status: 400 }
      );
    }

    if (data.type === "visa") {
      const application = await prisma.application.findFirst({
        where: {
          id: data.applicationId,
          userId: session.user.id,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!application) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }

      if (!FINAL_VISA_STATUSES.includes(application.status)) {
        return NextResponse.json(
          { error: "You can review only after the visa is finalized" },
          { status: 400 }
        );
      }

      const existing = await prisma.review.findFirst({
        where: { applicationId: application.id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "You have already reviewed this application" },
          { status: 400 }
        );
      }
    }

    if (data.type === "tour") {
      const booking = await prisma.booking.findFirst({
        where: {
          id: data.bookingId,
          userId: session.user.id,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }

      if (!FINAL_TOUR_STATUSES.includes(booking.status)) {
        return NextResponse.json(
          { error: "You can review only after the tour is completed" },
          { status: 400 }
        );
      }

      const existing = await prisma.review.findFirst({
        where: { bookingId: booking.id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "You have already reviewed this booking" },
          { status: 400 }
        );
      }
    }

    const review = await prisma.review.create({
      data: {
        type: data.type === "visa" ? ReviewType.VISA : ReviewType.TOUR,
        rating: data.rating,
        title: data.title || null,
        comment: data.comment,
        userId: session.user.id,
        applicationId: data.type === "visa" ? data.applicationId! : null,
        bookingId: data.type === "tour" ? data.bookingId! : null,
      },
    });

    await logAuditEvent({
      adminId: null,
      entityType: AuditEntityType.REVIEW,
      entityId: review.id,
      action: AuditAction.CREATE,
      description: `New ${review.type.toLowerCase()} review (${review.rating}/5) submitted`,
      metadata: {
        userId: session.user.id,
        applicationId: review.applicationId,
        bookingId: review.bookingId,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

