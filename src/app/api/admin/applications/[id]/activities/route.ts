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

    const isAdmin = session.user.role === "STAFF_ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // For now, generate activity log from application and document changes
    // In production, you'd have a separate ActivityLog model
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        documents: {
          orderBy: {
            updatedAt: "desc",
          },
        },
        processedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Generate activity log from application history
    const activities: any[] = [
      {
        id: "created",
        type: "application_created",
        description: `Application created by ${application.user.email}`,
        createdBy: null,
        createdAt: application.createdAt,
      },
    ];

    // Add status change if updated
    if (application.updatedAt > application.createdAt) {
      activities.push({
        id: "updated",
        type: "status_changed",
        description: `Status changed to ${application.status}`,
        createdBy: application.processedBy?.name || application.processedBy?.email || null,
        createdAt: application.updatedAt,
      });
    }

    // Add document review activities
    application.documents.forEach((doc) => {
      if (doc.updatedAt > doc.createdAt) {
        const statusText = doc.status === "APPROVED" ? "Verified" : doc.status === "REJECTED" ? "Rejected" : "Pending";
        activities.push({
          id: doc.id,
          type: "document_reviewed",
          description: `Document "${doc.documentType}" marked as ${statusText}${doc.rejectionReason ? `: ${doc.rejectionReason}` : ""}`,
          createdBy: application.processedBy?.name || application.processedBy?.email || null,
          createdAt: doc.updatedAt,
        });
      }
    });

    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

